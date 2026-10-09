import { useEffect, useRef, useState } from "react";
import { Mic, PhoneOff, Loader2, Sparkles } from "lucide-react";
import { useLiveVoice, type LiveEvent } from "@/hooks/use-live-voice";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Caption = { role: "user" | "assistant"; text: string };

export function VoiceCompanion({ sessionId, onTurn, onEnded, onAnalyze, analyzing }: { sessionId: string; onTurn: (event: LiveEvent) => void; onEnded?: (mode: "zh" | "en") => void; onAnalyze?: () => void; analyzing?: boolean }) {
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [mode, setMode] = useState<"zh" | "en">("zh");
  const voice = useLiveVoice({
    startPayload: async () => {
      const { data } = await supabase.auth.getSession();
      return { token: data.session?.access_token ?? "", sessionId, mode };
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

  const wasActive = useRef(false);
  const active = voice.status === "connecting" || voice.status === "connected" || voice.status === "stopping";
  useEffect(() => {
    if (wasActive.current && !active) onEnded?.(mode);
    wasActive.current = active;
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps
  const label =
    voice.status === "connecting" ? "正在接通…" :
    voice.status === "stopping" ? "正在结束…" :
    voice.status === "connected" ? "正在听，你可以直接说话" : "";

  return (
    <div className="mb-2">
      <audio ref={voice.audioRef} autoPlay hidden />
      <div className="flex flex-wrap items-center gap-2">
        {active ? (
          <Button size="sm" variant="destructive" onClick={voice.stop}><PhoneOff className="mr-1 h-4 w-4" />结束语音</Button>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => { setCaptions([]); voice.start(); }}><Mic className="mr-1 h-4 w-4" />{mode === "en" ? "英语口语练习" : "语音陪伴"}</Button>
        )}
        {!active && (
          <div className="flex overflow-hidden rounded-md border text-xs" role="group" aria-label="语音语言">
            {(["zh", "en"] as const).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)} className={m === mode ? "bg-secondary px-2 py-1 font-medium text-secondary-foreground" : "px-2 py-1 text-muted-foreground"}>
                {m === "zh" ? "中文" : "English"}
              </button>
            ))}
          </div>
        )}
        {!active && onAnalyze && (
          <Button size="sm" variant="outline" onClick={onAnalyze} disabled={analyzing}><Sparkles className="mr-1 h-4 w-4" />分析我的英语水平</Button>
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
