import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Logo oficial STATER GROUP. Coloque o arquivo em public/brand/stater-group.png
 * (fundo preto, como fornecido). Enquanto o arquivo não existir, exibe um
 * wordmark tipográfico nas cores da marca. Use sempre sobre fundo preto.
 */
const FILE = ["stater-group.svg", "stater-group.png", "stater-group.webp"].find((f) =>
  existsSync(join(process.cwd(), "public", "brand", f))
);

export function Logo({ height = 22, className = "" }: { height?: number; className?: string }) {
  if (FILE)
    // eslint-disable-next-line @next/next/no-img-element
    // A arte tem margem preta; a altura é ajustada para a letra ter o mesmo tamanho visual do parâmetro.
    return <img src={`/brand/${FILE}`} alt="Stater Group" style={{ height: Math.round(height * 1.35) }} className={`block w-auto ${className}`} />;
  return (
    <span className={`inline-flex items-center gap-[0.35em] leading-none text-brand ${className}`} style={{ fontSize: height }} aria-label="Stater Group" role="img">
      <svg viewBox="0 0 20 20" style={{ height: "1em", width: "1em" }} aria-hidden fill="currentColor">
        <path d="M3 2h11c2 0 3.5 1 3.5 2.6 0 1-.6 1.7-1.6 2.1l-3.2-1.6c.5-.2.7-.4.7-.7 0-.4-.4-.6-1-.6H4.5L3 2Zm14 16H6c-2 0-3.5-1-3.5-2.6 0-1 .6-1.7 1.6-2.1l3.2 1.6c-.5.2-.7.4-.7.7 0 .4.4.6 1 .6h7.9L17 18ZM2.5 8.3l6.3 3.1 3-1.5-6.4-3.2-2.9 1.6Zm15 3.4-6.3-3.1-3 1.5 6.4 3.2 2.9-1.6Z" />
      </svg>
      <span className="font-display font-semibold tracking-[0.02em]">STATER</span>
      <span className="font-display font-light tracking-[0.02em]">GROUP</span>
    </span>
  );
}
