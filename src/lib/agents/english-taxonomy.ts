// English micro-topic taxonomy (inspired by Marble / os-taxonomy): each topic has
// mastery evidence, an age band and a prerequisite graph. Client-safe static data.

export type TopicType = "vocabulary" | "grammar" | "speaking" | "writing";
export type Level = "初级" | "中级" | "进阶";

export interface Prereq { id: string; strength: "hard" | "soft"; reason: string }
export interface EnglishTopic {
  id: string;
  name: string;
  type: TopicType;
  level: Level;
  evidence: string; // what counts as mastery evidence
  prerequisites: Prereq[];
}

const t = (id: string, name: string, type: TopicType, level: Level, evidence: string, pre: [string, "hard" | "soft", string][] = []): EnglishTopic =>
  ({ id, name, type, level, evidence, prerequisites: pre.map(([id, strength, reason]) => ({ id, strength, reason })) });

export const ENGLISH_TOPICS: EnglishTopic[] = [
  t("v-colors", "颜色词", "vocabulary", "初级", "能说出作品中 3 种颜色的英文"),
  t("v-shapes", "形状词", "vocabulary", "初级", "能用英文说出圆形、方形、三角形等"),
  t("v-numbers", "数字与数量", "vocabulary", "初级", "能用英文说出 1~100 的用量"),
  t("v-tools", "工具与材料", "vocabulary", "初级", "能说出 3 个所用工具/材料的英文", [["v-numbers", "soft", "说材料常带数量"]]),
  t("v-food", "食物与食材", "vocabulary", "初级", "能说出 3 种食材的英文"),
  t("v-actions", "动作动词", "vocabulary", "初级", "能用 cut/fold/mix/bake 等描述动作"),
  t("v-measure", "计量单位", "vocabulary", "中级", "能正确使用 gram, cup, minute, centimetre", [["v-numbers", "hard", "单位需要数字"]]),
  t("v-adjectives", "描述形容词", "vocabulary", "初级", "能用 2 个形容词描述作品", [["v-colors", "soft", "颜色是最简单的形容"]]),
  t("v-feelings", "感受词", "vocabulary", "初级", "能用英文说出做作品时的感受"),
  t("v-culture", "节日与传统文化词", "vocabulary", "中级", "能用英文说出相关节日或工艺名称"),
  t("g-this-is", "This is / These are", "grammar", "初级", "能用 This is… 介绍物品", [["v-tools", "soft", "需要可介绍的名词"]]),
  t("g-plural", "名词复数", "grammar", "初级", "能正确说出 2 个复数名词", [["v-numbers", "hard", "复数依赖数量概念"]]),
  t("g-there-be", "There is / There are", "grammar", "初级", "能描述作品上有什么", [["g-plural", "hard", "are 后接复数"]]),
  t("g-imperative", "祈使句", "grammar", "初级", "能用 Cut the paper. 等发出步骤指令", [["v-actions", "hard", "祈使句以动词开头"]]),
  t("g-sequence", "顺序词 first/then/finally", "grammar", "中级", "能用顺序词连贯说出 3 个步骤", [["g-imperative", "hard", "步骤由祈使句组成"]]),
  t("g-can", "情态动词 can", "grammar", "初级", "能说出 I can… 表达能力", [["v-actions", "soft", "can 后接动词"]]),
  t("g-present-simple", "一般现在时", "grammar", "初级", "能正确使用三单形式描述习惯", [["g-this-is", "soft", "先掌握 be 动词"]]),
  t("g-present-cont", "现在进行时", "grammar", "中级", "能说出 I am cutting… 描述正在做的事", [["v-actions", "hard", "需要动作动词"], ["g-present-simple", "soft", "与一般现在时对比"]]),
  t("g-past-simple", "一般过去时", "grammar", "中级", "能用过去式回顾制作过程", [["g-present-simple", "hard", "过去式在现在时基础上变化"]]),
  t("g-future", "将来时 will / be going to", "grammar", "中级", "能说出下次的改进计划", [["g-present-simple", "soft", "先会基本句"]]),
  t("g-comparative", "比较级", "grammar", "中级", "能比较两次作品 bigger/better", [["v-adjectives", "hard", "比较级由形容词变化"]]),
  t("g-superlative", "最高级", "grammar", "中级", "能说出 the best part is…", [["g-comparative", "hard", "先比较级后最高级"]]),
  t("g-because", "原因从句 because", "grammar", "中级", "能用 because 解释选择", [["g-present-simple", "soft", "需要完整句"]]),
  t("g-should", "情态动词 should", "grammar", "中级", "能用 should 给出安全提醒", [["g-can", "soft", "情态动词同类"]]),
  t("g-passive", "被动语态", "grammar", "进阶", "能说出 It is made of… / It was baked…", [["g-past-simple", "hard", "需要过去分词"]]),
  t("g-if", "条件句 if", "grammar", "进阶", "能说出 If the dough is sticky, add flour.", [["g-imperative", "soft", "主句常为祈使句"], ["g-future", "soft", "首条件句用将来时"]]),
  t("g-present-perfect", "现在完成时", "grammar", "进阶", "能说出 I have finished… 描述成果", [["g-past-simple", "hard", "需要过去分词"]]),
  t("g-relative", "定语从句 which/that", "grammar", "进阶", "能用定语从句描述作品细节", [["g-because", "soft", "复合句基础"]]),
  t("s-greeting", "打招呼与自我介绍", "speaking", "初级", "能用英文完成 2 轮问候"),
  t("s-ask-help", "请求帮助", "speaking", "初级", "能说出 Can you help me…?", [["g-can", "hard", "使用 can 提问"]]),
  t("s-ask-how", "询问做法", "speaking", "中级", "能说出 How do I…? 并听懂回答", [["s-ask-help", "soft", "求助的延伸"]]),
  t("s-describe", "口头描述作品", "speaking", "中级", "能连续说 3 句介绍作品", [["g-there-be", "hard", "描述需要 there be"], ["v-adjectives", "hard", "需要形容词"]]),
  t("s-explain-steps", "口头讲解步骤", "speaking", "中级", "能口头讲解 3 个以上步骤", [["g-sequence", "hard", "步骤讲解需要顺序词"]]),
  t("s-opinion", "表达观点", "speaking", "中级", "能说出 I think… because…", [["g-because", "hard", "观点需要理由"]]),
  t("s-feedback", "给同伴评价", "speaking", "进阶", "能礼貌地给出 1 个优点和 1 个建议", [["s-opinion", "hard", "评价基于观点表达"], ["g-should", "soft", "建议常用 should"]]),
  t("s-present", "作品展示演讲", "speaking", "进阶", "能做 1 分钟英文作品展示", [["s-describe", "hard", "展示以描述为基础"], ["s-explain-steps", "hard", "需讲解过程"]]),
  t("w-label", "给作品贴英文标签", "writing", "初级", "能为作品写 3 个英文标签", [["v-tools", "soft", "标签多为名词"]]),
  t("w-recipe", "写英文步骤卡/食谱", "writing", "中级", "能写出带用量的 4 步英文步骤卡", [["g-sequence", "hard", "需要顺序词"], ["v-measure", "hard", "需要计量单位"]]),
  t("w-intro", "写英文作品介绍", "writing", "中级", "能写 3~5 句的作品介绍", [["s-describe", "soft", "先会说再会写"]]),
  t("w-reflection", "写英文反思", "writing", "进阶", "能用过去时+将来时写反思短文", [["g-past-simple", "hard", "回顾过程"], ["g-future", "hard", "提出改进"]]),
];

export const TOPIC_BY_ID = new Map(ENGLISH_TOPICS.map((x) => [x.id, x]));

export const MASTERY_THRESHOLD = 2; // evidence records needed to count as mastered

export type ProgressEntry = { evidence: number; status: "学习中" | "已掌握"; notes: string[] };
export type EnglishProgress = Record<string, ProgressEntry>;

/** Add one evidence record per topic id; unknown ids are ignored. */
export function recordEvidence(progress: EnglishProgress, items: { topicId: string; note: string }[]): EnglishProgress {
  const next: EnglishProgress = { ...progress };
  for (const { topicId, note } of items) {
    if (!TOPIC_BY_ID.has(topicId)) continue;
    const prev = next[topicId] ?? { evidence: 0, status: "学习中", notes: [] };
    const evidence = prev.evidence + 1;
    next[topicId] = {
      evidence,
      status: evidence >= MASTERY_THRESHOLD ? "已掌握" : "学习中",
      notes: [...prev.notes, note].filter(Boolean).slice(-3),
    };
  }
  return next;
}

const LEVEL_ORDER: Level[] = ["初级", "中级", "进阶"];

/** Zone of proximal development: unmastered topics whose hard prerequisites are mastered. */
export function nextRecommended(progress: EnglishProgress, level: Level | null, limit = 3): EnglishTopic[] {
  const mastered = (id: string) => progress[id]?.status === "已掌握";
  const maxLevel = LEVEL_ORDER.indexOf(level ?? "初级");
  return ENGLISH_TOPICS.filter(
    (x) => !mastered(x.id) && LEVEL_ORDER.indexOf(x.level) <= maxLevel + 1 &&
      x.prerequisites.every((p) => p.strength === "soft" || mastered(p.id)),
  )
    .sort((a, b) => Number(!!progress[b.id]) - Number(!!progress[a.id]) || LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level))
    .slice(0, limit);
}
