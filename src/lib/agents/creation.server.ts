import { stepCountIs, streamText, tool, type LanguageModel, type ModelMessage } from "ai";
import { z } from "zod";
import { applyPatch, type Blackboard, type Stage } from "./blackboard";
import { reasoningOptions } from "./gateway.server";
import { diagramSchema, diagramSummary, sanitizeDiagram } from "./diagram";

const STAGES: Stage[] = ["灵感", "准备", "制作", "装饰", "分享", "反思"];

function buildPrompt(bb: Blackboard) {
  return `你是“创享智伴”的【创作辅助智能体】，服务中小学生的多元创作学习（手工艺、剪纸、绘画、蛋糕装饰、面包发酵、家常菜色搭配等）。
学生已经确定作品，你的职责是陪他把作品做出来：
1. 把目标拆成有序、可勾选的小步骤，每步一句话、具体可操作；学生已完成的步骤不必重复展开。
2. 给出与品类相关的关键参数（烤箱温度/时间、发酵温度与时长、水和面粉配比、颜料稀释比例、纸张尺寸等），用列表清晰列出。
3. 学生求助过程中的问题时：先给出 1~3 条最可能的原因，再给针对性的调整建议，最后给一句验证方法。
4. 安全提示必须与当前步骤相关（刀具、烤箱、热油、胶水、过敏原等），不堆砌。
5. 若学生描述了图纸或作品照片的内容，基于描述给出 2~3 个具体改进点。
6. 语气亲切鼓励，使用简体中文，篇幅精炼，用 Markdown 小标题组织。
在回复之前，先调用一次 update_blackboard 工具：把步骤计划写入 steps、新增的安全提示与知识写入对应列表、把阶段推进到合适的值（准备/制作/装饰），让后续智能体可以接力。
当学生需要看组装草图、裁剪版样、折法或分层示意时（或明确要求画图），调用 draw_diagram 工具给出一张矢量线框图：
- 坐标单位是毫米，原点在左上角，width/height 是画布尺寸（留 10 毫米边距），尺寸要符合真实大小，便于 1:1 打印当版样。
- style：cut=裁剪实线，fold=折线（虚线），seam=缝份，glue=粘贴区，guide=辅助线；用 dim 标注关键尺寸（label 写如“200 毫米”）。
- 用 text 给部件编号（①②③），notes 写 2~4 条图例说明。每次回复最多画 1 张图，画完在文字里简要说明怎么看图。

当前共享黑板：
${JSON.stringify({ ...bb, routeLog: undefined }, null, 2)}`;
}

export function runCreationAgent(
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
      draw_diagram: tool({
        description: "画一张带真实毫米尺寸的矢量线框图（裁剪版样/组装草图/折法示意），在界面上显示为可下载、可 1:1 打印的图纸。",
        inputSchema: diagramSchema,
        execute: async (raw) => {
          const d = sanitizeDiagram(raw);
          bbRef.current = applyPatch(bbRef.current, { diagrams: [diagramSummary(d)] });
          return { ok: true, shown: diagramSummary(d) };
        },
      }),
      update_blackboard: tool({
        description: "把创作辅助的结果写入共享状态黑板，供分享评价等智能体读取。列表字段为追加，步骤计划写入 steps。",
        inputSchema: z.object({
          category: z.string().nullable(),
          topic: z.string().nullable(),
          goal: z.string().nullable(),
          stage: z.enum(["灵感", "准备", "制作", "装饰", "分享", "反思"]).nullable(),
          steps: z.array(z.string()),
          safetyTips: z.array(z.string()),
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

export const CREATION_STAGES = STAGES;
