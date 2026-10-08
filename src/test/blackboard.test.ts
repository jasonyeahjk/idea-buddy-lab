import { describe, expect, it } from "vitest";
import { agentForIntent, applyPatch, emptyBlackboard } from "@/lib/agents/blackboard";

describe("supervisor routing", () => {
  it("routes each intent to its owning agent", () => {
    expect(agentForIntent("inspiration")).toBe("inspiration");
    expect(agentForIntent("creation")).toBe("creation");
    expect(agentForIntent("evaluation")).toBe("evaluation");
    expect(agentForIntent("general")).toBe("inspiration");
  });
});

describe("blackboard patch", () => {
  it("appends and dedupes list fields, keeps scalars when patch is null", () => {
    const a = applyPatch(emptyBlackboard(), { category: "剪纸", materials: ["红纸"] });
    const b = applyPatch(a, { category: null, materials: ["红纸", "剪刀"] });
    expect(b.category).toBe("剪纸");
    expect(b.materials).toEqual(["红纸", "剪刀"]);
  });
});

describe("evaluation fields", () => {
  it("replaces evaluation scores and appends resource tips", () => {
    const a = applyPatch(emptyBlackboard(), { evaluation: ["创意表达：★★★"], resourceTips: ["边角料做书签"] });
    const b = applyPatch(a, { evaluation: ["创意表达：★★★★"], resourceTips: ["剩余面团冷冻"] });
    expect(b.evaluation).toEqual(["创意表达：★★★★"]);
    expect(b.resourceTips).toEqual(["边角料做书签", "剩余面团冷冻"]);
  });
});

describe("diagrams", () => {
  it("appends diagram summaries, deduped, capped at 8", () => {
    let bb = emptyBlackboard();
    for (let i = 0; i < 10; i++) bb = applyPatch(bb, { diagrams: [`图${i}`, `图${i}`] });
    expect(bb.diagrams).toHaveLength(8);
    expect(bb.diagrams[7]).toBe("图9");
  });
  it("clamps oversized diagrams to 1000 mm", async () => {
    const { sanitizeDiagram } = await import("@/lib/agents/diagram");
    const d = sanitizeDiagram({ title: "t", width: 5000, height: 200, shapes: [], notes: [] });
    expect(d.width).toBe(1000);
    expect(d.height).toBe(200);
  });
});

describe("english agent", () => {
  it("routes english intent to the english agent", () => {
    expect(agentForIntent("english")).toBe("english");
  });
  it("marks a topic mastered only after 2 evidence records", () => {
    const a = applyPatch(emptyBlackboard(), { englishEvidence: [{ topicId: "v-colors", note: "red" }] });
    expect(a.englishProgress["v-colors"]?.status).toBe("学习中");
    const b = applyPatch(a, { englishEvidence: [{ topicId: "v-colors", note: "blue" }, { topicId: "nope", note: "x" }] });
    expect(b.englishProgress["v-colors"]?.status).toBe("已掌握");
    expect(b.englishProgress["nope"]).toBeUndefined();
  });
  it("dedupes vocab cards by word", () => {
    const c = { word: "Flour", phonetic: "", meaning: "面粉", example: "" };
    const b = applyPatch(applyPatch(emptyBlackboard(), { vocab: [c] }), { vocab: [{ ...c, word: "flour" }] });
    expect(b.vocab).toHaveLength(1);
  });
  it("taxonomy prerequisites exist and form no cycle", async () => {
    const { ENGLISH_TOPICS, TOPIC_BY_ID } = await import("@/lib/agents/english-taxonomy");
    const state = new Map<string, number>();
    const visit = (id: string): void => {
      if (state.get(id) === 2) return;
      if (state.get(id) === 1) throw new Error(`cycle at ${id}`);
      state.set(id, 1);
      for (const p of TOPIC_BY_ID.get(id)!.prerequisites) {
        expect(TOPIC_BY_ID.has(p.id)).toBe(true);
        visit(p.id);
      }
      state.set(id, 2);
    };
    ENGLISH_TOPICS.forEach((t) => visit(t.id));
  });
});

describe("normalizeBlackboard", () => {
  it("fills new fields for older saved boards", async () => {
    const { normalizeBlackboard } = await import("@/lib/agents/blackboard");
    const bb = normalizeBlackboard({ topic: "灯笼", englishProgress: null });
    expect(bb.topic).toBe("灯笼");
    expect(bb.englishProgress).toEqual({});
    expect(bb.vocab).toEqual([]);
  });
});
