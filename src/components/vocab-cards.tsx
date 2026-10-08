import { Volume2 } from "lucide-react";
import type { VocabCard } from "@/lib/agents/blackboard";

export function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 0.85;
  window.speechSynthesis.speak(u);
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
