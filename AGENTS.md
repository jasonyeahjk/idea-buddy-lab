<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Multi-agent framework lives in `src/lib/agents/`: `blackboard.ts` (client-safe shared state + routing table), `*.server.ts` per agent; new agents plug in by adding a module and flipping `AGENT_READY`. Why: one shared blackboard keeps agents decoupled.
- `/api/chat` runs Supervisor intent routing first, then dispatches to one agent and streams a UI-message stream with `data-route` and `data-blackboard` parts. Why: routing decision and state stay visible to the UI.
- Per-session blackboard is stored as jsonb on `sessions`; messages persisted server-side in `onFinish` using the caller's token (RLS). Why: no admin client needed.
- Voice companion uses GPT Live with client delegation: `/api/live` (server.ts in prod, `live-vite-plugin.ts` in dev) authorizes token + session, then reuses Supervisor and the same agents with a short spoken-answer suffix; turns persist into the same messages table. Why: one agent stack serves text and voice.
- Diagrams are structured millimetre specs (`diagram.ts`) emitted via the `draw_diagram` tool and rendered to SVG on the client. Why: printable at 1:1 and safe to sanitize.
