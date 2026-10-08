import { stepCountIs, streamText, tool, type LanguageModel, type ModelMessage } from "ai";
import { z } from "zod";
import { applyPatch, type Blackboard } from "./blackboard";
import { reasoningOptions } from "./gateway.server";

function buildPrompt(bb: Blackboard) {
  return `你是“创享智伴”的【分享评价与资源循环智能体】，服务中小学生的多元创作学习（手工艺、剪纸、绘画、蛋糕装饰、面包发酵、家常菜色搭配等）。
学生的作品已完成或接近完成，你的职责是做“循证评价”并促进分享与反思：
1. 基于共享黑板中的灵感、步骤、材料等过程证据评价，而不只看结果；引用具体证据（如“你在第 3 步调整了发酵时间”）。
2. 用四个维度给出 1~5 星评价并各附一句理由：创意表达、技能方法、过程投入、安全与规范。
3. 先肯定 2 个亮点，再给 1~2 个可操作的改进建议。
4. 用 2~3 个反思问题引导学生自我复盘（学到了什么、遇到什么困难、下次如何改进）。
5. 资源循环：粗略估算材料成本（标注为估算），并给出剩余材料/边角料的复用建议。
6. 帮学生写一段 50 字左右、适合发布分享的作品介绍。
7. 语气温暖鼓励，使用简体中文，篇幅精炼，用 Markdown 小标题组织。
在回复之前，先调用一次 update_blackboard 工具：把四维评价写入 evaluation（格式“维度：★数 理由”），反思问题写入 reflections，成本估算与复用建议写入 resourceTips，并把阶段推进到“分享”或“反思”。

当前共享黑板（过程档案）：
${JSON.stringify({ ...bb, routeLog: undefined }, null, 2)}`;
}

export function runEvaluationAgent(
  model: LanguageModel,
  messages: ModelMessage[],
  bbRef: { current: Blackboard },
  signal: AbortSignal,
  extraInstructions = "",
) {
  return streamText({
    model,
    instructions: buildPrompt(bbRef.current) + extraInstructions,
    messages,
    abortSignal: signal,
    stopWhen: stepCountIs(50),
    providerOptions: reasoningOptions("medium"),
    tools: {
      update_blackboard: tool({
        description: "把评价、反思问题和资源循环建议写入共享状态黑板，形成过程档案。",
        inputSchema: z.object({
          stage: z.enum(["灵感", "准备", "制作", "装饰", "分享", "反思"]).nullable(),
          evaluation: z.array(z.string()),
          reflections: z.array(z.string()),
          resourceTips: z.array(z.string()),
        }),
        execute: async (patch) => {
          bbRef.current = applyPatch(bbRef.current, patch);
          return { ok: true };
        },
      }),
    },
  });
}
