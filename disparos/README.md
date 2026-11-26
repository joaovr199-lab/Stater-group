# Radar Logístico · Disparos

Três capítulos para enviar pelo WhatsApp e um painel que mostra **quem abriu cada link**, quanto tempo leu, até onde rolou a página e quem clicou em "Tenho interesse".

| Capítulo | Link geral | Link pessoal |
|---|---|---|
| 1. Setor logístico no Brasil | `/brasil` | `/brasil/CODIGO` |
| 2. Santa Catarina | `/sc` | `/sc/CODIGO` |
| 3. Garuva + PROLOG | `/garuva` | `/garuva/CODIGO` |

- **Link pessoal**: cada contato importado recebe um código, e o painel mostra o nome de quem abriu.
- **Link geral**: para grupos, status e redes sociais. Conta as aberturas sem identificar a pessoa. Se ela clicar em "Tenho interesse", informa nome e WhatsApp e passa a aparecer no painel.
- A pré-visualização que o WhatsApp gera ao colar o link **não** conta como clique. Só conta a abertura real no navegador.

## Como usar

1. Acesse `/entrar` com a senha do painel.
2. Em **Contatos e links**, cole sua lista da planilha (`nome; telefone; etiqueta`).
3. Clique em **Baixar planilha de disparo**. Ela traz, para cada contato, os 3 links pessoais e a mensagem pronta de cada capítulo.
4. Dispare o capítulo 1. Nos dias seguintes, dispare o 2 e depois o 3.
5. Acompanhe em **Quem clicou**. A página se atualiza sozinha a cada 20 segundos e permite filtrar quentes, interessados e quem ainda não abriu.

## Colocar no ar (Railway, cerca de 10 minutos)

1. Crie uma conta em https://railway.com e entre com o GitHub.
2. **New Project → Deploy from GitHub repo** e escolha `Stater-group`.
3. No serviço criado, abra **Settings → Source**, defina **Root Directory** como `disparos` e a branch como `radar-disparos` (ou `main`, depois do merge).
4. No projeto, clique em **+ New → Database → PostgreSQL**.
5. No serviço do site, abra **Variables** e adicione:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (o Railway sugere automaticamente)
   - `ADMIN_PASSWORD` = uma senha forte
   - `APP_URL` = o endereço gerado em **Settings → Networking → Generate Domain** (ex.: `https://radar-xxxx.up.railway.app`)
   - `WHATSAPP_NUMBER` (opcional) = WhatsApp da Stater, ex.: `5547999999999`
6. Pronto. As tabelas do banco são criadas sozinhas no primeiro acesso.

Para usar um domínio próprio (ex.: `radar.statergroup.com.br`), adicione-o em **Settings → Networking → Custom Domain** e atualize `APP_URL`.

## Desenvolvimento

```bash
cp .env.example .env.local   # preencha
npm install
npm run dev
```

Teste ponta a ponta, com o servidor rodando:

```bash
APP_URL=http://localhost:3000 ADMIN_PASSWORD=... DATABASE_URL=... node scripts/e2e.mjs
```

## Conteúdo e privacidade

- Os textos e as fontes estão em `src/content/radar.ts` (dados com fonte e data). As mensagens de disparo estão em `src/lib/messages.ts`.
- Antes de disparar, confira na fonte original os dados marcados "a confirmar" no README da raiz do projeto PROLOG Intelligence.
- O rodapé de cada capítulo avisa que a abertura do link é registrada, e `/privacidade` traz o aviso completo. Revise esse texto com o jurídico e inclua a razão social e o contato do encarregado (DPO).
- Envie os links apenas para contatos com quem a Stater tem relacionamento e respeite pedidos de descadastro.
