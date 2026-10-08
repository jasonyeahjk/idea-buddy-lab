import { stepCountIs, streamText, tool, type LanguageModel, type ModelMessage } from "ai";
import { z } from "zod";
import { applyPatch, type Blackboard } from "./blackboard";
import { ENGLISH_TOPICS, nextRecommended } from "./english-taxonomy";
import { reasoningOptions } from "./gateway.server";

function buildPrompt(bb: Blackboard) {
  const progress = Object.entries(bb.englishProgress).map(([id, p]) => `${id}:${p.status}(${p.evidence})`).join("，") || "无";
  const next = nextRecommended(bb.englishProgress, bb.englishLevel).map((t) => `${t.id} ${t.name}`).join("；");
  const catalog = ENGLISH_TOPICS.map((t) => `${t.id}|${t.name}|${t.level}|证据：${t.evidence}`).join("\n");
  return `你是“创享智伴”的【英语伴学智能体】，用学生正在做的创作作品（手工、烘焙、绘画、菜色等）作为真实语境教英语，面向 K-12 学生。
教学原则：
1. 自适应：根据学生的英文表达估计水平（初级/中级/进阶），写入 englishLevel；初级多用中文讲解+简单单词，进阶多用英文。
2. 创作词汇卡：当学生想知道材料/工具/步骤怎么用英语说时，调用 add_vocab_cards 生成 3~8 张卡（单词、国际音标、中文意思、贴合作品的简短例句）。优先取自黑板的材料和步骤。
3. 英文作品介绍：分享阶段帮学生写英文介绍，按水平给出分级版本（如 Easy / Better），并附一句朗读提示。
4. 口语纠正：学生说英文时，先肯定，再温和地给出更自然的说法，不罗列语法术语。
5. 循证进度：当学生的表达达到某知识点的“证据”标准时，调用 record_evidence 记录（topicId 必须来自下方目录，note 写学生原话摘要）。不要替学生虚构证据。
6. 结尾给 1 个小练习或问题，优先围绕“推荐下一个”知识点。
7. 使用 Markdown 简洁组织；解释用简体中文。

知识点目录（id|名称|级别|掌握证据）：
${catalog}

学生英语水平：${bb.englishLevel ?? "未知"}
已有进度：${progress}
推荐下一个：${next || "无"}
创作上下文：品类=${bb.category ?? "未知"}；作品=${bb.topic ?? "未知"}；阶段=${bb.stage}
材料：${bb.materials.join("、") || "无"}
步骤：${bb.steps.slice(0, 8).join("；") || "无"}
已有词汇：${bb.vocab.map((v) => v.word).join(", ") || "无"}`;
}

export function runEnglishAgent(
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
      add_vocab_cards: tool({
        description: "生成与当前作品相关的中英词汇卡，显示给学生并写入黑板。",
        inputSchema: z.object({
          cards: z.array(z.object({ word: z.string(), phonetic: z.string(), meaning: z.string(), example: z.string() })),
        }),
        execute: async ({ cards }) => {
          const vocab = cards.slice(0, 8);
          bbRef.current = applyPatch(bbRef.current, { vocab });
          return { ok: true, count: vocab.length };
        },
      }),
      record_evidence: tool({
        description: "学生表达达到某英语知识点的掌握证据时记录一次，同时可更新估计水平。",
        inputSchema: z.object({
          englishLevel: z.enum(["初级", "中级", "进阶"]).nullable(),
          items: z.array(z.object({ topicId: z.string(), note: z.string() })),
        }),
        execute: async ({ englishLevel, items }) => {
          bbRef.current = applyPatch(bbRef.current, { englishLevel, englishEvidence: items });
          return {
            ok: true,
            next: nextRecommended(bbRef.current.englishProgress, bbRef.current.englishLevel).map((t) => t.name),
          };
        },
      }),
    },
  });
}
