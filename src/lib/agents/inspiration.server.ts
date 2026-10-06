import { stepCountIs, streamText, tool, type LanguageModel, type ModelMessage } from "ai";
import { z } from "zod";
import { applyPatch, type Blackboard } from "./blackboard";
import { reasoningOptions } from "./gateway.server";

function buildPrompt(bb: Blackboard) {
  return `你是“创享智伴”的【灵感探究智能体】，服务中小学生的多元创作学习（手工艺、剪纸、绘画、蛋糕装饰、面包发酵、家常菜色搭配等）。
教学原则：
1. 学生是主体：先用 2~3 个递进的“问题链”引导学生思考，而不是直接给出完整答案。
2. 给出 3 个左右风格不同的灵感方向，每个一句话说明亮点。
3. 推荐适合学生年龄、易获取、低成本的素材/材料。
4. 必须给出与品类相关的安全提示（刀具、烤箱、热油、胶水、过敏原等）。
5. 适度融入文化背景（传统节日、民间工艺）或营养知识。
6. 语气亲切鼓励，使用简体中文，篇幅精炼，用 Markdown 小标题组织。
在回复之前，先调用一次 update_blackboard 工具，把本轮提炼出的品类、主题、灵感、材料、安全提示、引导问题、知识点写入共享黑板，让后续智能体可以接力。

当前共享黑板：
${JSON.stringify({ ...bb, routeLog: undefined }, null, 2)}`;
}

export function runInspirationAgent(
  model: LanguageModel,
  messages: ModelMessage[],
  bbRef: { current: Blackboard },
  signal: AbortSignal,
) {
  return streamText({
    model,
    instructions: buildPrompt(bbRef.current),
    messages,
    abortSignal: signal,
    stopWhen: stepCountIs(50),
    providerOptions: reasoningOptions("medium"),
    tools: {
      update_blackboard: tool({
        description: "把灵感探究结果写入共享状态黑板，供创作辅助、分享评价等智能体读取。列表字段为追加。",
        inputSchema: z.object({
          category: z.string().nullable(),
          topic: z.string().nullable(),
          goal: z.string().nullable(),
          ideas: z.array(z.string()),
          materials: z.array(z.string()),
          safetyTips: z.array(z.string()),
          guidingQuestions: z.array(z.string()),
          knowledge: z.array(z.string()),
        }),
        execute: async (patch) => {
          bbRef.current = applyPatch(bbRef.current, patch);
          return { ok: true, written: Object.keys(patch).filter((k) => {
            const v = (patch as Record<string, unknown>)[k];
            return Array.isArray(v) ? v.length > 0 : v != null;
          }) };
        },
      }),
    },
  });
}
