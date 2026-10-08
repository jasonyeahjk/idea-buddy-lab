import { Volume2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { VocabCard } from "@/lib/agents/blackboard";

// Silent WAV used to unlock the <audio> element inside the tap gesture (iOS/Android autoplay rules).
const SILENT = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";
const cache = new Map<string, string>();
let player: HTMLAudioElement | null = null;

function browserSpeak(text: string): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  const synth = window.speechSynthesis;
  const voices = synth.getVoices();
  const voice = voices.find((v) => v.lang?.toLowerCase().startsWith("en"));
  if (voices.length && !voice) return false;
  synth.cancel();
  synth.resume();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 0.85;
  if (voice) u.voice = voice;
  synth.speak(u);
  return true;
}

/** Plays English text. Uses cloud voice (works on all phones), falls back to the browser's built-in voice. */
export function speak(text: string) {
  if (typeof window === "undefined") return;
  if (!player) player = new Audio();
  const audio = player;
  window.speechSynthesis?.cancel();
  audio.pause();
  // Unlock synchronously inside the tap.
  audio.src = SILENT;
  audio.play().catch(() => {});

  const cached = cache.get(text);
  if (cached) { audio.src = cached; audio.play().catch(() => browserSpeak(text)); return; }

  (async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${data.session?.access_token ?? ""}` },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const url = URL.createObjectURL(await res.blob());
      cache.set(text, url);
      audio.src = url;
      await audio.play();
    } catch {
      if (!browserSpeak(text)) toast.error("朗读暂时不可用，请稍后再试");
    }
  })();
}

export function VocabCards({ cards }: { cards: VocabCard[] }) {
  if (!cards.length) return null;
  return (
    <div className="my-2 grid gap-2 sm:grid-cols-2">
      {cards.map((c) => (
        <div key={c.word} className="rounded-lg border bg-card p-3 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="font-serif text-lg font-semibold text-primary">{c.word}</span>
              <span className="ml-2 text-xs text-muted-foreground">{c.phonetic}</span>
            </div>
            <button type="button" aria-label={`朗读 ${c.word}`} onClick={() => speak(`${c.word}. ${c.example}`)} className="rounded-full p-1.5 text-secondary-foreground hover:bg-secondary">
              <Volume2 className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm">{c.meaning}</p>
          <p className="mt-1 text-xs italic text-muted-foreground">{c.example}</p>
        </div>
      ))}
    </div>
  );
}
