import { createFileRoute, Link } from "@tanstack/react-router";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "创享智伴 · 多智能体协同的学生创作伴学平台" },
      { name: "description", content: "基于多智能体协同的学生多元创作全流程伴学与循证评价平台：手工艺、绘画、烘焙、菜色。" },
      { property: "og:title", content: "创享智伴 · 多智能体协同的学生创作伴学平台" },
      { property: "og:description", content: "从灵感到分享，多智能体陪伴学生完成手工、绘画、烘焙与烹饪创作。" },
    ],
  }),
  component: Index,
});

const agents = [
  { name: "调度中枢 Supervisor", desc: "识别学生意图，把任务路由给最合适的智能体。", ready: true },
  { name: "灵感探究智能体", desc: "问题链引导、素材推荐、安全提示、文化与营养知识。", ready: true },
  { name: "创作辅助智能体", desc: "步骤拆解、参数建议、过程反馈与版本迭代。", ready: false },
  { name: "分享评价智能体", desc: "作品发布、同伴互评、过程档案与成本复用。", ready: false },
];

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <img src={logo} alt="" className="h-9 w-9" />
          <span className="font-display text-lg font-semibold">创享智伴</span>
        </div>
        <Link to="/chat" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">进入工作台</Link>
      </header>
      <section className="mx-auto max-w-5xl px-6 pt-12 pb-16">
        <p className="text-sm font-medium text-primary">基础教育组 · 赛道四 · 教育智能体构建与应用</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight md:text-5xl">
          基于多智能体协同的学生多元创作全流程伴学与循证评价平台
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          手工艺、绘画、蛋糕、面包、菜色——从灵感获取到过程创作、成果分享与评价反思。所有智能体共享同一块“状态黑板”，接力陪伴每一次创作。
        </p>
        <Link to="/chat" className="mt-8 inline-block rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground">开始一次创作</Link>
      </section>
      <section className="mx-auto grid max-w-5xl gap-4 px-6 pb-20 md:grid-cols-2">
        {agents.map((a) => (
          <div key={a.name} className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{a.name}</h3>
              <span className={a.ready ? "rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground" : "rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"}>
                {a.ready ? "已接入" : "待接入"}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{a.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
