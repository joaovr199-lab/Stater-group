/**
 * Conteúdo editorial da reportagem "Radar Logístico".
 *
 * REGRA: nenhum número entra no texto sem uma fonte nesta lista.
 * `status`:
 *   - "conferido": lido na página original da fonte em `checkedAt`.
 *   - "a_confirmar": obtido via resultado de busca citando a fonte; a página
 *     original não pôde ser aberta no ambiente de desenvolvimento. A equipe
 *     editorial deve conferir na fonte primária antes da publicação.
 * Para trocar um dado, altere aqui: o texto e as notas de rodapé são gerados
 * a partir desta lista.
 */

export type Source = {
  id: string;
  publisher: string;
  title: string;
  url: string;
  published: string; // data de publicação informada pela fonte
  checkedAt: string;
  status: "conferido" | "a_confirmar";
};

export const SOURCES: Source[] = [
  {
    id: "jll-4t25",
    publisher: "JLL",
    title: "Mercado de galpões logísticos registra recorde histórico de quase 3 milhões de m² em novo estoque | 4T 2025",
    url: "https://www.jll.com/en-us/insights/market-dynamics/mercado-galpoes-melhor-desempenho-historico-ano-4t2024",
    published: "10/02/2026",
    checkedAt: "25/11/2026",
    status: "conferido",
  },
  {
    id: "jll-1t26",
    publisher: "JLL",
    title: "Mercado de galpões logísticos atinge a menor taxa de vacância da história | 1T 2026",
    url: "https://www.jll.com/en-us/insights/market-dynamics/mercado-de-galpoes-logisticos-atinge-a-menor-taxa-de-vacancia",
    published: "04/05/2026",
    checkedAt: "25/11/2026",
    status: "conferido",
  },
  {
    id: "spaf-2024",
    publisher: "NSC Total, com dados da Secretaria de Portos, Aeroportos e Ferrovias de SC",
    title: "Com liderança de terminal do litoral Norte, setor portuário de SC cresce em ano difícil",
    url: "https://www.nsctotal.com.br/?p=7408643",
    published: "jan/2025",
    checkedAt: "25/11/2026",
    status: "a_confirmar",
  },
  {
    id: "fiesc-antaq",
    publisher: "FIESC, com dados da ANTAQ",
    title: "Agenda Portos 2026",
    url: "https://fiesc.com.br/sites/default/files/2026-06/AGENDA%20PORTOS%202026.pdf",
    published: "jun/2026",
    checkedAt: "25/11/2026",
    status: "a_confirmar",
  },
  {
    id: "itapoa-1s24",
    publisher: "Port Technology International",
    title: "Porto Itapoá enjoys historic first half of 2024",
    url: "https://porttechnology.org/news/porto-itapoa-enjoys-historic-first-half-of-2024",
    published: "jul/2024",
    checkedAt: "25/11/2026",
    status: "a_confirmar",
  },
  {
    id: "ibge-garuva",
    publisher: "IBGE",
    title: "Cidades e Estados — Garuva (SC), Censo Demográfico 2022 e 2010",
    url: "https://www.ibge.gov.br/cidades-e-estados/sc/garuva.html",
    published: "Censo 2022 (divulgado em 2023)",
    checkedAt: "25/11/2026",
    status: "a_confirmar",
  },
  {
    id: "gazeta-garuva",
    publisher: "Gazeta do Povo",
    title: "Garuva vira rota de investidores imobiliários",
    url: "https://www.gazetadopovo.com.br/santa-catarina/garuva-rota-investidores-imobiliarios-crescimento/",
    published: "2026",
    checkedAt: "25/11/2026",
    status: "a_confirmar",
  },
  {
    id: "br376",
    publisher: "Doutor Multas",
    title: "BR-376/PR – BR-101/SC",
    url: "https://doutormultas.com.br/br-376-pr-br-101-sc/",
    published: "s/d",
    checkedAt: "25/11/2026",
    status: "a_confirmar",
  },
  {
    id: "nsc-garuva-infra",
    publisher: "NSC Total",
    title: "Cidade que mais cresce em SC vive salto de infraestrutura com grandes obras simultâneas",
    url: "https://www.nsctotal.com.br/?p=7856214",
    published: "2026",
    checkedAt: "25/11/2026",
    status: "a_confirmar",
  },
];

export const src = (id: string) => SOURCES.findIndex((s) => s.id === id) + 1;

export type Stat = { value: string; label: string; source: string };

export const ARTICLE = {
  kicker: "Radar Logístico · Especial",
  title: "O próximo movimento do mercado imobiliário pode estar na logística.",
  subtitle:
    "Descubra como o mercado logístico brasileiro está evoluindo, por que Santa Catarina merece atenção e quais oportunidades estão surgindo em Garuva.",
  byline: "Conteúdo editorial Stater Group",
  date: "Novembro de 2026",
  readingTime: "Leitura de 6 minutos",

  brasil: {
    title: "Brasil: o galpão virou ativo disputado",
    paragraphs: [
      "Durante muito tempo, o galpão foi tratado como o primo pobre do mercado imobiliário. Os números recentes contam outra história. Ao fim de 2025, a taxa de vacância nacional dos galpões logísticos de alto padrão chegou a 7,7%, o menor índice da série histórica acompanhada pela consultoria JLL.",
      "Menos espaço vago não veio de falta de oferta. No mesmo ano, o país registrou recorde de quase 3 milhões de m² de novo estoque, distribuídos em 81 empreendimentos em 19 estados. Mesmo com essa entrega, o preço médio pedido subiu: R$ 30,7 por metro quadrado, alta de 7,8% em um ano.",
    ],
    stats: [
      { value: "7,7%", label: "vacância nacional de galpões de alto padrão no 4º trimestre de 2025, a menor da série", source: "jll-4t25" },
      { value: "≈3 mi m²", label: "de novo estoque entregue em 2025, recorde, em 81 empreendimentos e 19 estados", source: "jll-4t25" },
      { value: "R$ 30,7/m²", label: "preço médio pedido no 4º trimestre de 2025, alta de 7,8% em 12 meses", source: "jll-4t25" },
    ] as Stat[],
  },

  infra: {
    title: "A infraestrutura logística segue em expansão",
    paragraphs: [
      "O movimento continuou em 2026. No primeiro trimestre, a vacância caiu para 6,5%, de novo o menor valor já registrado, e a absorção líquida somou 1,1 milhão de m², o maior volume já medido para o período.",
      "O mercado também se antecipa: dos 3 milhões de m² previstos para entrar em operação até dezembro de 2026 em todo o país, 35% já estavam pré-locados no levantamento. Quando inquilinos fecham contrato antes de o prédio ficar pronto, o sinal é de demanda que não cabe no estoque existente.",
    ],
    stats: [
      { value: "6,5%", label: "vacância no 1º trimestre de 2026, novo piso histórico", source: "jll-1t26" },
      { value: "1,1 mi m²", label: "de absorção líquida no 1º trimestre de 2026, maior volume para o período", source: "jll-1t26" },
      { value: "35%", label: "dos 3 milhões de m² previstos até dez/2026 já pré-locados", source: "jll-1t26" },
    ] as Stat[],
  },

  sc: {
    title: "Santa Catarina entrou no mapa",
    paragraphs: [
      "São Paulo continua concentrando a maior parte da atividade, mas o segundo lugar diz muito sobre onde a demanda está se espalhando. No primeiro trimestre de 2026, Santa Catarina foi o segundo estado com maior absorção bruta de galpões de alto padrão no país: 106 mil m², atrás apenas de São Paulo, com 549 mil m², e à frente do Espírito Santo.",
      "Para um estado com uma fração da área e da população paulistas, a posição chama atenção. Parte da explicação está no litoral.",
    ],
    stats: [
      { value: "2º", label: "lugar nacional em absorção bruta de galpões no 1º trimestre de 2026", source: "jll-1t26" },
      { value: "106 mil m²", label: "absorvidos em Santa Catarina no trimestre (SP: 549 mil m²)", source: "jll-1t26" },
    ] as Stat[],
  },

  portos: {
    title: "Portos e corredores: a costa que movimenta o estado",
    paragraphs: [
      "Santa Catarina concentra cinco portos ao longo de sua costa: Itapoá, São Francisco do Sul, Itajaí, Navegantes e Imbituba. Segundo a Secretaria de Portos, Aeroportos e Ferrovias do estado, os portos catarinenses movimentaram 63,5 milhões de toneladas em 2024, alta de 2,98% sobre 2023.",
      "Em contêineres, o peso é ainda maior. Levantamento da FIESC com dados da ANTAQ aponta 2,6 milhões de TEUs movimentados em 2024 pelos terminais catarinenses. No litoral norte, o Porto Itapoá registrou 597.338 TEUs só no primeiro semestre de 2024, 12% acima do mesmo período do ano anterior.",
      "Porto sem retaguarda não funciona. Cada contêiner que entra ou sai precisa de armazenagem, triagem e distribuição em terra, e é nessa faixa entre o cais e a rodovia que a demanda por áreas logísticas se forma.",
    ],
    stats: [
      { value: "63,5 mi t", label: "movimentadas pelos portos de SC em 2024 (+2,98%)", source: "spaf-2024" },
      { value: "2,6 mi TEUs", label: "em contêineres pelos terminais catarinenses em 2024", source: "fiesc-antaq" },
      { value: "597 mil TEUs", label: "no Porto Itapoá no 1º semestre de 2024 (+12%)", source: "itapoa-1s24" },
    ] as Stat[],
  },

  garuva: {
    title: "Garuva: onde o Paraná encontra o litoral norte catarinense",
    paragraphs: [
      "Garuva fica na divisa entre Santa Catarina e o Paraná. O município é cortado pela BR-101 e pelas rodovias estaduais SC-417 e SC-416, e é ali que a BR-376, vinda de Curitiba, chega ao litoral e encontra a BR-101.",
      "A partir da BR-101, uma rota de cerca de 40 km leva à área portuária de Itapoá, onde opera o Porto Itapoá. Joinville fica ao sul, pela mesma rodovia.",
      "A cidade também cresce. O Censo do IBGE registrou 18.545 habitantes em 2022, ante 14.761 em 2010, um aumento de cerca de 25,6% em doze anos.",
    ],
    stats: [
      { value: "BR-101 × BR-376", label: "a BR-376, vinda de Curitiba, termina em Garuva no encontro com a BR-101", source: "br376" },
      { value: "≈40 km", label: "de rota entre a BR-101 e a área portuária de Itapoá", source: "nsc-garuva-infra" },
      { value: "+25,6%", label: "de população entre os Censos de 2010 e 2022 (14.761 → 18.545)", source: "ibge-garuva" },
    ] as Stat[],
  },

  prolog: {
    title: "PROLOG: uma área logística em Garuva",
    lead:
      "É nesse contexto que se insere o PROLOG, empreendimento logístico em Garuva/SC estruturado pela Stater Group.",
    facts: [
      { k: "Localização", v: "Garuva, Santa Catarina" },
      { k: "Área", v: "113.749 m²" },
      { k: "Estrutura", v: "Sociedade Anônima de capital fechado" },
      { k: "Participação", v: "Por aquisição de ações" },
      { k: "Condições", v: "Apresentadas individualmente" },
    ],
    paragraphs: [
      "A participação no PROLOG é feita por meio da aquisição de ações de uma sociedade anônima de capital fechado. As condições comerciais, a documentação e os riscos são apresentados individualmente, em conversa com a equipe responsável.",
    ],
  },

  convite: {
    title: "Conheça a oportunidade em detalhes",
    text: "Se o contexto fez sentido para você, o próximo passo é uma conversa. Deixe seu contato e um especialista apresenta o PROLOG, a estrutura societária e as condições, sem compromisso.",
    cta: "Quero conhecer o investimento",
  },

  disclaimer:
    "Conteúdo de caráter exclusivamente informativo. Não constitui oferta pública de valores mobiliários, recomendação de investimento nem promessa de rentabilidade, valorização ou liquidez. Dados de mercado refletem as fontes citadas nas datas indicadas e não garantem resultados futuros. Investimentos em participações societárias envolvem riscos, inclusive de perda do capital investido e de baixa liquidez. Antes de decidir, leia toda a documentação e, se necessário, consulte assessores de sua confiança.",
};
