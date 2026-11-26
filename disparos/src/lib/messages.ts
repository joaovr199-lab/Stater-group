import type { PageId } from "@/content/capitulos";

/** Textos sugeridos para o disparo. {nome} e {link} são preenchidos por contato. */
export const MESSAGES: Record<PageId, string> = {
  brasil:
    "Olá, {nome}! Preparamos uma série curta sobre o mercado logístico. No capítulo 1: por que o galpão logístico virou um dos ativos mais disputados do Brasil. Leitura de 3 minutos: {link}",
  sc: "{nome}, segue o capítulo 2 do Radar Logístico: como Santa Catarina virou o 2º estado do país em absorção de galpões, com cinco portos na costa. {link}",
  garuva:
    "{nome}, último capítulo do Radar Logístico: Garuva, onde a BR-376 encontra a BR-101, a cerca de 40 km do Porto Itapoá. E a oportunidade que está surgindo ali. {link}",
};

export function fill(page: PageId, name: string, link: string) {
  const first = name.trim().split(/\s+/)[0] ?? "";
  return MESSAGES[page].replace("{nome}", first).replace("{link}", link);
}
