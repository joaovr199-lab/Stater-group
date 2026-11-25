import Link from "next/link";
import { EVENT_LABEL } from "@/lib/constants";
import { fmtDateTime, fmtHours, fmtPhone } from "@/lib/format";
import type { LeadRow } from "@/lib/queries";
import { Empty, ScoreBadge, StageBadge } from "./ui";

export function LeadTable({ leads, base, showAgency = true, showBroker = true, noContactHours = 4 }: { leads: LeadRow[]; base: string; showAgency?: boolean; showBroker?: boolean; noContactHours?: number }) {
  if (!leads.length) return <Empty>Nenhum lead identificado com os filtros atuais.</Empty>;
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="table">
          <thead>
            <tr>
              <th>Investidor</th>
              <th>Telefone</th>
              {showAgency && <th>Imobiliária</th>}
              {showBroker && <th>Corretor</th>}
              <th>Campanha</th>
              <th>Entrada</th>
              <th>Score</th>
              <th>Último evento</th>
              <th>Status</th>
              <th>Sem atendimento</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => {
              const waiting = !l.first_contact_at && l.stage === "novo";
              return (
                <tr key={l.id}>
                  <td>
                    <Link href={`${base}/leads/${l.id}`} className="font-semibold text-ink hover:underline">{l.name}</Link>
                    {l.interest && <div className="max-w-[16rem] truncate text-xs text-muted">{l.interest}</div>}
                  </td>
                  <td className="tabular whitespace-nowrap">{fmtPhone(l.phone)}</td>
                  {showAgency && <td className="whitespace-nowrap">{l.agency_name ?? <span className="text-muted">Sem imobiliária</span>}</td>}
                  {showBroker && <td className="whitespace-nowrap">{l.broker_name ?? <span className="text-muted">—</span>}</td>}
                  <td className="whitespace-nowrap text-ink-2">{l.campaign_name}</td>
                  <td className="tabular whitespace-nowrap text-ink-2">{fmtDateTime(l.created_at)}</td>
                  <td><ScoreBadge score={l.score} cls={l.classification} /></td>
                  <td className="whitespace-nowrap text-ink-2">{l.last_event ? EVENT_LABEL[l.last_event] ?? l.last_event : "—"}</td>
                  <td><StageBadge stage={l.stage} /></td>
                  <td className={`tabular whitespace-nowrap ${waiting && l.hours_waiting >= noContactHours ? "font-semibold text-bad" : "text-ink-2"}`}>
                    {waiting ? fmtHours(l.hours_waiting) : "Atendido"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ul className="space-y-2 md:hidden">
        {leads.map((l) => (
          <LeadCardMobile key={l.id} l={l} base={base} noContactHours={noContactHours} />
        ))}
      </ul>
    </>
  );
}

export function LeadCardMobile({ l, base, noContactHours = 4 }: { l: LeadRow; base: string; noContactHours?: number }) {
  const waiting = !l.first_contact_at && l.stage === "novo";
  return (
    <li>
      <Link href={`${base}/leads/${l.id}`} className="block rounded-xl border border-line bg-surface p-4 active:bg-[#fafafa]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-semibold">{l.name}</div>
            <div className="tabular text-sm text-ink-2">{fmtPhone(l.phone)}</div>
          </div>
          <ScoreBadge score={l.score} cls={l.classification} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
          <StageBadge stage={l.stage} />
          <span>{fmtDateTime(l.created_at)}</span>
          {waiting && <span className={l.hours_waiting >= noContactHours ? "font-semibold text-bad" : ""}>aguardando há {fmtHours(l.hours_waiting)}</span>}
        </div>
      </Link>
    </li>
  );
}

type Anon = {
  visitor_id: string;
  agency_name: string | null;
  broker_name: string | null;
  campaign_name: string | null;
  first_at: Date;
  last_at: Date;
  last_event: string;
  events: number;
  event_names: string[];
  score: number;
};

export function AnonTable({ rows, showAgency = true, showBroker = true }: { rows: Anon[]; showAgency?: boolean; showBroker?: boolean }) {
  if (!rows.length) return <Empty>Nenhum interesse anônimo no período.</Empty>;
  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>Visitante</th>
            {showAgency && <th>Imobiliária</th>}
            {showBroker && <th>Corretor</th>}
            <th>Campanha</th>
            <th>Primeiro acesso</th>
            <th>Último evento</th>
            <th>Eventos</th>
            <th>Score digital</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.visitor_id}>
              <td className="font-mono text-xs text-ink-2" title="Identificador pseudônimo — sem dados pessoais">#{r.visitor_id.slice(0, 8)}</td>
              {showAgency && <td className="whitespace-nowrap">{r.agency_name ?? <span className="text-muted">Acesso direto</span>}</td>}
              {showBroker && <td className="whitespace-nowrap">{r.broker_name ?? "—"}</td>}
              <td className="whitespace-nowrap text-ink-2">{r.campaign_name ?? "—"}</td>
              <td className="tabular whitespace-nowrap text-ink-2">{fmtDateTime(r.first_at)}</td>
              <td className="whitespace-nowrap">
                {EVENT_LABEL[r.last_event] ?? r.last_event}
                <div className="text-xs text-muted">{fmtDateTime(r.last_at)}</div>
              </td>
              <td className="tabular">{r.events}</td>
              <td><ScoreBadge score={r.score} cls={r.score >= 60 ? "alta_intencao" : r.score >= 30 ? "interessado" : "exploratorio"} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
