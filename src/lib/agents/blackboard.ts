// Shared state blackboard — the single source of truth every agent reads and writes.
// Client-safe: types and pure helpers only.

export type AgentId = "supervisor" | "inspiration" | "creation" | "evaluation";
export type Intent = "inspiration" | "creation" | "evaluation" | "general";

export const AGENT_LABELS: Record<AgentId, string> = {
  supervisor: "调度中枢",
  inspiration: "灵感探究智能体",
  creation: "创作辅助智能体",
  evaluation: "分享评价智能体",
};

export const AGENT_READY: Record<AgentId, boolean> = {
  supervisor: true,
  inspiration: true,
  creation: false,
  evaluation: false,
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
  safetyTips: string[];
  guidingQuestions: string[];
  knowledge: string[];
  routeLog: RouteRecord[];
}

export const emptyBlackboard = (): Blackboard => ({
  category: null,
  topic: null,
  goal: null,
  stage: "灵感",
  ideas: [],
  materials: [],
  safetyTips: [],
  guidingQuestions: [],
  knowledge: [],
  routeLog: [],
});

export function normalizeBlackboard(raw: unknown): Blackboard {
  const base = emptyBlackboard();
  if (!raw || typeof raw !== "object") return base;
  return { ...base, ...(raw as Partial<Blackboard>) };
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
  safetyTips?: string[];
  guidingQuestions?: string[];
  knowledge?: string[];
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
    safetyTips: uniq(bb.safetyTips, p.safetyTips),
    guidingQuestions: p.guidingQuestions?.length ? p.guidingQuestions.slice(0, 5) : bb.guidingQuestions,
    knowledge: uniq(bb.knowledge, p.knowledge),
  };
}

/** Supervisor routing rule: map intent to the agent that owns it. */
export function agentForIntent(intent: Intent): AgentId {
  if (intent === "creation") return "creation";
  if (intent === "evaluation") return "evaluation";
  return "inspiration"; // inspiration + general both land on the inspiration agent for now
}
