import { useState } from "react";
import { Network } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ENGLISH_TOPICS, TOPIC_BY_ID, nextRecommended, type EnglishProgress, type TopicType } from "@/lib/agents/english-taxonomy";

const TYPES: { id: TopicType; label: string }[] = [
  { id: "vocabulary", label: "词汇" },
  { id: "grammar", label: "语法" },
  { id: "speaking", label: "口语" },
  { id: "writing", label: "写作" },
];
const LEVELS = ["初级", "中级", "进阶"] as const;

type State = "mastered" | "learning" | "next" | "locked";
const STATE_STYLE: Record<State, string> = {
  mastered: "border-primary bg-primary text-primary-foreground",
  learning: "border-primary/60 bg-primary/15 text-foreground",
  next: "border-secondary-foreground/40 bg-secondary text-secondary-foreground ring-2 ring-secondary-foreground/30",
  locked: "border-border bg-muted text-muted-foreground",
};
const STATE_LABEL: Record<State, string> = { mastered: "已掌握", learning: "学习中", next: "推荐下一个", locked: "待解锁" };

export function EnglishGraphDialog({ progress, level }: { progress: EnglishProgress; level: string | null }) {
  const [selected, setSelected] = useState<string | null>(null);
  const nextIds = new Set(nextRecommended(progress, level as never).map((t) => t.id));
  const stateOf = (id: string): State =>
    progress[id]?.status === "已掌握" ? "mastered" : progress[id] ? "learning" : nextIds.has(id) ? "next" : "locked";
  const mastered = ENGLISH_TOPICS.filter((t) => stateOf(t.id) === "mastered").length;
  const learning = ENGLISH_TOPICS.filter((t) => stateOf(t.id) === "learning").length;
  const sel = selected ? TOPIC_BY_ID.get(selected) : undefined;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-6 px-2 text-xs"><Network className="mr-1 h-3 w-3" />知识图谱</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>英语知识图谱 · 我的进度</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap gap-3 text-sm">
          <span>已掌握 <b>{mastered}</b> / {ENGLISH_TOPICS.length}</span>
          <span>学习中 <b>{learning}</b></span>
          <span>覆盖率 <b>{Math.round((mastered / ENGLISH_TOPICS.length) * 100)}%</b></span>
          <span className="flex flex-wrap gap-2">
            {(Object.keys(STATE_LABEL) as State[]).map((s) => (
              <span key={s} className={cn("rounded border px-1.5 text-xs", STATE_STYLE[s])}>{STATE_LABEL[s]}</span>
            ))}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-1 text-xs">
            <thead>
              <tr><th className="w-12" />{LEVELS.map((l) => <th key={l} className="font-semibold">{l}</th>)}</tr>
            </thead>
            <tbody>
              {TYPES.map((ty) => (
                <tr key={ty.id}>
                  <td className="align-top font-semibold">{ty.label}</td>
                  {LEVELS.map((l) => (
                    <td key={l} className="align-top">
                      <div className="flex flex-wrap gap-1">
                        {ENGLISH_TOPICS.filter((t) => t.type === ty.id && t.level === l).map((t) => (
                          <button key={t.id} type="button" onClick={() => setSelected(t.id)}
                            className={cn("rounded border px-1.5 py-0.5 text-left", STATE_STYLE[stateOf(t.id)], selected === t.id && "outline outline-2 outline-foreground")}>
                            {t.name}
                          </button>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sel ? (
          <div className="rounded-md border bg-card p-3 text-sm">
            <p className="font-semibold">{sel.name} <span className="text-xs font-normal text-muted-foreground">{sel.level} · {STATE_LABEL[stateOf(sel.id)]}{progress[sel.id] ? ` · 证据 ${progress[sel.id]!.evidence} 条` : ""}</span></p>
            <p className="mt-1"><b>掌握标准：</b>{sel.evidence}</p>
            {sel.prerequisites.length > 0 && (
              <p className="mt-1"><b>前置知识：</b>{sel.prerequisites.map((p) => `${TOPIC_BY_ID.get(p.id)?.name ?? p.id}（${p.strength === "hard" ? "必需" : "建议"}·${STATE_LABEL[stateOf(p.id)]}）`).join("；")}</p>
            )}
            {!!progress[sel.id]?.notes.length && <p className="mt-1"><b>我的证据：</b>{progress[sel.id]!.notes.join("；")}</p>}
          </div>
        ) : <p className="text-xs text-muted-foreground">点击任一知识点查看掌握标准、前置依赖和你的证据。</p>}
      </DialogContent>
    </Dialog>
  );
}
