// Structured diagram spec (client-safe). Agents emit this; the UI renders SVG from it.
// All coordinates are millimetres so the drawing can be printed at 1:1.
import { z } from "zod";

export const diagramShapeSchema = z.object({
  kind: z.enum(["line", "rect", "circle", "polyline", "polygon", "text", "dim"]),
  // line/dim: [x1,y1,x2,y2]; rect: [x,y,w,h]; circle: [cx,cy,r]; polyline/polygon: [x1,y1,x2,y2,...]; text: [x,y]
  points: z.array(z.number()),
  style: z.enum(["cut", "fold", "seam", "glue", "guide"]).nullable(),
  label: z.string().nullable(),
});

export const diagramSchema = z.object({
  title: z.string(),
  width: z.number(), // mm
  height: z.number(), // mm
  shapes: z.array(diagramShapeSchema),
  notes: z.array(z.string()),
});

export type Diagram = z.infer<typeof diagramSchema>;
export type DiagramShape = z.infer<typeof diagramShapeSchema>;

/** Clamp a model-produced diagram into a safe, renderable range. */
export function sanitizeDiagram(d: Diagram): Diagram {
  const clamp = (n: number) => (Number.isFinite(n) ? Math.max(-2000, Math.min(2000, n)) : 0);
  return {
    title: d.title.slice(0, 60),
    width: Math.max(10, Math.min(1000, clamp(d.width))),
    height: Math.max(10, Math.min(1000, clamp(d.height))),
    shapes: d.shapes.slice(0, 200).map((s) => ({
      ...s,
      points: s.points.slice(0, 200).map(clamp),
      label: s.label?.slice(0, 40) ?? null,
    })),
    notes: d.notes.slice(0, 8).map((n) => n.slice(0, 80)),
  };
}

export const diagramSummary = (d: Diagram) => `${d.title}：${Math.round(d.width)}×${Math.round(d.height)} 毫米`;
