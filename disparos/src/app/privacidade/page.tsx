import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata = { title: "Privacidade" };

export default function Privacidade() {
  return (
    <div className="min-h-screen bg-paper">
      <header className="bg-black">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Logo height={15} />
          <Link href="/brasil" className="text-xs text-white/60 hover:text-white">Radar Logístico</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-4 px-5 py-12 text-[0.95rem] leading-relaxed text-ink-2">
        <h1 className="font-display text-3xl text-ink">Aviso de Privacidade · Radar Logístico</h1>
        <p>
          A Stater Group envia a série Radar Logístico a pessoas com quem mantém relacionamento. Os links enviados individualmente contêm um código pessoal. Ao abrir um
          capítulo, registramos a data e hora, o tempo de leitura, até onde a página foi lida, o tipo de aparelho (celular ou computador) e se você clicou em “Tenho interesse”.
          Também usamos um cookie próprio para reconhecer o mesmo navegador entre os capítulos. Não usamos cookies de publicidade.
        </p>
        <p>
          Usamos essas informações para que nossa equipe entenda o interesse de cada contato na oportunidade e faça um atendimento adequado (legítimo interesse). Quando você
          informa nome e WhatsApp no formulário, tratamos esses dados com base na sua autorização, que pode ser revogada a qualquer momento.
        </p>
        <p>
          Os dados não são vendidos nem compartilhados com terceiros, exceto fornecedores de tecnologia que hospedam o serviço. Você pode pedir acesso, correção ou exclusão
          dos seus dados respondendo à mensagem em que recebeu o link.
        </p>
        <p className="rounded-lg bg-white p-4 text-xs text-muted">Modelo técnico: revise com o jurídico da Stater Group e inclua a razão social, o CNPJ e o contato do encarregado (DPO).</p>
      </main>
    </div>
  );
}
