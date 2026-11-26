import "server-only";
import { PAGES, type PageId } from "@/content/capitulos";
import { q } from "./db";

export type PageStats = { page: PageId; contacts: number; opened: number; anon: number; avgMs: number; finished: number; cta: number };

export async function pageStats(tag: string | null): Promise<PageStats[]> {
  const rows = await q<Record<string, string>>(
    `select p.page,
       (select count(*) from contacts c where ($1::text is null or c.tag = $1)) contacts,
       count(distinct v.contact_id) filter (where v.contact_id is not null) opened,
       count(distinct v.visitor) filter (where v.contact_id is null) anon,
       coalesce(avg(v.duration_ms) filter (where v.duration_ms > 0), 0) avg_ms,
       count(distinct coalesce(v.contact_id::text, v.visitor)) filter (where v.max_scroll >= 90) finished,
       count(distinct coalesce(v.contact_id::text, v.visitor)) filter (where v.cta_at is not null) cta
     from (select unnest($2::text[]) page) p
     left join visits v on v.page = p.page
       and ($1::text is null or v.contact_id in (select id from contacts where tag = $1))
     group by p.page`,
    [tag, PAGES]
  );
  return PAGES.map((page) => {
    const r = rows.find((x) => x.page === page)!;
    return { page, contacts: +r.contacts, opened: +r.opened, anon: +r.anon, avgMs: +r.avg_ms, finished: +r.finished, cta: +r.cta };
  });
}

export type Touch = { at: string; ms: number; scroll: number; visits: number } | null;
export type ContactRow = {
  id: number;
  token: string;
  name: string;
  phone: string | null;
  tag: string | null;
  source: string;
  created_at: string;
  last_at: string | null;
  cta_at: string | null;
  brasil: Touch;
  sc: Touch;
  garuva: Touch;
};

export async function contactRows(opts: { tag: string | null; status: string | null; search: string | null; limit?: number }): Promise<ContactRow[]> {
  const rows = await q<ContactRow>(
    `with agg as (
       select contact_id, page, min(started_at) first_at, sum(duration_ms) ms, max(max_scroll) scroll, count(*) visits
       from visits where contact_id is not null group by 1, 2)
     select c.id, c.token, c.name, c.phone, c.tag, c.source, c.created_at,
       (select max(last_at) from visits v where v.contact_id = c.id) last_at,
       (select min(cta_at) from visits v where v.contact_id = c.id) cta_at,
       (select json_build_object('at', first_at, 'ms', ms, 'scroll', scroll, 'visits', visits) from agg where agg.contact_id = c.id and page = 'brasil') brasil,
       (select json_build_object('at', first_at, 'ms', ms, 'scroll', scroll, 'visits', visits) from agg where agg.contact_id = c.id and page = 'sc') sc,
       (select json_build_object('at', first_at, 'ms', ms, 'scroll', scroll, 'visits', visits) from agg where agg.contact_id = c.id and page = 'garuva') garuva
     from contacts c
     where ($1::text is null or c.tag = $1)
       and ($3::text is null or c.name ilike $3 or c.phone ilike $3)
     order by last_at desc nulls last, c.created_at desc
     limit $2`,
    [opts.tag, opts.limit ?? 2000, opts.search ? `%${opts.search}%` : null]
  );
  return rows.filter((r) => {
    if (opts.status === "interessados") return Boolean(r.cta_at);
    if (opts.status === "abriram") return Boolean(r.brasil || r.sc || r.garuva);
    if (opts.status === "nao-abriram") return !r.brasil && !r.sc && !r.garuva;
    if (opts.status === "quentes") return Boolean(r.cta_at) || Boolean(r.brasil && r.sc && r.garuva);
    return true;
  });
}

export async function tags() {
  return (await q<{ tag: string; n: string }>("select tag, count(*) n from contacts where tag is not null group by tag order by tag")).map((r) => ({ tag: r.tag, n: +r.n }));
}

export async function recentActivity(limit = 12) {
  return q<{ page: PageId; started_at: string; cta_at: string | null; duration_ms: number; max_scroll: number; name: string | null; device: string }>(
    `select v.page, v.started_at, v.cta_at, v.duration_ms, v.max_scroll, c.name, v.device
     from visits v left join contacts c on c.id = v.contact_id order by greatest(v.started_at, coalesce(v.cta_at, v.started_at)) desc limit $1`,
    [limit]
  );
}
