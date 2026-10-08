// Shared state blackboard — the single source of truth every agent reads and writes.
// Client-safe: types and pure helpers only.

import { recordEvidence, type EnglishProgress, type Level } from "./english-taxonomy";

export type AgentId = "supervisor" | "inspiration" | "creation" | "evaluation" | "english";
export type Intent = "inspiration" | "creation" | "evaluation" | "english" | "general";

export interface VocabCard { word: string; phonetic: string; meaning: string; example: string }

export const AGENT_LABELS: Record<AgentId, string> = {
  supervisor: "调度中枢",
  inspiration: "灵感探究智能体",
  creation: "创作辅助智能体",
  evaluation: "分享评价智能体",
  english: "英语伴学智能体",
};

export const AGENT_READY: Record<AgentId, boolean> = {
  supervisor: true,
  inspiration: true,
  creation: true,
  evaluation: true,
  english: true,
};

export type Stage = "灵感" | "准备" | "制作" | "装饰" | "分享" | "反思";

export interface RouteRecord {
  at: string;
  intent: Intent;
  agent: AgentId;
  confidence: number;
  reason: string;
}

export interface Blackboard {
  category: string | null; // 手工艺 / 绘画 / 蛋糕 / 面包 / 菜色 ...
  topic: string | null;
  goal: string | null;
  stage: Stage;
  ideas: string[];
  materials: string[];
  steps: string[];
  safetyTips: string[];
  guidingQuestions: string[];
  knowledge: string[];
  evaluation: string[];
  reflections: string[];
  resourceTips: string[];
  diagrams: string[]; // "标题：尺寸摘要"
  englishLevel: Level | null;
  vocab: VocabCard[];
  englishProgress: EnglishProgress;
  routeLog: RouteRecord[];
}

export const emptyBlackboard = (): Blackboard => ({
  category: null,
  topic: null,
  goal: null,
  stage: "灵感",
  ideas: [],
  materials: [],
  steps: [],
  safetyTips: [],
  guidingQuestions: [],
  knowledge: [],
  evaluation: [],
  reflections: [],
  resourceTips: [],
  diagrams: [],
  englishLevel: null,
  vocab: [],
  englishProgress: {},
  routeLog: [],
});

export function normalizeBlackboard(raw: unknown): Blackboard {
  const base = emptyBlackboard();
  if (!raw || typeof raw !== "object") return base;
  const merged = { ...base } as Record<string, unknown>;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    // Keep defaults for missing/null fields so older saved boards stay valid.
    if (v !== null && v !== undefined) merged[k] = v;
    else if (!(k in base) || (base as unknown as Record<string, unknown>)[k] === null) merged[k] = v ?? null;
  }
  return merged as unknown as Blackboard;
}

const uniq = (a: string[], b: string[] | undefined, cap = 12) =>
  Array.from(new Set([...a, ...(b ?? []).map((s) => s.trim()).filter(Boolean)])).slice(-cap);

export interface BlackboardPatch {
  category?: string | null;
  topic?: string | null;
  goal?: string | null;
  stage?: Stage | null;
  ideas?: string[];
  materials?: string[];
  steps?: string[];
  safetyTips?: string[];
  guidingQuestions?: string[];
  knowledge?: string[];
  evaluation?: string[];
  reflections?: string[];
  resourceTips?: string[];
  diagrams?: string[];
  englishLevel?: Level | null;
  vocab?: VocabCard[];
  englishEvidence?: { topicId: string; note: string }[];
}

/** Merge a patch: scalar fields overwrite when provided, list fields append + dedupe. */
export function applyPatch(bb: Blackboard, p: BlackboardPatch): Blackboard {
  return {
    ...bb,
    category: p.category ?? bb.category,
    topic: p.topic ?? bb.topic,
    goal: p.goal ?? bb.goal,
    stage: p.stage ?? bb.stage,
    ideas: uniq(bb.ideas, p.ideas),
    materials: uniq(bb.materials, p.materials),
    steps: uniq(bb.steps, p.steps, 16),
    safetyTips: uniq(bb.safetyTips, p.safetyTips),
    guidingQuestions: p.guidingQuestions?.length ? p.guidingQuestions.slice(0, 5) : bb.guidingQuestions,
    knowledge: uniq(bb.knowledge, p.knowledge),
    evaluation: p.evaluation?.length ? p.evaluation.slice(0, 6) : bb.evaluation,
    reflections: p.reflections?.length ? p.reflections.slice(0, 5) : bb.reflections,
    resourceTips: uniq(bb.resourceTips, p.resourceTips),
    diagrams: uniq(bb.diagrams, p.diagrams, 8),
    englishLevel: p.englishLevel ?? bb.englishLevel,
    vocab: mergeVocab(bb.vocab, p.vocab),
    englishProgress: p.englishEvidence?.length ? recordEvidence(bb.englishProgress, p.englishEvidence) : bb.englishProgress,
  };
}

/** Vocab cards dedupe by lowercase word (newer wins), capped at 30. */
function mergeVocab(a: VocabCard[], b: VocabCard[] | undefined): VocabCard[] {
  if (!b?.length) return a;
  const map = new Map(a.map((v) => [v.word.toLowerCase(), v]));
  for (const v of b) if (v.word.trim()) { map.delete(v.word.toLowerCase()); map.set(v.word.toLowerCase(), v); }
  return Array.from(map.values()).slice(-30);
}

/** Supervisor routing rule: map intent to the agent that owns it. */
export function agentForIntent(intent: Intent): AgentId {
  if (intent === "creation") return "creation";
  if (intent === "evaluation") return "evaluation";
  if (intent === "english") return "english";
  return "inspiration"; // inspiration + general both land on the inspiration agent for now
}
