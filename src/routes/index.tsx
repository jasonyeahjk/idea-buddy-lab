import { createFileRoute, Link } from "@tanstack/react-router";
import logo from "@/assets/logo.png";

const TITLE = "创享智伴 · 多智能体协同的学生创作伴学平台";
const DESC = "灵感探究、创作辅助、分享评价、英语伴学四大智能体共享状态黑板，支持语音陪伴、1:1 裁剪图纸与四维循证评价。";

export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const agents = [
  { name: "调度中枢 Supervisor", desc: "识别学生意图，把每个问题交给最合适的智能体，路由过程全程可见。" },
  { name: "灵感探究智能体", desc: "用问题链引导思考，给出灵感方向、低成本材料、安全提示与文化知识。" },
  { name: "创作辅助智能体", desc: "拆解可勾选的创作步骤、给出用量参数，并画出可 1:1 打印的裁剪/组装图纸。" },
  { name: "分享评价智能体", desc: "从创意表达、技能方法、过程投入、安全规范四个维度循证评价，并估算成本与再利用。" },
  { name: "英语伴学智能体", desc: "把创作材料变成英语词汇卡，按知识点图谱跟踪进度，陪练英文作品介绍。" },
];

const features = [
  { title: "共享状态黑板", desc: "灵感、步骤、图纸、评价、词汇都沉淀在同一块黑板上，智能体接力不丢上下文。" },
  { title: "语音陪伴", desc: "手上沾着面粉也能直接开口问；支持中文陪伴与英语口语练习两种模式。" },
  { title: "1:1 裁剪图纸", desc: "毫米级矢量线框图，可放大、下载，按真实尺寸打印后直接剪裁。" },
  { title: "四维循证评价", desc: "依据照片与过程记录给出有据可查的评价、反思问题和资源循环建议。" },
  { title: "英语词汇卡与进度", desc: "带音标、例句和朗读的单词卡，配合微知识点图谱推荐下一步学什么。" },
  { title: "多会话创作清单", desc: "每件作品一个创作会话，随时切换、继续或删除，记录保存在云端。" },
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
          手工艺、绘画、蛋糕、面包、菜色——从灵感获取、过程创作到成果分享与评价反思，再到用英语介绍自己的作品。五个智能体共享同一块“状态黑板”，可打字也可语音，接力陪伴每一次创作。
        </p>
        <Link to="/chat" className="mt-8 inline-block rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground">开始一次创作</Link>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-16">
        <h2 className="text-2xl font-semibold">特色功能</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border bg-card p-5">
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-20">
        <h2 className="text-2xl font-semibold">智能体团队</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {agents.map((a) => (
            <div key={a.name} className="rounded-xl border bg-card p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{a.name}</h3>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">已接入</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{a.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
