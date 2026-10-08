# 语音陪伴 + 图纸白板

## 1. 免手动语音陪伴（Hands-Free）

在聊天页加一个「语音陪伴」按钮。点一下开始通话，学生可以一边揉面、缝布一边直接说话，比如“我现在面团发粘怎么办？”。AI 会用温暖的声音实时回答，学生说话时可以随时打断它。再点一下结束。

- 接通后 AI 先打招呼，并结合黑板上的当前作品问一句，例如“面包做到哪一步啦？”
- 涉及具体步骤、参数和排错的问题，转交现有的创作辅助智能体回答，所以答案和文字聊天一样专业，也会写入共享黑板（例如推进阶段、补充安全提示）
- 通话中的字幕实时显示在对话区，结束后整段对话保存进当前会话，刷新后还在
- 声音选温暖、亲切的普通话女声，语速稍慢，回答简短（一次 2～3 句），适合边动手边听
- 只有登录用户可用，并且只能用于自己的会话

## 2. 图纸与示意图白板

创作辅助智能体在需要时可以画图，例如剪纸折法、布艺裁片、灯笼组装、蛋糕分层，在回复中显示为一张可视化图纸卡片：

- 矢量线框图，标注真实尺寸（毫米/厘米）：裁剪线为实线，折线为虚线，标出缝份、粘贴区和编号
- 卡片上的按钮：放大查看、下载 SVG、「按 1:1 打印」（打印出来就是真实大小，可以直接当版样剪）
- 图纸标题与尺寸摘要写入黑板新增的「图纸」一栏，分享评价智能体评价时可以引用
- 语音通话中如果需要图，AI 会说“我把图纸放在屏幕上了”，图纸同步出现在对话区

## 测试方式
1. 打开会话，说“我在做全麦面包，面团很粘手怎么办”，确认能听到语音回答、看到字幕，黑板也更新了
2. 文字发“帮我画兔子灯笼的裁剪图，高 20 厘米”，确认出现带尺寸的图纸，并且可以下载和 1:1 打印
3. 刷新页面，确认语音记录和图纸都还在

## 技术细节
- 语音：使用 GPT Live 实时语音（`openai/gpt-live-1`），走 client delegation。按 live-voice skill 复制 `live-relay.server.ts`、`use-live-voice.ts`、`live-vite-plugin.ts`；relay 的后端任务调用现有 `routeIntent` + 各 agent runner（非流式消费），沿用同一份 blackboard 读写，用户 token 走 RLS。Relay 鉴权校验 Bearer + 会话归属。通话结束后把转写结果以 messages 行写入（agent 字段标记来源，parts 带 `voice: true` 元数据）。
- 图纸：在 creation agent 中新增 `draw_diagram` 工具，使用严格 schema：`{ title, unit: "mm", width, height, shapes: [{ kind: line|rect|circle|polyline|text|dim, points, style: cut|fold|seam|glue, label }] }`。前端 `DiagramCard` 把它渲染成 SVG，viewBox 按 mm 设置，打印时 `@page` 设定物理尺寸，所以能 1:1 打印。不让模型直接生成原始 SVG，以保证安全和尺寸准确。
- 黑板新增 `diagrams: {title, summary}[]`，`applyPatch` 追加并去重，上限 8 条；补对应单测。
- 在 AGENTS.md 记录：语音 relay 复用 agent runner 和 blackboard；图纸使用结构化 schema 渲染，不使用模型生成的原始 SVG。
