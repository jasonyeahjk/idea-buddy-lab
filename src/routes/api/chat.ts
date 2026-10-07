import { createFileRoute } from "@tanstack/react-router";
import { handleChat } from "@/lib/agents/chat.server";

export const Route = createFileRoute("/api/chat")({
  staticData: { sitemap: false },
  server: { handlers: { POST: ({ request }) => handleChat(request) } },
});
