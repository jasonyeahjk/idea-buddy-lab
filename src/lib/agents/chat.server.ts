import { createClient } from "@supabase/supabase-js";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  type UIMessage,
} from "ai";
import type { Database } from "@/integrations/supabase/types";
import {
  AGENT_LABELS,
  AGENT_READY,
  applyPatch,
  normalizeBlackboard,
  type AgentId,
  type Blackboard,
} from "./blackboard";
import { createGateway } from "./gateway.server";
import { runInspirationAgent } from "./inspiration.server";
import { routeIntent } from "./supervisor.server";

const json = (status: number, error: string) =>
  new Response(JSON.stringify({ error }), { status, headers: { "content-type": "application/json" } });

function userClient(token: string) {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

function friendlyError(err: unknown): string {
  const status = (err as { statusCode?: number })?.statusCode;
  if (status === 429) return "请求太频繁了，请稍等片刻再试。";
  if (status === 402) return "AI 额度已用完，请联系管理员在工作区设置中充值后再试。";
  if (status === 403) return "当前工作区无法使用该 AI 服务，请联系管理员。";
  return "智能体暂时没有回应，请稍后再试。";
}

export async function handleChat(request: Request): Promise<Response> {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return json(401, "请先登录");
  const supabase = userClient(token);
  const { data: claims } = await supabase.auth.getClaims(token);
  const userId = claims?.claims?.sub;
  if (!userId) return json(401, "登录已过期");

  const body = (await request.json()) as { id?: string; messages?: UIMessage[] };
  const sessionId = body.id;
  const messages = body.messages ?? [];
  if (!sessionId || messages.length === 0) return json(400, "缺少会话或消息");

  const { data: session, error: sErr } = await supabase
    .from("sessions")
    .select("id,title,blackboard")
    .eq("id", sessionId)
    .maybeSingle();
  if (sErr || !session) return json(404, "会话不存在");

  const last = messages[messages.length - 1]!;
  const userText = last.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
  const bbRef: { current: Blackboard } = { current: normalizeBlackboard(session.blackboard) };
  let agentUsed: AgentId = "supervisor";

  const stream = createUIMessageStream({
    originalMessages: messages,
    generateId,
    onError: friendlyError,
    execute: async ({ writer }) => {
      const { model } = createGateway(request);

      // 1. Supervisor: intent routing, writes routing + extracted context into the blackboard
      const decision = await routeIntent(model, userText, bbRef.current, request.signal);
      bbRef.current = applyPatch(bbRef.current, {
        category: decision.category,
        topic: decision.topic,
        stage: decision.stage,
      });
      bbRef.current.routeLog = [...bbRef.current.routeLog, {
        at: decision.at, intent: decision.intent, agent: decision.agent,
        confidence: decision.confidence, reason: decision.reason,
      }].slice(-20);
      agentUsed = decision.agent;

      writer.write({ type: "start", messageMetadata: { agent: decision.agent } });
      writer.write({
        type: "data-route",
        data: { intent: decision.intent, agent: decision.agent, confidence: decision.confidence, reason: decision.reason },
      });

      // 2. Dispatch to the target agent
      if (decision.agent === "inspiration" && AGENT_READY.inspiration) {
        const result = runInspirationAgent(model, await convertToModelMessages(messages), bbRef, request.signal);
        writer.merge(result.toUIMessageStream({ sendStart: false, sendReasoning: true, onError: friendlyError }));
        await result.steps;
      } else {
        const id = generateId();
        writer.write({ type: "text-start", id });
        writer.write({
          type: "text-delta",
          id,
          delta: `调度中枢判断这条消息属于 **${AGENT_LABELS[decision.agent]}** 的职责范围，该智能体将在下一阶段接入。\n\n目前你可以继续和灵感探究智能体聊聊选题、素材和安全注意事项。`,
        });
        writer.write({ type: "text-end", id });
        writer.write({ type: "finish" });
      }
      writer.write({ type: "data-blackboard", data: bbRef.current });
    },
    onFinish: async ({ responseMessage }) => {
      const rows = [last, responseMessage].map((m) => ({
        session_id: sessionId,
        user_id: userId,
        ui_id: m.id,
        role: m.role,
        agent: m.role === "assistant" ? agentUsed : null,
        parts: m.parts as never,
      }));
      const { error: mErr } = await supabase.from("messages").upsert(rows, { onConflict: "session_id,ui_id" });
      if (mErr) console.error("save messages failed", mErr);
      const title = session.title === "新的创作" && userText ? userText.slice(0, 24) : session.title;
      const { error: bErr } = await supabase
        .from("sessions")
        .update({ blackboard: bbRef.current as never, title, updated_at: new Date().toISOString() })
        .eq("id", sessionId);
      if (bErr) console.error("save blackboard failed", bErr);
    },
  });

  return createUIMessageStreamResponse({ stream });
}
