export const STAGES = [
  { id: "novo", label: "Novo lead" },
  { id: "primeiro_contato", label: "Primeiro contato" },
  { id: "em_qualificacao", label: "Em qualificação" },
  { id: "interessado", label: "Interessado" },
  { id: "reuniao_agendada", label: "Reunião agendada" },
  { id: "reuniao_realizada", label: "Reunião realizada" },
  { id: "em_negociacao", label: "Em negociação" },
  { id: "convertido", label: "Convertido" },
  { id: "perdido", label: "Perdido" },
] as const;

export type Stage = (typeof STAGES)[number]["id"];
export const STAGE_IDS = STAGES.map((s) => s.id) as Stage[];
export const stageLabel = (s: string) => STAGES.find((x) => x.id === s)?.label ?? s;

export const CLASS_LABEL: Record<string, string> = {
  exploratorio: "Exploratório",
  interessado: "Interessado",
  alta_intencao: "Alta intenção",
};

export const EVENTS = [
  "page_view",
  "brasil_view",
  "santa_catarina_view",
  "garuva_view",
  "prolog_view",
  "cta_click",
  "lead_form_start",
  "lead_submit",
  "whatsapp_click",
  "meeting_scheduled",
] as const;
export type EventName = (typeof EVENTS)[number];

/** Eventos que o navegador pode enviar (os demais são gerados pelo servidor). */
export const CLIENT_EVENTS: EventName[] = [
  "page_view",
  "brasil_view",
  "santa_catarina_view",
  "garuva_view",
  "prolog_view",
  "cta_click",
  "lead_form_start",
  "whatsapp_click",
];

/** "Eventos de interesse": sinais explícitos de intenção. */
export const INTEREST_EVENTS: EventName[] = ["prolog_view", "cta_click", "lead_form_start", "whatsapp_click"];

export const EVENT_LABEL: Record<string, string> = {
  page_view: "Acessou a reportagem",
  brasil_view: "Leu: Brasil e logística",
  santa_catarina_view: "Leu: Santa Catarina",
  garuva_view: "Leu: Garuva",
  prolog_view: "Visualizou PROLOG",
  cta_click: "Clicou no CTA",
  lead_form_start: "Iniciou o cadastro",
  lead_submit: "Enviou o cadastro",
  whatsapp_click: "Clicou no WhatsApp",
  meeting_scheduled: "Reunião agendada",
};

export const INTERESTS = [
  "Conhecer o investimento PROLOG",
  "Entender o mercado logístico",
  "Receber material da oportunidade",
  "Agendar uma conversa",
];

export const HISTORY_KIND: Record<string, string> = {
  stage: "Etapa",
  note: "Observação",
  call: "Ligação",
  whatsapp: "WhatsApp",
  email: "E-mail",
  meeting: "Reunião",
  system: "Sistema",
};
