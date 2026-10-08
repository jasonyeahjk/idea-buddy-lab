import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { LogOut, Plus, Route as RouteIcon, ShieldAlert, Lightbulb, Package, HelpCircle, BookOpen, ListChecks, Star, MessageCircleQuestion, Recycle, Ruler, Languages, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  AGENT_LABELS,
  AGENT_READY,
  normalizeBlackboard,
  type AgentId,
  type Blackboard,
} from "@/lib/agents/blackboard";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";
import { DiagramCard } from "@/components/diagram-card";
import { VoiceCompanion } from "@/components/voice-companion";
import { VocabCards, speak } from "@/components/vocab-cards";
import { ENGLISH_TOPICS, nextRecommended } from "@/lib/agents/english-taxonomy";
import type { VocabCard } from "@/lib/agents/blackboard";

export const Route = createFileRoute("/_authenticated/chat/$sessionId")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "创作会话 · 创享智伴" },
      { name: "description", content: "与多智能体协同的创作伴学会话。" },
      { property: "og:title", content: "创作会话 · 创享智伴" },
      { property: "og:description", content: "与多智能体协同的创作伴学会话。" },
    ],
  }),
  component: ChatPage,
});

type RouteData = { intent: string; agent: AgentId; confidence: number; reason: string };

function ChatPage() {
  const { sessionId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const sessions = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sessions").select("id,title,updated_at").order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const detail = useQuery({
    queryKey: ["session", sessionId],
    queryFn: async () => {
      const [{ data: s, error: e1 }, { data: m, error: e2 }] = await Promise.all([
        supabase.from("sessions").select("blackboard").eq("id", sessionId).single(),
        supabase.from("messages").select("ui_id,role,parts,agent").eq("session_id", sessionId).order("created_at"),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const messages: UIMessage[] = (m ?? []).map((r) => ({
        id: r.ui_id,
        role: r.role as UIMessage["role"],
        parts: r.parts as UIMessage["parts"],
        metadata: { agent: r.agent },
      }));
      return { blackboard: normalizeBlackboard(s.blackboard), messages };
    },
  });

  async function newSession() {
    const { data, error } = await supabase.from("sessions").insert({}).select("id").single();
    if (error) { toast.error("创建会话失败"); return; }
    await qc.invalidateQueries({ queryKey: ["sessions"] });
    navigate({ to: "/chat/$sessionId", params: { sessionId: data.id } });
  }

  return (
    <div className="flex h-screen bg-background">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar md:flex">
        <Link to="/" className="flex items-center gap-2 px-4 py-4">
          <img src={logo} alt="" className="h-8 w-8" />
          <span className="font-display text-lg font-semibold">创享智伴</span>
        </Link>
        <div className="px-3">
          <Button onClick={newSession} className="w-full" size="sm"><Plus className="mr-1 h-4 w-4" />新的创作</Button>
        </div>
        <nav className="mt-3 flex-1 space-y-0.5 overflow-y-auto px-2">
          {sessions.data?.map((s) => (
            <Link
              key={s.id}
              to="/chat/$sessionId"
              params={{ sessionId: s.id }}
              className={cn(
                "block truncate rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent",
                s.id === sessionId && "bg-sidebar-accent font-medium",
              )}
            >
              {s.title}
            </Link>
          ))}
        </nav>
        <button
          onClick={async () => { await supabase.auth.signOut(); qc.clear(); navigate({ to: "/auth" }); }}
          className="flex items-center gap-2 border-t px-4 py-3 text-sm text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />退出登录
        </button>
      </aside>

      {detail.isLoading ? (
        <div className="flex flex-1 items-center justify-center"><Shimmer>正在打开会话…</Shimmer></div>
      ) : detail.error ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">会话加载失败</div>
      ) : (
        <ChatWindow key={sessionId} sessionId={sessionId} initialMessages={detail.data!.messages} initialBlackboard={detail.data!.blackboard} />
      )}
    </div>
  );
}

function ChatWindow({ sessionId, initialMessages, initialBlackboard }: { sessionId: string; initialMessages: UIMessage[]; initialBlackboard: Blackboard }) {
  const qc = useQueryClient();
  const [bb, setBb] = useState(initialBlackboard);
  const [input, setInput] = useState("");

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        headers: async (): Promise<Record<string, string>> => {
          const { data } = await supabase.auth.getSession();
          return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
        },
      }),
    [],
  );

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    id: sessionId,
    messages: initialMessages,
    transport,
    onData: (part) => {
      if (part.type === "data-blackboard") setBb(normalizeBlackboard(part.data));
    },
    onFinish: () => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      qc.invalidateQueries({ queryKey: ["session", sessionId] });
    },
    onError: (e) => toast.error(e.message || "发送失败"),
  });

  const busy = status === "submitted" || status === "streaming";
  useEffect(() => {
    if (!busy) document.querySelector<HTMLTextAreaElement>("textarea")?.focus();
  }, [busy]);

  const starters = ["中秋节快到了，我想做一个手工作品，有什么灵感？", "我想第一次尝试做面包，从哪里开始？", "怎么用剪纸表现春天？"];

  return (
    <>
      <main className="flex min-w-0 flex-1 flex-col">
        <Conversation className="flex-1">
          <ConversationContent className="mx-auto w-full max-w-3xl">
            {messages.length === 0 ? (
              <ConversationEmptyState>
                <img src={logo} alt="" className="h-16 w-16" />
                <h2 className="mt-2 text-xl font-semibold">今天想创作点什么？</h2>
                <p className="text-sm text-muted-foreground">调度中枢会判断你的需求，并交给合适的智能体。</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {starters.map((s) => (
                    <button key={s} onClick={() => sendMessage({ text: s })} className="rounded-full border bg-card px-3 py-1.5 text-sm hover:bg-accent">
                      {s}
                    </button>
                  ))}
                </div>
              </ConversationEmptyState>
            ) : (
              messages.map((m) => <ChatMessage key={m.id} message={m} />)
            )}
            {status === "submitted" && <Shimmer className="text-sm">调度中枢正在识别意图…</Shimmer>}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
        <div className="mx-auto w-full max-w-3xl px-4 pb-4">
          <VoiceCompanion
            sessionId={sessionId}
            onTurn={(e) => {
              const turn = e["turn"] as { user: UIMessage; assistant: UIMessage } | undefined;
              if (turn) setMessages((m) => [...m, turn.user, turn.assistant]);
              if (e["blackboard"]) setBb(normalizeBlackboard(e["blackboard"]));
              qc.invalidateQueries({ queryKey: ["sessions"] });
            }}
          />
          <PromptInput
            onSubmit={({ text }) => {
              if (!text.trim() || busy) return;
              sendMessage({ text });
              setInput("");
            }}
          >
            <PromptInputTextarea autoFocus value={input} onChange={(e) => setInput(e.target.value)} placeholder="说说你的创作想法…" />
            <PromptInputFooter className="justify-end">
              <PromptInputSubmit status={status} onStop={stop} disabled={!busy && !input.trim()} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </main>
      <BlackboardPanel bb={bb} />
    </>
  );
}

function ChatMessage({ message }: { message: UIMessage }) {
  const route = message.parts.find((p) => p.type === "data-route") as { data: RouteData } | undefined;
  const agent = (route?.data.agent ?? (message.metadata as { agent?: AgentId } | undefined)?.agent) as AgentId | undefined;
  return (
    <Message from={message.role}>
      <MessageContent
        className={cn(
          message.role === "user" && "group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground",
        )}
      >
        {message.role === "assistant" && agent && (
          <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">{AGENT_LABELS[agent]}</span>
            {route && (
              <span className="text-muted-foreground">
                <RouteIcon className="mr-1 inline h-3 w-3" />
                {route.data.reason}（置信度 {Math.round(route.data.confidence * 100)}%）
              </span>
            )}
          </div>
        )}
        {message.parts.map((p, i) => {
          if (p.type === "text") return message.role === "user" ? <p key={i} className="whitespace-pre-wrap">{p.text}</p> : <MessageResponse key={i}>{p.text}</MessageResponse>;
          if (p.type === "reasoning" && p.text)
            return <p key={i} className="border-l-2 pl-2 text-xs text-muted-foreground">{p.text}</p>;
          if (p.type === "tool-draw_diagram") {
            const tp = p as { input?: unknown };
            return tp.input && (p as { state?: string }).state !== "input-streaming" ? <DiagramCard key={i} input={tp.input} /> : <Shimmer key={i} className="text-sm">正在画图纸…</Shimmer>;
          }
          if (p.type === "tool-add_vocab_cards") {
            const tp = p as { input?: { cards?: VocabCard[] }; state?: string };
            return tp.state === "input-streaming" || !tp.input?.cards ? <Shimmer key={i} className="text-sm">正在制作词汇卡…</Shimmer> : <VocabCards key={i} cards={tp.input.cards} />;
          }
          if (p.type === "tool-record_evidence")
            return (
              <Tool key={i} defaultOpen={false}>
                <ToolHeader type={p.type} state={p.state} title="记录英语学习证据" />
                <ToolContent>
                  <ToolInput input={p.input} />
                  <ToolOutput output={p.output} errorText={p.errorText} />
                </ToolContent>
              </Tool>
            );
          if (p.type === "data-voice" && message.role === "user") return <span key={i} className="text-xs opacity-80">🎙 语音</span>;
          if (p.type === "tool-update_blackboard")
            return (
              <Tool key={i} defaultOpen={false}>
                <ToolHeader type={p.type} state={p.state} title="写入共享黑板" />
                <ToolContent>
                  <ToolInput input={p.input} />
                  <ToolOutput output={p.output} errorText={p.errorText} />
                </ToolContent>
              </Tool>
            );
          return null;
        })}
      </MessageContent>
    </Message>
  );
}

function BlackboardPanel({ bb }: { bb: Blackboard }) {
  const lists: { title: string; icon: typeof Lightbulb; items: string[] }[] = [
    { title: "灵感方向", icon: Lightbulb, items: bb.ideas },
    { title: "材料素材", icon: Package, items: bb.materials },
    { title: "创作步骤", icon: ListChecks, items: bb.steps },
    { title: "安全提示", icon: ShieldAlert, items: bb.safetyTips },
    { title: "引导问题", icon: HelpCircle, items: bb.guidingQuestions },
    { title: "文化 / 营养知识", icon: BookOpen, items: bb.knowledge },
    { title: "循证评价", icon: Star, items: bb.evaluation },
    { title: "反思问题", icon: MessageCircleQuestion, items: bb.reflections },
    { title: "成本与资源循环", icon: Recycle, items: bb.resourceTips },
    { title: "图纸", icon: Ruler, items: bb.diagrams },
  ];
  return (
    <aside className="hidden w-80 shrink-0 overflow-y-auto border-l bg-card p-4 lg:block">
      <h2 className="text-base font-semibold">共享状态黑板</h2>
      <p className="text-xs text-muted-foreground">所有智能体读写的同一份创作上下文</p>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
        {[["品类", bb.category], ["主题", bb.topic], ["阶段", bb.stage], ["目标", bb.goal]].map(([k, v]) => (
          <div key={k} className="rounded-md bg-muted px-2 py-1.5">
            <dt className="text-xs text-muted-foreground">{k}</dt>
            <dd className="truncate font-medium">{v ?? "—"}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4">
        <h3 className="mb-2 text-sm font-semibold">智能体</h3>
        <ul className="space-y-1 text-sm">
          {(Object.keys(AGENT_LABELS) as AgentId[]).map((a) => (
            <li key={a} className="flex items-center justify-between">
              <span>{AGENT_LABELS[a]}</span>
              <span className={cn("text-xs", AGENT_READY[a] ? "text-secondary-foreground" : "text-muted-foreground")}>
                {AGENT_READY[a] ? "已接入" : "待接入"}
              </span>
            </li>
          ))}
        </ul>
      </div>
      {lists.map(({ title, icon: Icon, items }) => (
        <div key={title} className="mt-4">
          <h3 className="mb-1 flex items-center gap-1 text-sm font-semibold"><Icon className="h-4 w-4 text-primary" />{title}</h3>
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground">暂无</p>
          ) : (
            <ul className="list-disc space-y-0.5 pl-5 text-sm">{items.map((x) => <li key={x}>{x}</li>)}</ul>
          )}
        </div>
      ))}
      <EnglishPanel bb={bb} />
      <div className="mt-4">
        <h3 className="mb-1 text-sm font-semibold">路由日志</h3>
        <ul className="space-y-1 text-xs">
          {bb.routeLog.slice().reverse().map((r) => (
            <li key={r.at} className="rounded bg-muted px-2 py-1">
              <span className="font-medium">{r.intent}</span> → {AGENT_LABELS[r.agent]}
              <div className="text-muted-foreground">{r.reason}</div>
            </li>
          ))}
          {bb.routeLog.length === 0 && <li className="text-muted-foreground">暂无</li>}
        </ul>
      </div>
    </aside>
  );
}

function EnglishPanel({ bb }: { bb: Blackboard }) {
  const progress = bb.englishProgress ?? {};
  const vocab = bb.vocab ?? [];
  const entries = Object.entries(progress);
  const name = (id: string) => ENGLISH_TOPICS.find((t) => t.id === id)?.name ?? id;
  const next = nextRecommended(progress, bb.englishLevel ?? null);
  return (
    <>
      <div className="mt-4">
        <h3 className="mb-1 flex items-center gap-1 text-sm font-semibold"><Languages className="h-4 w-4 text-primary" />英语词汇</h3>
        {vocab.length === 0 ? <p className="text-xs text-muted-foreground">暂无</p> : (
          <ul className="flex flex-wrap gap-1">
            {vocab.map((v) => (
              <li key={v.word}>
                <button type="button" onClick={() => speak(v.word)} title={v.meaning} className="rounded-full bg-muted px-2 py-0.5 text-xs hover:bg-secondary">{v.word}</button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-4">
        <h3 className="mb-1 flex items-center gap-1 text-sm font-semibold"><GraduationCap className="h-4 w-4 text-primary" />英语进度{bb.englishLevel && <span className="ml-1 rounded bg-secondary px-1.5 text-xs text-secondary-foreground">{bb.englishLevel}</span>}</h3>
        {entries.length === 0 ? <p className="text-xs text-muted-foreground">暂无学习证据</p> : (
          <ul className="space-y-0.5 text-sm">
            {entries.map(([id, p]) => (
              <li key={id} className="flex justify-between gap-2"><span className="truncate">{name(id)}</span><span className={cn("shrink-0 text-xs", p.status === "已掌握" ? "text-primary" : "text-muted-foreground")}>{p.status}</span></li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-muted-foreground">推荐下一个：{next.map((t) => t.name).join("、") || "—"}</p>
      </div>
    </>
  );
}
