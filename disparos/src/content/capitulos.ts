import { ARTICLE, type Stat } from "./radar";

export type PageId = "brasil" | "sc" | "garuva";
export const PAGES: PageId[] = ["brasil", "sc", "garuva"];

type Block = { title: string; paragraphs: { text: string; cite: string[] }[]; stats: Stat[] };

export type Chapter = {
  id: PageId;
  n: number;
  label: string;
  title: string;
  dek: string;
  blocks: Block[];
  next?: { id: PageId; teaser: string };
  prolog?: boolean;
};

const a = ARTICLE;

export const CHAPTERS: Record<PageId, Chapter> = {
  brasil: {
    id: "brasil",
    n: 1,
    label: "Setor logístico no Brasil",
    title: "O galpão logístico virou um dos ativos mais disputados do país.",
    dek: "Vacância na mínima histórica, recorde de novas entregas e aluguel em alta. O que os números de 2025 e 2026 mostram sobre o mercado.",
    blocks: [
      { title: a.brasil.title, paragraphs: a.brasil.paragraphs.map((t) => ({ text: t, cite: ["jll-4t25"] })), stats: a.brasil.stats },
      { title: a.infra.title, paragraphs: a.infra.paragraphs.map((t) => ({ text: t, cite: ["jll-1t26"] })), stats: a.infra.stats },
    ],
    next: { id: "sc", teaser: "No próximo capítulo: por que Santa Catarina virou o 2º estado do país em absorção de galpões." },
  },
  sc: {
    id: "sc",
    n: 2,
    label: "Santa Catarina",
    title: "Santa Catarina entrou no mapa da logística brasileira.",
    dek: "Segundo lugar nacional em absorção de galpões e cinco portos na costa. Como o estado passou a disputar espaço com São Paulo.",
    blocks: [
      { title: a.sc.title, paragraphs: a.sc.paragraphs.map((t, i) => ({ text: t, cite: i === 0 ? ["jll-1t26"] : [] })), stats: a.sc.stats },
      {
        title: a.portos.title,
        paragraphs: [
          { text: a.portos.paragraphs[0], cite: ["spaf-2024"] },
          { text: a.portos.paragraphs[1], cite: ["fiesc-antaq", "itapoa-1s24"] },
          { text: a.portos.paragraphs[2], cite: [] },
        ],
        stats: a.portos.stats,
      },
    ],
    next: { id: "garuva", teaser: "No último capítulo: Garuva, o ponto onde a BR-376 encontra a BR-101, e a oportunidade que está surgindo ali." },
  },
  garuva: {
    id: "garuva",
    n: 3,
    label: "Garuva",
    title: "Garuva: onde o Paraná encontra o litoral norte catarinense.",
    dek: "Entroncamento rodoviário, porto a cerca de 40 km e população em crescimento. E uma área logística de 113.749 m².",
    blocks: [
      {
        title: "Uma posição difícil de repetir",
        paragraphs: [
          { text: a.garuva.paragraphs[0], cite: ["gazeta-garuva", "br376"] },
          { text: a.garuva.paragraphs[1], cite: ["nsc-garuva-infra"] },
          { text: a.garuva.paragraphs[2], cite: ["ibge-garuva"] },
        ],
        stats: a.garuva.stats,
      },
    ],
    prolog: true,
  },
};

export const isPage = (p: string): p is PageId => (PAGES as string[]).includes(p);
