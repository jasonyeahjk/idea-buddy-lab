import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { userClient } from "@/lib/agents/chat.server";

const Body = z.object({ text: z.string().trim().min(1).max(400) });

export const Route = createFileRoute("/api/tts")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace("Bearer ", "");
        if (!token) return new Response("请先登录", { status: 401 });
        const { data: claims } = await userClient(token).auth.getClaims(token);
        if (!claims?.claims?.sub) return new Response("登录已过期", { status: 401 });
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return new Response("bad request", { status: 400 });

        const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env["LOVABLE_API_KEY"]}`,
            "Content-Type": "application/json",
            "X-Lovable-AIG-SDK": "fetch",
          },
          body: JSON.stringify({
            model: "google/gemini-3.1-flash-tts-preview",
            contents: [{ role: "user", parts: [{ text: `Read slowly and clearly in American English for a young learner: ${parsed.data.text}` }] }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } },
            },
            stream_format: "audio",
          }),
        });
        if (!res.ok || !res.body) {
          console.error("tts failed", res.status, await res.text().catch(() => ""));
          return new Response("朗读暂时不可用", { status: res.status === 402 || res.status === 429 ? res.status : 502 });
        }
        return new Response(res.body, { headers: { "content-type": "audio/wav", "cache-control": "private, max-age=86400" } });
      },
    },
  },
});
