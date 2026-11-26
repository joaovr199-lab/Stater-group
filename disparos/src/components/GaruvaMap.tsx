/** Esquema ilustrativo (sem escala) dos eixos citados na reportagem. */
export function GaruvaMap({ refs }: { refs: string }) {
  return (
    <figure className="my-10">
      <svg viewBox="0 0 640 420" className="w-full rounded-2xl bg-black" role="img" aria-labelledby="map-title map-desc">
        <title id="map-title">Esquema de localização de Garuva</title>
        <desc id="map-desc">Garuva no encontro da BR-376, vinda de Curitiba, com a BR-101; a leste, Itapoá e seu porto; ao sul, Joinville; ao norte, a divisa com o Paraná.</desc>
        <defs>
          <pattern id="sea" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#b9a27a" strokeOpacity="0.12" strokeWidth="2" />
          </pattern>
        </defs>
        <path d="M520 0 C 500 90, 560 150, 540 230 S 560 360, 600 420 L 640 420 L 640 0 Z" fill="url(#sea)" />
        <text x="590" y="60" fill="#b9a27a" fillOpacity="0.6" fontSize="12" letterSpacing="3" textAnchor="middle">OCEANO</text>
        <line x1="0" y1="92" x2="640" y2="92" stroke="#ffffff" strokeOpacity="0.25" strokeDasharray="4 6" />
        <text x="18" y="80" fill="#ffffff" fillOpacity="0.55" fontSize="12" letterSpacing="2">PARANÁ</text>
        <text x="18" y="114" fill="#ffffff" fillOpacity="0.55" fontSize="12" letterSpacing="2">SANTA CATARINA</text>
        {/* BR-376 */}
        <path d="M40 40 C 140 70, 220 150, 300 190" fill="none" stroke="#ffffff" strokeOpacity="0.75" strokeWidth="3" />
        <text x="96" y="44" fill="#fff" fontSize="13" fontWeight="600">BR-376 · Curitiba</text>
        {/* BR-101 */}
        <path d="M330 10 C 320 100, 305 150, 300 190 S 290 330, 270 410" fill="none" stroke="#ffffff" strokeOpacity="0.75" strokeWidth="3" />
        <text x="340" y="30" fill="#fff" fontSize="13" fontWeight="600">BR-101</text>
        {/* Acesso a Itapoá */}
        <path d="M302 200 C 380 215, 440 205, 505 185" fill="none" stroke="#b9a27a" strokeWidth="3" strokeDasharray="7 5" />
        <text x="372" y="232" fill="#b9a27a" fontSize="12">rota de ≈40 km até a área portuária</text>
        <circle cx="505" cy="185" r="7" fill="#b9a27a" />
        <text x="498" y="166" fill="#fff" fontSize="14" fontWeight="600" textAnchor="end">Itapoá · porto</text>
        <circle cx="282" cy="388" r="6" fill="#fff" />
        <text x="296" y="392" fill="#fff" fontSize="14">Joinville</text>
        <circle cx="300" cy="190" r="16" fill="#b9a27a" fillOpacity="0.2" />
        <circle cx="300" cy="190" r="8" fill="#b9a27a" />
        <text x="284" y="226" fill="#fff" fontSize="18" fontWeight="700" textAnchor="end">Garuva</text>
      </svg>
      <figcaption className="mt-2 text-xs text-muted">Esquema ilustrativo, sem escala, elaborado a partir das fontes {refs}. Não representa traçados exatos.</figcaption>
    </figure>
  );
}
