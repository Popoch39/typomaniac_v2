import type { Ornament } from "@repo/ranked-engine";
import { cn } from "../../../shared/lib/utils.ts";
import type { OrnamentDetail } from "../art/ornamentDrawing.ts";
import { useOrnamentDrawing } from "../hooks/useOrnamentDrawing.ts";

interface OrnamentArtProps {
  ornament: NonNullable<Ornament>;
  detail: OrnamentDetail;
}

// Decorative: the Nickname and the Rank next to it say in text what the Ornament draws.
export function OrnamentArt({ ornament, detail }: OrnamentArtProps) {
  const { tierClassName, layers, numeral } = useOrnamentDrawing(ornament, detail);

  return (
    <svg
      viewBox="0 0 64 76"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
      className={cn("absolute inset-0 size-full", tierClassName)}
    >
      {layers.map(({ className, d }) => (
        <path key={d} className={className} d={d} />
      ))}
      {numeral && (
        <text
          x="32"
          y="63.9"
          textAnchor="middle"
          dominantBaseline="central"
          className={cn("font-mono text-[5px] font-bold", numeral.className)}
        >
          {numeral.text}
        </text>
      )}
    </svg>
  );
}
