"use client";

// Страница персоны: игрок / тренер / судья (человек может быть всем сразу — инвариант №1).
// Заявки и трансферы, статистика по сезонам, дисквалификации, события, судейская карьера.

import { Goal, TriangleAlert, OctagonX, Repeat, Ban, ArrowRightLeft, Flag, ChevronLeft, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useFetch, fmtDate, fmtShortDate } from "./hooks";
import { navigate } from "./router";
import { EVENT_LABELS, SOURCE_LABELS } from "./types";
import { LoadingBlock, PositionBadge, EmptyState } from "./ui-bits";

interface PlayerDetail {
  player: {
    id: string;
    name: string;
    birthDate: string | null;
    position: string | null;
    isReferee: boolean;
    referee: {
      matches: number; yellowAvg: number; redAvg: number; penaltyAvg: number;
      avgRating: number | null; ratingsCount: number;
      matchList: { id: string; kickoff: string; home: string; away: string; status: string; league: string; homeScore: number | null; awayScore: number | null }[];
    } | null;
    registrations: {
      team: { id: string; name: string; clubName: string | null };
      season: { id: string; name: string; league: string };
      startDate: string;
      endDate: string | null;
      number: number | null;
    }[];
    suspensions: {
      league: string; source: string; reason: string | null;
      matchesTotal: number; matchesServed: number; isLifetime: boolean; isActive: boolean; createdAt: string;
    }[];
    statsBySeason: {
      season: { id: string; name: string; league: string };
      stats: {
        games: number; goals: number; penalties: number; ownGoals: number; assists: number;
        yellowCards: number; redCards: number; cleanSheets: number;
      };
    }[];
    events: { id: string; type: string; minute: number; isAssist: boolean; match: { id: string; home: string; away: string; status: string; kickoff: string } }[];
  };
}

export default function PlayerPage({ personId }: { personId: string }) {
  const { data, error } = useFetch<PlayerDetail>(`/api/public/players/${personId}`);
  const p = data?.player;

  if (error) return <EmptyState title="Персона не найдена" hint={error} />;
  if (!data || !p) return <LoadingBlock label="Загрузка профиля..." />;

  return (
    <div className="space-y-3">
      {/* ---------- Шапка ---------- */}
      <div className="rounded-xl border border-zinc-200 bg-white px-4 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => history.back()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800"
            aria-label="Назад"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="flex flex-wrap items-center gap-2 text-xl font-extrabold tracking-tight text-zinc-900">
              {p.name}
              <PositionBadge position={p.position} />
              {p.isReferee && <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">судья</Badge>}
            </h1>
            <p className="mt-0.5 text-xs text-zinc-400">
              {p.birthDate ? `Дата рождения: ${new Date(p.birthDate).toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow" })}` : "Профиль персоны портала"}
            </p>
          </div>
        </div>
      </div>

      {/* ---------- Судейская карьера ---------- */}
      {p.referee && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="mb-3 flex items-center gap-1.5 text-sm font-bold"><Flag className="h-4 w-4 text-emerald-600" /> Судейская карьера</p>
          <div className="grid grid-cols-3 gap-2 text-center sm:grid-cols-6">
            {[
              ["Матчи", p.referee.matches],
              ["ЖК/матч", p.referee.yellowAvg],
              ["КК/матч", p.referee.redAvg],
              ["Пен./матч", p.referee.penaltyAvg],
              ["Рейтинг", p.referee.avgRating ?? "—"],
              ["Оценок", p.referee.ratingsCount],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-lg bg-zinc-50 py-2">
                <p className="font-mono text-base font-bold text-zinc-800">{value as string}</p>
                <p className="text-[10px] text-zinc-400">{label as string}</p>
              </div>
            ))}
          </div>
          {p.referee.avgRating !== null && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              Средняя оценка капитанов: <b className="font-mono">{p.referee.avgRating}</b> из 5
            </p>
          )}
          {p.referee.matchList.length > 0 && (
            <div className="mt-3 max-h-64 space-y-1 overflow-y-auto">
              {p.referee.matchList.map((m) => (
                <button
                  key={m.id}
                  onClick={() => navigate(`/match/${m.id}`)}
                  className="flex w-full items-center gap-3 rounded-lg bg-zinc-50 px-3 py-2 text-left text-sm hover:bg-emerald-50"
                >
                  <span className="w-24 shrink-0 text-xs text-zinc-400">{fmtShortDate(m.kickoff)}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{m.home} — {m.away}</span>
                  <span className="shrink-0 font-mono text-sm font-bold">
                    {m.status === "COMPLETED" ? `${m.homeScore}:${m.awayScore}` : m.status === "WALKOVER" ? "WO" : "—"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------- Заявки / трансферы ---------- */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-bold"><ArrowRightLeft className="h-4 w-4 text-emerald-600" /> Заявки и трансферы</p>
        <div className="space-y-1.5">
          {p.registrations.map((r, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm">
              <button className="font-semibold hover:text-emerald-700" onClick={() => navigate(`/team/${r.team.id}`)}>{r.team.name}</button>
              <span className="text-xs text-zinc-400">{r.season.league} · {r.season.name}</span>
              <span className="ml-auto text-xs text-zinc-400">
                {fmtShortDate(r.startDate)} — {r.endDate ? fmtShortDate(r.endDate) : "н.в."}
              </span>
              {r.number && <Badge variant="secondary" className="font-mono">№{r.number}</Badge>}
              {r.endDate && <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">отзаявлен</Badge>}
            </div>
          ))}
        </div>
      </div>

      {/* ---------- Статистика ---------- */}
      {p.statsBySeason.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="mb-2 text-sm font-bold">Статистика по сезонам</p>
          {p.statsBySeason.map((s) => (
            <div key={s.season.id} className="mb-2 rounded-xl border border-zinc-200 p-3 last:mb-0">
              <p className="mb-2 text-xs font-semibold text-zinc-500">{s.season.league} · {s.season.name}</p>
              <div className="grid grid-cols-4 gap-2 text-center sm:grid-cols-7">
                {[
                  ["Матчи", s.stats.games],
                  ["Голы", s.stats.goals],
                  ["Пен.", s.stats.penalties],
                  ["Ассист", s.stats.assists],
                  ["ЖК", s.stats.yellowCards],
                  ["КК", s.stats.redCards],
                  ["Сухие", s.stats.cleanSheets],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <p className="font-mono text-base font-bold">{value as number}</p>
                    <p className="text-[10px] text-zinc-400">{label as string}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---------- Дисквалификации ---------- */}
      {p.suspensions.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-bold"><Ban className="h-4 w-4 text-red-500" /> Дисквалификации</p>
          {p.suspensions.map((s, i) => (
            <div key={i} className={`mb-1.5 rounded-lg border px-3 py-2 text-sm last:mb-0 ${s.isActive ? "border-red-200 bg-red-50" : "border-zinc-200"}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{SOURCE_LABELS[s.source] ?? s.source}</span>
                <span className="text-xs text-zinc-400">{fmtDate(s.createdAt, false)}</span>
                <span className={`ml-auto text-xs font-bold ${s.isActive ? "text-red-600" : "text-zinc-400"}`}>
                  {s.isLifetime ? "пожизненно" : `${s.matchesServed}/${s.matchesTotal} отбыто`}
                </span>
              </div>
              {s.reason && <p className="mt-0.5 text-xs text-zinc-500">{s.reason}</p>}
            </div>
          ))}
        </div>
      )}

      {/* ---------- События ---------- */}
      {p.events.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="mb-2 text-sm font-bold">Участие в событиях</p>
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {p.events.map((e) => (
              <button
                key={e.id}
                onClick={() => navigate(`/match/${e.match.id}`)}
                className="flex w-full items-center gap-2 rounded-lg bg-zinc-50 px-3 py-1.5 text-left text-sm hover:bg-emerald-50"
              >
                {e.type === "GOAL" || e.type === "PENALTY" ? <Goal className="h-3.5 w-3.5 shrink-0 text-emerald-600" /> :
                 e.type === "YELLOW_CARD" ? <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-yellow-500" /> :
                 e.type === "RED_CARD" ? <OctagonX className="h-3.5 w-3.5 shrink-0 text-red-600" /> :
                 <Repeat className="h-3.5 w-3.5 shrink-0 text-zinc-400" />}
                <span className="min-w-0 flex-1 truncate text-xs">{e.match.home} — {e.match.away}</span>
                <span className="ml-auto shrink-0 font-mono text-xs text-zinc-400">
                  {e.isAssist ? `ассист ${e.minute}&apos;` : `${EVENT_LABELS[e.type] ?? e.type} ${e.minute}&apos;`}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
