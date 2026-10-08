import { NoOutputGeneratedError, Output, streamText, type LanguageModel } from "ai";
import { z } from "zod";
import { agentForIntent, type Blackboard, type Intent, type RouteRecord, type Stage } from "./blackboard";
import { reasoningOptions } from "./gateway.server";

const decisionSchema = z.object({
  intent: z.enum(["inspiration", "creation", "evaluation", "english", "general"]),
  confidence: z.number(),
  reason: z.string(),
  category: z.string().nullable(),
  topic: z.string().nullable(),
  stage: z.enum(["灵感", "准备", "制作", "装饰", "分享", "反思"]).nullable(),
});

const SUPERVISOR_PROMPT = `你是“创享智伴”多智能体系统的 Supervisor（调度中枢）。你不直接回答学生，只做意图识别与路由。
可选意图：
- inspiration：找灵感、选题、了解文化/营养/技法知识、素材推荐、安全注意事项、"我想做…但不知道做什么"。
- creation：已经确定作品，需要具体步骤拆解、参数（温度/时间/配比/尺寸）、过程中遇到问题求助、上传图纸求反馈。
- evaluation：作品完成后要发布分享、请求评价打分、写反思、成本估算/材料复用总结。
- english：想学英语或用英语——"这个用英语怎么说"、要英文词汇/单词卡、练英语口语、用英语介绍作品、纠正英文句子、学生直接用英文对话。
- general：打招呼、闲聊或与创作无关。
同时从学生话语中抽取创作品类（如 手工艺/剪纸/绘画/蛋糕/面包/菜色）、主题，以及所处阶段（灵感/准备/制作/装饰/分享/反思）。无法判断时给 null。
reason 用一句简短中文说明路由理由。confidence 为 0~1。`;

export interface SupervisorDecision extends RouteRecord {
  category: string | null;
  topic: string | null;
  stage: Stage | null;
}

export async function routeIntent(
  model: LanguageModel,
  latestUserText: string,
  bb: Blackboard,
  signal: AbortSignal,
): Promise<SupervisorDecision> {
  const context = `当前黑板：品类=${bb.category ?? "未知"}；主题=${bb.topic ?? "未知"}；阶段=${bb.stage}；最近路由=${
    bb.routeLog.at(-1)?.intent ?? "无"
  }\n学生最新消息：${latestUserText}`;

  let parsed: z.infer<typeof decisionSchema> | null = null;
  const result = streamText({
    model,
    instructions: SUPERVISOR_PROMPT,
    prompt: context,
    output: Output.object({ schema: decisionSchema }),
    abortSignal: signal,
    providerOptions: reasoningOptions("low"),
  });
  try {
    parsed = await result.output;
  } catch (err) {
    if (NoOutputGeneratedError.isInstance(err)) {
      try {
        parsed = decisionSchema.parse(JSON.parse(await result.text));
      } catch {
        parsed = null;
      }
    } else throw err;
  }

  const intent: Intent = parsed?.intent ?? "general";
  return {
    at: new Date().toISOString(),
    intent,
    agent: agentForIntent(intent),
    confidence: Math.max(0, Math.min(1, parsed?.confidence ?? 0)),
    reason: parsed?.reason ?? "无法解析意图，默认交给灵感探究智能体",
    category: parsed?.category ?? null,
    topic: parsed?.topic ?? null,
    stage: parsed?.stage ?? null,
  };
}
