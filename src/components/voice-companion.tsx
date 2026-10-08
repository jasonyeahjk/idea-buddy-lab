import { useState } from "react";
import { Mic, PhoneOff, Loader2 } from "lucide-react";
import { useLiveVoice, type LiveEvent } from "@/hooks/use-live-voice";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Caption = { role: "user" | "assistant"; text: string };

export function VoiceCompanion({ sessionId, onTurn }: { sessionId: string; onTurn: (event: LiveEvent) => void }) {
  const [captions, setCaptions] = useState<Caption[]>([]);
  const voice = useLiveVoice({
    startPayload: async () => {
      const { data } = await supabase.auth.getSession();
      return { token: data.session?.access_token ?? "", sessionId };
    },
    onEvent: (e) => {
      if (e.type === "session.input_transcript.delta" || e.type === "session.output_transcript.delta") {
        const role: Caption["role"] = e.type === "session.input_transcript.delta" ? "user" : "assistant";
        const delta = String(e["delta"] ?? "");
        setCaptions((c) => {
          const last = c[c.length - 1];
          if (last?.role === role) return [...c.slice(0, -1), { role, text: last.text + delta }];
          return [...c, { role, text: delta }].slice(-6);
        });
      }
      if (e.type === "app.voice.turn") onTurn(e);
    },
  });

  const active = voice.status === "connecting" || voice.status === "connected" || voice.status === "stopping";
  const label =
    voice.status === "connecting" ? "正在接通…" :
    voice.status === "stopping" ? "正在结束…" :
    voice.status === "connected" ? "正在听，你可以直接说话" : "";

  return (
    <div className="mb-2">
      <audio ref={voice.audioRef} autoPlay hidden />
      <div className="flex items-center gap-2">
        {active ? (
          <Button size="sm" variant="destructive" onClick={voice.stop}><PhoneOff className="mr-1 h-4 w-4" />结束语音</Button>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => { setCaptions([]); voice.start(); }}><Mic className="mr-1 h-4 w-4" />语音陪伴</Button>
        )}
        {active && <span className="flex items-center gap-1 text-xs text-muted-foreground">{voice.status === "connecting" && <Loader2 className="h-3 w-3 animate-spin" />}{label}</span>}
        {voice.playbackBlocked && <Button size="sm" variant="ghost" onClick={voice.resumePlayback}>点此播放声音</Button>}
        {voice.error && !active && <span className="text-xs text-destructive">语音连接失败：{voice.error}</span>}
      </div>
      {active && captions.length > 0 && (
        <div className="mt-2 space-y-1 rounded-md bg-muted px-3 py-2 text-sm">
          {captions.map((c, i) => (
            <p key={i}><span className="font-medium text-primary">{c.role === "user" ? "我：" : "智伴："}</span>{c.text}</p>
          ))}
        </div>
      )}
    </div>
  );
}
