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
