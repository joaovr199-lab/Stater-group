# PROLOG Intelligence · Stater Group

Central de ativação comercial, captação e inteligência de vendas. Uma central da Stater, várias imobiliárias, corretores com links individuais, uma reportagem compartilhada (Radar Logístico), captação centralizada e acompanhamento comercial em tempo real.

## Arquitetura

| Camada | Tecnologia |
|---|---|
| Aplicação | Next.js 15 (App Router, Server Components, Server Actions), TypeScript, Tailwind CSS 4 |
| Banco | PostgreSQL 15+ (compatível com Supabase), migrações SQL em `db/migrations` |
| Segurança de dados | Row Level Security em todas as tabelas, papel `prolog_app` sem BYPASSRLS |
| Autenticação | Login próprio: bcrypt (custo 12), sessão opaca em cookie httpOnly, token armazenado só como SHA-256 |
| Tempo real | PostgreSQL `LISTEN/NOTIFY`, com triggers que alimentam Server-Sent Events (`/api/stream`); fallback de polling de 30 s |
| Medição | Banco próprio (registro comercial) + `dataLayer` para GTM/GA4 com Consent Mode v2 |

```
STATER (stater_admin) ── vê tudo
 └─ Campanha "Radar Logístico" ── campaign_agencies
     └─ Imobiliária (agencies) ── gestor (agency_manager) vê só a sua
         └─ Corretor (broker) ── vê só os próprios leads
             └─ Link /radar?ref=CODIGO + QR Code
                 └─ Visitante pseudônimo → sessões → eventos → lead → pipeline
```

### Isolamento entre imobiliárias

O isolamento é imposto **no PostgreSQL**, não só na interface:

- Cada requisição abre uma transação e injeta `app.user_id`. As políticas usam `app.can_see(agency_id, broker_id)`:
  Stater vê tudo, gestor vê `agency_id` = sua imobiliária e corretor vê `broker_id` = ele mesmo.
- Sem usuário no contexto, nenhuma linha é visível.
- O papel da aplicação não lê `password_hash` (privilégio por coluna).
- Um trigger (`tg_lead_guard`) impede que corretores troquem a imobiliária ou o responsável de um lead, e impede atribuir um corretor de outra imobiliária.
- O rastreamento público (sem login) só grava por meio de funções `SECURITY DEFINER` (`start_session`, `track_event`, `submit_lead`). O papel não tem `INSERT` nas tabelas de rastreamento.

### Fluxo de atribuição

1. `/radar?ref=CODIGO` → `start_session` valida o link (ativo, imobiliária ativa, campanha ativa) e grava um **touch** em `visitor_touches`.
2. A sessão guarda campanha, imobiliária, corretor, origem (`ref` | `herdado` | `direto`), UTMs e referrer. Navegações seguintes sem `ref` herdam a origem.
3. Se o visitante abrir links de corretores diferentes, todos os touches ficam no histórico. A **regra de atribuição** (Configurações) decide o responsável pelo lead: primeiro toque ou último toque, com janela em dias.
4. No cadastro, `submit_lead` cria o lead, associa todos os eventos anteriores do visitante, grava os consentimentos (versão e hash do texto), calcula o score e notifica Stater, gestor e corretor.

### Eventos

`page_view`, `brasil_view`, `santa_catarina_view`, `garuva_view`, `prolog_view`, `cta_click`, `lead_form_start`, `lead_submit`, `whatsapp_click`, `meeting_scheduled`.

- As visualizações de seção disparam quando 35% da seção fica visível. O tempo de permanência visível é enviado ao sair (`sendBeacon`).
- Visualizações e eventos de formulário são únicos por sessão (índice parcial), o que evita duplicação.
- `lead_submit` e `meeting_scheduled` só são gerados pelo servidor.
- **Interesse anônimo**: visitante sem cadastro que visualizou o PROLOG, clicou no CTA ou no WhatsApp, ou iniciou o formulário. Aparece em *Gestão de leads → Interesses anônimos* com um código pseudônimo, nunca como lead.

### Lead scoring

Os pesos e faixas são configuráveis em *Configurações*. Padrão: reportagem 5, Brasil 5, SC 10, Garuva 15, PROLOG 25, CTA 20, cadastro 20. Faixas: 0–29 Exploratório, 30–59 Interessado, 60–100 Alta intenção. Cada tipo de evento pontua uma vez por visitante, e o total é limitado a 100. **O score mede intenção digital, não capacidade financeira.**

### Pipeline

Novo lead → Primeiro contato → Em qualificação → Interessado → Reunião agendada → Reunião realizada → Em negociação → Convertido / Perdido.

- Toda mudança grava responsável, data e hora, observação e etapas de origem e destino (`lead_history`, via trigger).
- Registrar WhatsApp, ligação ou e-mail em um lead "Novo" marca o primeiro atendimento.
- Agendar uma reunião move o lead para "Reunião agendada" e gera `meeting_scheduled`.
- **Alertas**: leads sem atendimento acima de N horas, e leads de alta intenção sem movimentação acima de M horas (configuráveis).

## Como rodar

Requisitos: Node 20+ e PostgreSQL 15+.

```bash
cp .env.example .env.local   # preencha os valores
npm install
npm run db:migrate           # cria schema, RLS, papel prolog_app (com APP_DB_PASSWORD)
ADMIN_EMAIL=voce@stater.com.br ADMIN_NAME="Seu Nome" ADMIN_PASSWORD='senha-forte-12+' npm run admin:create
npm run build && npm start
```

Depois, em `/login`, entre como Stater e siga este caminho:

1. **Campanhas**: a campanha Radar Logístico já existe.
2. **Imobiliárias**: cadastre a imobiliária e o gestor. Uma senha provisória aparece uma única vez.
3. O gestor entra, troca a senha e cadastra os corretores. Cada corretor recebe automaticamente link e QR Code.
4. O corretor compartilha o link pelo WhatsApp ou QR Code.

### Supabase

1. Crie o projeto e rode `npm run db:migrate` com `DATABASE_ADMIN_URL` apontando para a conexão direta do usuário `postgres`.
2. Use `DATABASE_URL` com o usuário `prolog_app`. O pooler na porta 6543 em modo transação funciona, porque o contexto é aplicado com `set_config(..., true)` dentro da transação.
3. `DATABASE_LISTEN_URL` precisa da **conexão direta (porta 5432)**. `LISTEN` não funciona via pooler em modo transação.
4. Defina `DATABASE_SSL=true`.
5. O login é próprio da aplicação (não usa Supabase Auth). Não exponha a `anon key` para estas tabelas: o schema `app` não deve ser publicado na Data API.

### Hospedagem

O tempo real usa uma conexão `LISTEN` persistente por processo e respostas SSE longas. Por isso, prefira um servidor Node contínuo (Railway, Render, Fly.io, VM, container). Em plataformas serverless (por exemplo, Vercel), o SSE é encerrado após o tempo máximo da função e o cliente reconecta automaticamente, com polling de 30 s como reserva.

Agende diariamente a rotina de retenção:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://seu-dominio/api/cron/retention
```

## Integrações que dependem de credenciais

| Integração | Variáveis | Estado sem configuração |
|---|---|---|
| Google Tag Manager | `NEXT_PUBLIC_GTM_ID` | Não carrega. Os eventos continuam no banco próprio |
| GA4 direto (sem GTM) | `NEXT_PUBLIC_GA4_ID` | Não carrega |
| E-mail de novo lead | `RESEND_API_KEY`, `NOTIFY_FROM_EMAIL` | Só notificação interna (sino) |
| Webhook de novo lead (n8n, Make, WhatsApp Business) | `NOTIFY_WEBHOOK_URL`, `NOTIFY_WEBHOOK_SECRET` | Desativado |
| WhatsApp da campanha | *Configurações → Contato* | Botão oculto |

**GTM**: crie no container uma tag GA4 Configuration e tags GA4 Event acionadas por *Custom Event* com os nomes acima. Variáveis de dataLayer disponíveis: `campaign`, `ref_code`, `section`. Nenhum dado pessoal é enviado ao Google. O Consent Mode v2 começa negado e só libera `analytics_storage` após o aceite no banner.

## LGPD e segurança

- **Aviso de Privacidade** em `/privacidade`. Controlador, CNPJ e encarregado (DPO) são preenchidos em *Configurações*. **O texto é um modelo técnico e precisa de revisão jurídica.**
- **Consentimento**: duas caixas obrigatórias (ciência do aviso e autorização de contato), gravadas com versão, hash do texto e hash do IP.
- **Pseudonimização**: o visitante é um UUID aleatório. O IP nunca é gravado em claro.
- **Retenção**: rastros anônimos e leads perdidos inativos, com prazos configuráveis. A rotina pode ser executada no painel ou por cron.
- **Eliminação a pedido do titular**: botão na ficha do lead (somente Stater), que remove nome, telefone, e-mail e anotações.
- **Auditoria**: logins, criação de usuários, alterações de lead, visualizações de ficha, exportações, configurações e operações LGPD.
- **Proteções**: limite de tentativas de login (só falhas contam), limite de envios do formulário, honeypot anti-robô, troca obrigatória da senha provisória, encerramento de outras sessões ao trocar a senha, cabeçalhos de segurança, `no-store` nos painéis.

## Testes

```bash
npm run typecheck && npm run lint && npm run build
npm start &   # em outro terminal
ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run test:e2e
npm run test:cleanup        # remove os dados marcados com [TESTE]
```

`scripts/e2e-acceptance.mjs` executa os 14 critérios de aceitação na interface real (Playwright) e verifica a RLS consultando o banco com o papel da aplicação.

## Conteúdo editorial: checklist antes da publicação

Todos os números da reportagem estão em `src/content/radar.ts`, cada um ligado a uma fonte com data. Nenhum dado foi inventado ou projetado.

| Fonte | Status |
|---|---|
| [1] JLL 4T2025 (10/02/2026): vacância 7,7%, ≈3 mi m² novos, 81 empreendimentos, R$ 30,7/m² | Conferido na página original |
| [2] JLL 1T2026 (04/05/2026): vacância 6,5%, absorção 1,1 mi m², SC 106 mil m² (2º), 35% pré-locado | Conferido na página original |
| [3] SPAF/NSC: portos de SC, 63,5 mi t em 2024 (+2,98%) | **A confirmar na fonte primária** |
| [4] FIESC/ANTAQ: 2,6 mi TEUs em SC em 2024 | **A confirmar** |
| [5] Port Technology: Itapoá 597.338 TEUs no 1S2024 (+12%) | **A confirmar** |
| [6] IBGE: Garuva 18.545 hab. (2022) e 14.761 (2010) | **A confirmar** |
| [7] Gazeta do Povo: Garuva cortada pela BR-101, SC-417 e SC-416 | **A confirmar** |
| [8] Doutor Multas: BR-376 termina em Garuva (BR-101) | **A confirmar; trocar por fonte oficial (DNIT)** |
| [9] NSC: rota de ≈40 km da BR-101 à área portuária de Itapoá | **A confirmar** |

Os itens "a confirmar" vieram de resultados de busca que citam essas fontes. As páginas originais estavam bloqueadas pela rede do ambiente de desenvolvimento.

O aviso legal no fim da reportagem afirma que o conteúdo não é oferta pública nem promessa de rentabilidade, valorização ou liquidez. Como a participação é por aquisição de ações de S.A. fechada, **recomenda-se validar com o jurídico o enquadramento da oferta perante a CVM** antes de distribuir os links em escala.

## Logo

O logo oficial está em `public/brand/stater-group.png` (recortado da arte enviada, fundo preto) e aparece no topo da reportagem, no rodapé, no login e no menu dos painéis. O ícone da aba (`src/app/icon.png`) usa o símbolo "S". Para trocar, substitua o arquivo (também aceita `.svg`/`.webp`) e reinicie o servidor.
