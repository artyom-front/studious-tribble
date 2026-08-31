"use client";

// Главная — livescore-лента: фильтры даты (вчера/сегодня/завтра/календарь/все) и статуса,
// матчи сгруппированы по лигам. Клик — проваливание в матч, команды и стадион кликабельны.

import { useMemo, useState } from "react";
import { CalendarDays, ChevronRight, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFetch } from "./hooks";
import { navigate, mskDay } from "./router";
import type { MatchDayDTO, MatchDTO, OverviewDTO } from "./types";
import { FORMAT_LABELS } from "./types";
import { LoadingBlock, matchScore, EmptyState } from "./ui-bits";

interface Props {
  format: string;
  overview: OverviewDTO | null;
  version: number;
}

type DayTab = "yesterday" | "today" | "tomorrow" | "all";
type StatusFilter = "all" | "live" | "finished" | "upcoming";

const DAY_TABS: { id: DayTab; label: string }[] = [
  { id: "yesterday", label: "Вчера" },
  { id: "today", label: "Сегодня" },
  { id: "tomorrow", label: "Завтра" },
  { id: "all", label: "Все даты" },
];

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "live", label: "Live" },
  { id: "finished", label: "Завершённые" },
  { id: "upcoming", label: "Предстоящие" },
];

export default function MatchDayView({ format, version }: Props) {
  const [dayTab, setDayTab] = useState<DayTab>("today");
  const [customDate, setCustomDate] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusFilter>("all");

  const dateParam = customDate ?? (dayTab === "all" ? "all" : dayTab === "today" ? mskDay(0) : dayTab === "yesterday" ? mskDay(-1) : mskDay(1));
  const { data, loading, error } = useFetch<{ leagues: MatchDayDTO[] }>(
    `/api/public/matches/day?date=${dateParam}&format=${format}`,
    version
  );

  const leagues = useMemo(() => {
    const src = data?.leagues ?? [];
    const filterFn = (m: MatchDTO) => {
      if (status === "live") return m.status === "LIVE";
      if (status === "finished") return m.status === "COMPLETED" || m.status === "WALKOVER";
      if (status === "upcoming") return m.status === "SCHEDULED" || m.status === "POSTPONED";
      return true;
    };
    return src.map((l) => ({ ...l, matches: l.matches.filter(filterFn) })).filter((l) => l.matches.length > 0);
  }, [data, status]);

  const totalMatches = leagues.reduce((sum, l) => sum + l.matches.length, 0);

  return (
    <div className="space-y-3">
      {/* ---------- Фильтры ---------- */}
      <div className="rounded-xl border border-zinc-200 bg-white">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-zinc-100 px-4 py-2.5">
          {DAY_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => { setDayTab(t.id); setCustomDate(null); }}
              className={cn(
                "relative pb-1 text-sm font-semibold transition-colors",
                dayTab === t.id && !customDate ? "text-emerald-600" : "text-zinc-500 hover:text-zinc-800"
              )}
            >
              {t.label}
              {dayTab === t.id && !customDate && <span className="absolute inset-x-0 -bottom-[11px] h-0.5 rounded-full bg-emerald-500" />}
            </button>
          ))}
          <label className="flex items-center gap-1.5 text-xs text-zinc-500">
            <CalendarDays className="h-3.5 w-3.5" />
            <input
              type="date"
              value={customDate ?? ""}
              onChange={(e) => e.target.value && setCustomDate(e.target.value)}
              className="rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-700 focus:border-emerald-400 focus:outline-none"
              aria-label="Выбор даты"
            />
          </label>
          <div className="ml-auto flex gap-1">
            {STATUS_TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setStatus(t.id)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                  status === t.id
                    ? t.id === "live"
                      ? "bg-red-500 text-white"
                      : "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                )}
              >
                {t.id === "live" && <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white align-middle" />}
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ---------- Лента матчей по лигам ---------- */}
      {loading && !data && <LoadingBlock label="Загрузка матчей..." />}
      {error && <EmptyState title="Не удалось загрузить матчи" hint={error} />}
      {data && totalMatches === 0 && (
        <EmptyState
          title="В этот день матчей нет"
          hint="Попробуйте «Все даты» или выберите другую дату в календаре"
        />
      )}
      {leagues.map((l) => (
        <section key={l.league.id} className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          {/* заголовок лиги */}
          <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50 px-4 py-2.5">
            <span className="shrink-0 rounded bg-emerald-600/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
              {FORMAT_LABELS[l.league.format] ?? l.league.format}
            </span>
            <button
              onClick={() => navigate(`/league/${l.league.id}`)}
              className="text-sm font-bold text-zinc-800 hover:text-emerald-700"
            >
              {l.league.name}
            </button>
            <span className="hidden text-[11px] text-zinc-400 sm:inline">· {l.season.name}</span>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => navigate(`/league/${l.league.id}/table`)}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
              >
                Таблица
              </button>
              <ChevronRight className="h-3.5 w-3.5 text-zinc-300" />
            </div>
          </div>

          {/* матчи */}
          {l.matches.map((m) => <MatchRow key={m.id} m={m} />)}
        </section>
      ))}
    </div>
  );
}

/** Строка матча в стиле livescore */
function MatchRow({ m }: { m: MatchDTO }) {
  const score = matchScore(m);
  const time = new Date(m.kickoff);
  const timeStr = time.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Moscow" });
  const dateStr = time.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", timeZone: "Europe/Moscow" });

  const left = m.status === "SCHEDULED" || m.status === "POSTPONED" ? timeStr : m.status === "LIVE" ? "LIVE" : dateStr;
  const leftCls = m.status === "LIVE" ? "font-bold text-red-500" : m.status === "COMPLETED" || m.status === "WALKOVER" ? "text-zinc-400" : "font-semibold text-zinc-600";

  return (
    <button
      onClick={() => navigate(`/match/${m.id}`)}
      className={cn(
        "grid w-full grid-cols-[64px_minmax(0,1fr)_auto_minmax(0,1fr)_24px] items-center gap-2 border-b border-zinc-50 px-4 py-2.5 text-left transition-colors last:border-b-0 hover:bg-emerald-50/30",
        m.status === "LIVE" && "bg-red-50/40"
      )}
    >
      {/* время/статус */}
      <span className={cn("font-mono text-xs tabular-nums", leftCls)}>
        {m.status === "LIVE" && <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-red-500 align-middle" />}
        {left}
      </span>

      {/* хозяева */}
      <span className="flex min-w-0 items-center justify-end gap-2 text-sm">
        <span className={cn("truncate", score && score.home > score.away ? "font-bold text-zinc-900" : "font-medium text-zinc-700")}>
          {m.homeTeam.name}
        </span>
      </span>

      {/* счёт */}
      <span className="flex w-16 shrink-0 items-center justify-center rounded-md bg-zinc-100 py-1 font-mono text-sm font-bold tabular-nums">
        {score ? (
          <span className={m.status === "WALKOVER" ? "text-amber-600" : m.status === "LIVE" ? "text-red-600" : "text-zinc-900"}>
            {score.home} : {score.away}
          </span>
        ) : (
          <span className="text-zinc-300">— : —</span>
        )}
      </span>

      {/* гости */}
      <span className="flex min-w-0 items-center gap-2 text-sm">
        <span className={cn("truncate", score && score.away > score.home ? "font-bold text-zinc-900" : "font-medium text-zinc-700")}>
          {m.awayTeam.name}
        </span>
      </span>

      {/* стадион */}
      <span className="hidden justify-self-end text-zinc-300 md:block" title={m.stadium ? `${m.stadium.name}${m.stadium.city ? `, ${m.stadium.city}` : ""}` : undefined}>
        <MapPin className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}
