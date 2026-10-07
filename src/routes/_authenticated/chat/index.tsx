import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/chat/")({
  staticData: { sitemap: false },
  beforeLoad: async () => {
    const { data } = await supabase.from("sessions").select("id").order("updated_at", { ascending: false }).limit(1);
    let id = data?.[0]?.id;
    if (!id) {
      const { data: created, error } = await supabase.from("sessions").insert({}).select("id").single();
      if (error) throw error;
      id = created.id;
    }
    throw redirect({ to: "/chat/$sessionId", params: { sessionId: id } });
  },
});
