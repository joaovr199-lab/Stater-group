import type { Metadata } from "next";
import Link from "next/link";
import { publicTx } from "@/lib/db";
import { getPublicSettings } from "@/lib/queries";
import { CONSENT_CONTACT, CONSENT_PRIVACY, NOTICE_VERSION } from "@/lib/privacy-text";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Aviso de Privacidade", robots: { index: true, follow: true } };

const pending = <span className="rounded bg-warn-soft px-1.5 text-warn">[a configurar]</span>;

export default async function Privacidade() {
  const { privacy: p } = await publicTx((c) => getPublicSettings(c));
  return (
    <div className="min-h-screen bg-paper">
      <header className="bg-black">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Logo height={16} />
          <Link href="/radar" className="text-xs text-white/60 hover:text-white">← Voltar à reportagem</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-12 text-[0.95rem] leading-relaxed text-ink-2 [&_h2]:mb-2 [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-3">
        <h1 className="font-display text-4xl text-ink">Aviso de Privacidade</h1>
        <p className="mt-2 text-sm text-muted">Campanha Radar Logístico · versão {p.notice_version || NOTICE_VERSION}</p>

        <h2>1. Quem trata seus dados</h2>
        <p>
          Controladora: <strong>{p.controller_name || pending}</strong>
          {p.controller_cnpj ? `, CNPJ ${p.controller_cnpj}` : ""} (“Stater Group”). As imobiliárias parceiras e seus corretores atuam no atendimento comercial
          da campanha e acessam apenas os contatos vinculados ao próprio link.
        </p>
        <p>Encarregado pelo tratamento de dados (DPO): {p.dpo_name || pending} · {p.dpo_email ? <a className="underline" href={`mailto:${p.dpo_email}`}>{p.dpo_email}</a> : pending}</p>

        <h2>2. Quais dados coletamos</h2>
        <ul>
          <li><strong>Navegação pseudônima:</strong> um identificador aleatório de visitante e de sessão (cookies próprios <code>pi_vid</code> e <code>pi_sid</code>), o link de origem (código do corretor), as seções da reportagem visualizadas, cliques e tempo de leitura, tipo de dispositivo e página de referência. O endereço IP não é armazenado; guardamos apenas um resumo criptográfico (hash) para segurança e prevenção de abuso.</li>
          <li><strong>Cadastro:</strong> nome, WhatsApp, e-mail (opcional) e interesse principal, informados por você no formulário.</li>
          <li><strong>Medição (opcional):</strong> Google Analytics / Google Tag Manager, somente se você aceitar os cookies de medição.</li>
        </ul>

        <h2>3. Para que usamos</h2>
        <ul>
          <li>Identificar qual imobiliária e qual corretor indicaram a reportagem, para atribuir corretamente o atendimento (legítimo interesse).</li>
          <li>Entrar em contato para apresentar a oportunidade PROLOG, quando você autoriza (consentimento).</li>
          <li>Medir o desempenho da campanha de forma agregada e melhorar o conteúdo.</li>
          <li>Cumprir obrigações legais e garantir a segurança do sistema.</li>
        </ul>
        <p>
          Antes do cadastro, os registros de navegação não identificam você. Ao enviar o formulário, os eventos da mesma sessão e do mesmo navegador são associados
          ao seu cadastro para que o atendimento conheça os temas que você leu. O <em>score</em> resultante mede apenas o engajamento com o conteúdo, nunca capacidade financeira.
        </p>

        <h2>4. Com quem compartilhamos</h2>
        <p>
          Com a imobiliária parceira e o corretor responsáveis pelo seu atendimento, e com fornecedores de tecnologia que operam a plataforma (hospedagem, banco de dados,
          e-mail e, se aceito, Google Analytics), sob obrigação de confidencialidade. Não vendemos dados pessoais.
        </p>

        <h2>5. Por quanto tempo guardamos</h2>
        <p>
          Registros de navegação de visitantes que não se cadastraram são eliminados após o prazo definido pela Stater Group (padrão: 365 dias). Dados de cadastro são mantidos
          enquanto houver relacionamento comercial; contatos encerrados sem negócio têm os dados pessoais eliminados após o prazo de retenção (padrão: 730 dias), salvo obrigação legal.
        </p>

        <h2>6. Seus direitos</h2>
        <p>
          Você pode solicitar confirmação, acesso, correção, anonimização, eliminação, portabilidade, informação sobre compartilhamento e revogação do consentimento
          (art. 18 da Lei 13.709/2018), pelo contato do encarregado acima. Você também pode recusar os cookies de medição a qualquer momento limpando os dados do site no navegador.
        </p>

        <h2>7. Textos aceitos no formulário</h2>
        <blockquote className="mb-3 border-l-2 border-brand pl-4 italic">{CONSENT_PRIVACY}</blockquote>
        <blockquote className="border-l-2 border-brand pl-4 italic">{CONSENT_CONTACT}</blockquote>

        <p className="mt-10 rounded-lg bg-white p-4 text-xs text-muted">
          Este aviso é um modelo técnico preparado com a plataforma e deve ser revisado pelo jurídico/encarregado da Stater Group antes da publicação da campanha.
        </p>
      </main>
    </div>
  );
}
