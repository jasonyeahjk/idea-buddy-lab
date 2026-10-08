import { useRef, useState } from "react";
import { Download, Maximize2, Printer, X } from "lucide-react";
import { sanitizeDiagram, type Diagram, type DiagramShape } from "@/lib/agents/diagram";
import { Button } from "@/components/ui/button";

const STYLE: Record<string, { stroke: string; dash?: string; width: number }> = {
  cut: { stroke: "var(--foreground)", width: 0.6 },
  fold: { stroke: "var(--primary)", dash: "3 2", width: 0.5 },
  seam: { stroke: "var(--secondary-foreground)", dash: "1 1.5", width: 0.4 },
  glue: { stroke: "var(--accent-foreground)", width: 0.4 },
  guide: { stroke: "var(--muted-foreground)", dash: "0.8 1.2", width: 0.3 },
};

function Shape({ s }: { s: DiagramShape }) {
  const st = STYLE[s.style ?? "cut"] ?? STYLE["cut"]!;
  const common = { stroke: st.stroke, strokeWidth: st.width, strokeDasharray: st.dash, fill: s.style === "glue" ? "var(--accent)" : "none" };
  const p = s.points;
  const label = (x: number, y: number) =>
    s.label ? <text x={x} y={y} fontSize={3.5} fill="var(--foreground)" textAnchor="middle">{s.label}</text> : null;
  switch (s.kind) {
    case "line":
      return <g><line x1={p[0]} y1={p[1]} x2={p[2]} y2={p[3]} {...common} />{label(((p[0] ?? 0) + (p[2] ?? 0)) / 2, ((p[1] ?? 0) + (p[3] ?? 0)) / 2 - 1.5)}</g>;
    case "rect":
      return <g><rect x={p[0]} y={p[1]} width={Math.abs(p[2] ?? 0)} height={Math.abs(p[3] ?? 0)} {...common} />{label((p[0] ?? 0) + (p[2] ?? 0) / 2, (p[1] ?? 0) + (p[3] ?? 0) / 2)}</g>;
    case "circle":
      return <g><circle cx={p[0]} cy={p[1]} r={Math.abs(p[2] ?? 0)} {...common} />{label(p[0] ?? 0, p[1] ?? 0)}</g>;
    case "polyline":
    case "polygon": {
      const pts = [];
      for (let i = 0; i + 1 < p.length; i += 2) pts.push(`${p[i]},${p[i + 1]}`);
      const El = s.kind;
      return <g><El points={pts.join(" ")} {...common} />{label(p[0] ?? 0, (p[1] ?? 0) - 1.5)}</g>;
    }
    case "text":
      return <text x={p[0]} y={p[1]} fontSize={4} fill="var(--foreground)">{s.label}</text>;
    case "dim": {
      const [x1 = 0, y1 = 0, x2 = 0, y2 = 0] = p;
      return (
        <g stroke="var(--primary)" strokeWidth={0.3}>
          <line x1={x1} y1={y1} x2={x2} y2={y2} markerStart="url(#arr)" markerEnd="url(#arr)" />
          <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 1.2} fontSize={3.2} fill="var(--primary)" stroke="none" textAnchor="middle">{s.label}</text>
        </g>
      );
    }
  }
}

function DiagramSvg({ d, print = false }: { d: Diagram; print?: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${d.width} ${d.height}`}
      width={print ? `${d.width}mm` : "100%"}
      height={print ? `${d.height}mm` : undefined}
      className="bg-card"
    >
      <defs>
        <marker id="arr" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="3" markerHeight="3" orient="auto-start-reverse">
          <path d="M0,0 L6,3 L0,6 z" fill="var(--primary)" />
        </marker>
      </defs>
      {d.shapes.map((s, i) => <Shape key={i} s={s} />)}
    </svg>
  );
}

export function DiagramCard({ input }: { input: unknown }) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  let d: Diagram;
  try { d = sanitizeDiagram(input as Diagram); } catch { return null; }

  const svgText = () => {
    const el = ref.current?.querySelector("svg");
    if (!el) return "";
    const clone = el.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("width", `${d.width}mm`);
    clone.setAttribute("height", `${d.height}mm`);
    const css = getComputedStyle(document.documentElement);
    return clone.outerHTML.replace(/var\(--([a-z-]+)\)/g, (_, v) => css.getPropertyValue(`--${v}`).trim() || "#333");
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([svgText()], { type: "image/svg+xml" }));
    const a = document.createElement("a");
    a.href = url; a.download = `${d.title}.svg`; a.click();
    URL.revokeObjectURL(url);
  };
  const print = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!doctype html><title>${d.title}</title><style>@page{margin:0}body{margin:0}</style>${svgText()}`);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div className="my-2 rounded-lg border bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <div className="font-medium">{d.title}</div>
          <div className="text-xs text-muted-foreground">{Math.round(d.width)} × {Math.round(d.height)} 毫米 · 可 1:1 打印</div>
        </div>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" aria-label="放大查看" onClick={() => setOpen(true)}><Maximize2 className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" aria-label="下载图纸" onClick={download}><Download className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" aria-label="打印图纸" onClick={print}><Printer className="h-4 w-4" /></Button>
        </div>
      </div>
      <div ref={ref} className="overflow-hidden rounded border"><DiagramSvg d={d} /></div>
      {d.notes.length > 0 && (
        <ul className="mt-2 list-disc pl-5 text-xs text-muted-foreground">{d.notes.map((n) => <li key={n}>{n}</li>)}</ul>
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-6" onClick={() => setOpen(false)}>
          <div className="max-h-full w-full max-w-4xl overflow-auto rounded-lg bg-card p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium">{d.title}</span>
              <Button size="icon" variant="ghost" aria-label="关闭" onClick={() => setOpen(false)}><X className="h-4 w-4" /></Button>
            </div>
            <DiagramSvg d={d} />
          </div>
        </div>
      )}
    </div>
  );
}
