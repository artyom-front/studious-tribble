"use client";

// Профиль персоны «Ночь под прожекторами»: геро с аватаром, суммарная статистика,
// вкладки Карьера (заявки/трансферы) · Статистика · Дисциплина, судейская карьера.

import { useState } from "react";
import { Goal, TriangleAlert, OctagonX, Repeat, Ban, ArrowRightLeft, Flag, Star, Shield, UserCog } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useFetch, fmtDate, fmtShortDate } from "./hooks";
import { navigate } from "./router";
import { EVENT_LABELS, SOURCE_LABELS } from "@/lib/labels";
import { LoadingBlock, PositionBadge, EmptyState } from "./ui-bits";
import { Avatar, Breadcrumbs, Crest, StatTile } from "./visuals";

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

const POSITION_TITLES: Record<string, string> = { GK: "Вратарь", DF: "Защитник", MF: "Полузащитник", FW: "Нападающий" };

type Tab = "career" | "stats" | "discipline";

export default function PlayerPage({ personId }: { personId: string }) {
  const { data, error } = useFetch<PlayerDetail>(`/api/public/players/${personId}`);
  const [tab, setTab] = useState<Tab>("career");

  if (error) return <EmptyState title="Персона не найдена" hint={error} />;
  if (!data || !data.player) return <LoadingBlock label="Загрузка профиля..." />;

  const p = data.player;

  // Карьерные суммы по всем сезонам
  const career = p.statsBySeason.reduce(
    (a, s) => ({
      games: a.games + s.stats.games,
      goals: a.goals + s.stats.goals,
      assists: a.assists + s.stats.assists,
      yellow: a.yellow + s.stats.yellowCards,
      red: a.red + s.stats.redCards,
    }),
    { games: 0, goals: 0, assists: 0, yellow: 0, red: 0 }
  );

  const currentReg = p.registrations.find((r) => !r.endDate);
  const activeSusp = p.suspensions.filter((s) => s.isActive);
  const isCoach = p.registrations.length > 0 && p.statsBySeason.length === 0 && !p.isReferee;

  const tabs: { id: Tab; label: string }[] = [
    { id: "career", label: "Карьера" },
    { id: "stats", label: p.isReferee && career.games === 0 ? "Статистика судьи" : "Статистика" },
    { id: "discipline", label: `Дисциплина${p.suspensions.length ? ` · ${p.suspensions.length}` : ""}` },
  ];

  return (
    <div className="space-y-3">
      <Breadcrumbs
        items={[
          { label: "Главная", onClick: () => navigate("/") },
          { label: p.isReferee && career.games === 0 ? "Судьи" : "Персоны", onClick: () => navigate("/") },
          { label: p.name },
        ]}
        className="px-1"
      />

      {/* ---------- Гери профиля ---------- */}
      <div className="overflow-hidden rounded-2xl border border-sline bg-s1">
        <div className="stadium-glow flex flex-wrap items-center gap-4 px-4 py-5 sm:px-6">
          <Avatar name={p.name} id={p.id} size="xl" className="ring-2 ring-gold/30" />
          <div className="min-w-0 flex-1">
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-black tracking-tight text-ink">
              {p.name}
              <PositionBadge position={p.position} />
              {p.isReferee && (
                <Badge variant="outline" className="border-gold/40 bg-gold/10 text-gold">
                  <Flag className="mr-1 h-3 w-3" />судья
                </Badge>
              )}
              {isCoach && (
                <Badge variant="outline" className="border-amber-400/40 bg-amber-400/10 text-amber-300">
                  <UserCog className="mr-1 h-3 w-3" />тренер
                </Badge>
              )}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink3">
              {p.position && <span>{POSITION_TITLES[p.position] ?? p.position}</span>}
              {p.birthDate && <span>род. {new Date(p.birthDate).toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow" })}</span>}
              {currentReg && (
                <button className="flex items-center gap-1.5 hover:text-gold" onClick={() => navigate(`/team/${currentReg.team.id}`)}>
                  <Crest name={currentReg.team.name} id={currentReg.team.id} size="xs" />
                  {currentReg.team.name}
                </button>
              )}
            </p>
          </div>
          {activeSusp.length > 0 && (
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-live/15 px-3 py-1.5 text-xs font-bold text-live">
              <Ban className="h-3.5 w-3.5" /> дисквалифицирован
            </span>
          )}
        </div>

        {/* Карьерные показатели */}
        {career.games > 0 && (
          <div className="grid grid-cols-5 gap-2 border-t border-sline/60 px-4 py-3">
            <StatTile value={career.games} label="матчи" />
            <StatTile value={career.goals} label="голы" accent />
            <StatTile value={career.assists} label="ассисты" />
            <StatTile value={career.yellow} label="ЖК" />
            <StatTile value={career.red} label="КК" />
          </div>
        )}
      </div>

      {/* ---------- Вкладки ---------- */}
      <div className="overflow-hidden rounded-xl border border-sline bg-s1">
        <div className="flex gap-1 overflow-x-auto border-b border-sline/60 px-2 scrollbar-none">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "relative shrink-0 px-4 py-2.5 text-sm font-semibold transition-colors",
                tab === t.id ? "text-gold" : "text-ink2 hover:text-ink"
              )}
            >
              {t.label}
              {tab === t.id && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-gold" />}
            </button>
          ))}
        </div>

        {/* ---- Карьера: заявки/трансферы + события ---- */}
        {tab === "career" && (
          <div className="p-4">
            <p className="mb-3 flex items-center gap-1.5 text-sm font-bold text-ink"><ArrowRightLeft className="h-4 w-4 text-gold" /> Заявки и трансферы</p>
            <div className="space-y-1.5">
              {p.registrations.map((r, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2.5 rounded-xl border border-sline/50 bg-s2/30 px-3 py-2.5 text-sm">
                  <Crest name={r.team.name} id={r.team.id} size="sm" />
                  <button className="min-w-0 font-semibold text-ink hover:text-gold" onClick={() => navigate(`/team/${r.team.id}`)}>
                    {r.team.name}
                  </button>
                  <span className="hidden text-xs text-ink3 sm:inline">{r.season.league} · {r.season.name}</span>
                  <span className="ml-auto text-xs text-ink3">
                    {fmtShortDate(r.startDate)} — {r.endDate ? fmtShortDate(r.endDate) : "н.в."}
                  </span>
                  {r.number && <Badge variant="secondary" className="bg-s2 font-mono text-ink2">№{r.number}</Badge>}
                  {r.endDate && <Badge variant="outline" className="border-amber-400/40 bg-amber-400/10 text-amber-300">отзаявлен</Badge>}
                </div>
              ))}
              {p.registrations.length === 0 && <p className="py-4 text-center text-sm text-ink3">Заявок не найдено</p>}
            </div>

            {p.events.length > 0 && (
              <>
                <p className="mb-2 mt-5 text-sm font-bold text-ink">Участие в событиях</p>
                <div className="max-h-72 space-y-1 overflow-y-auto scrollbar-s21">
                  {p.events.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => navigate(`/match/${e.match.id}`)}
                      className="flex w-full items-center gap-2 rounded-lg bg-s2/40 px-3 py-2 text-left text-sm hover:bg-s2/80"
                    >
                      {e.type === "GOAL" || e.type === "PENALTY" ? <Goal className="h-3.5 w-3.5 shrink-0 text-gold" /> :
                       e.type === "YELLOW_CARD" ? <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-amber-400" /> :
                       e.type === "RED_CARD" ? <OctagonX className="h-3.5 w-3.5 shrink-0 text-live" /> :
                       <Repeat className="h-3.5 w-3.5 shrink-0 text-ink3" />}
                      <span className="min-w-0 flex-1 truncate text-xs text-ink2">{e.match.home} — {e.match.away}</span>
                      <span className="ml-auto shrink-0 font-mono text-xs text-ink3">
                        {e.isAssist ? `ассист ${e.minute}&apos;` : `${EVENT_LABELS[e.type] ?? e.type} ${e.minute}&apos;`}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ---- Статистика ---- */}
        {tab === "stats" && (
          <div className="p-4">
            {/* Судейская карьера */}
            {p.referee && (
              <div className="mb-4 rounded-xl border border-sline/50 p-3">
                <p className="mb-3 flex items-center gap-1.5 text-sm font-bold text-ink"><Flag className="h-4 w-4 text-gold" /> Судейская карьера</p>
                <div className="grid grid-cols-3 gap-2 text-center sm:grid-cols-6">
                  {[
                    ["Матчи", p.referee.matches],
                    ["ЖК/матч", p.referee.yellowAvg],
                    ["КК/матч", p.referee.redAvg],
                    ["Пен./матч", p.referee.penaltyAvg],
                    ["Рейтинг", p.referee.avgRating ?? "—"],
                    ["Оценок", p.referee.ratingsCount],
                  ].map(([label, value]) => (
                    <StatTile key={label as string} value={value as string} label={label as string} accent={label === "Рейтинг"} />
                  ))}
                </div>
                {p.referee.avgRating !== null && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-ink2">
                    <Star className="h-3.5 w-3.5 fill-gold text-gold" />
                    Средняя оценка капитанов: <b className="font-mono text-gold">{p.referee.avgRating}</b> из 5
                  </p>
                )}
                {p.referee.matchList.length > 0 && (
                  <div className="mt-3 max-h-64 space-y-1 overflow-y-auto scrollbar-s21">
                    {p.referee.matchList.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => navigate(`/match/${m.id}`)}
                        className="flex w-full items-center gap-3 rounded-lg bg-s2/40 px-3 py-2 text-left text-sm hover:bg-s2/80"
                      >
                        <span className="w-20 shrink-0 text-xs text-ink3">{fmtShortDate(m.kickoff)}</span>
                        <span className="min-w-0 flex-1 truncate font-medium text-ink2">{m.home} — {m.away}</span>
                        <span className="shrink-0 font-mono text-sm font-bold text-gold">
                          {m.status === "COMPLETED" ? `${m.homeScore}:${m.awayScore}` : m.status === "WALKOVER" ? "WO" : "—"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Игровая статистика по сезонам */}
            {p.statsBySeason.length > 0 && (
              <div className="space-y-2">
                {p.statsBySeason.map((s) => (
                  <div key={s.season.id} className="rounded-xl border border-sline/50 p-3">
                    <p className="mb-2 text-xs font-semibold text-ink2">{s.season.league} · {s.season.name}</p>
                    <div className="grid grid-cols-4 gap-2 text-center sm:grid-cols-7">
                      <StatTile value={s.stats.games} label="матчи" />
                      <StatTile value={s.stats.goals} label="голы" accent />
                      <StatTile value={s.stats.penalties} label="пен." />
                      <StatTile value={s.stats.assists} label="ассисты" />
                      <StatTile value={s.stats.yellowCards} label="ЖК" />
                      <StatTile value={s.stats.redCards} label="КК" />
                      <StatTile value={s.stats.cleanSheets} label="сухие" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {p.statsBySeason.length === 0 && !p.referee && (
              <EmptyState icon={<Shield className="h-6 w-6 opacity-50" />} title="Игровой статистики нет" hint="Персона не участвовала в матчах как игрок" />
            )}
          </div>
        )}

        {/* ---- Дисциплина ---- */}
        {tab === "discipline" && (
          <div className="p-4">
            {p.suspensions.length === 0 && (
              <EmptyState icon={<Ban className="h-6 w-6 opacity-50" />} title="Дисциплинарная история чиста" hint="Дисквалификаций не было" />
            )}
            {p.suspensions.map((s, i) => {
              const served = s.isLifetime ? 100 : Math.round((s.matchesServed / s.matchesTotal) * 100);
              return (
                <div key={i} className={cn("mb-2 rounded-xl border px-3 py-2.5 text-sm last:mb-0", s.isActive ? "border-live/40 bg-live/10" : "border-sline/50 bg-s2/30")}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-ink">{SOURCE_LABELS[s.source] ?? s.source}</span>
                    <span className="text-xs text-ink3">{fmtDate(s.createdAt, false)}</span>
                    <span className={cn("ml-auto text-xs font-bold", s.isActive ? "text-live" : "text-ink3")}>
                      {s.isLifetime ? "пожизненно" : s.isActive ? `осталось ${s.matchesTotal - s.matchesServed} матч.` : `отбыто ${s.matchesServed}/${s.matchesTotal}`}
                    </span>
                  </div>
                  {!s.isLifetime && (
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-s2">
                      <div className={cn("h-full rounded-full", s.isActive ? "bg-live" : "bg-gold")} style={{ width: `${served}%` }} />
                    </div>
                  )}
                  {s.reason && <p className="mt-1.5 text-xs text-ink2">{s.reason}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
