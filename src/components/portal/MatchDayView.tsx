"use client";

// Главная — livescore-лента «Ночь под прожекторами»:
// фильтры даты/статуса, матчи по лигам, избранное-звёзды, LIVE-акценты.

import { useMemo, useState } from "react";
import { CalendarDays, ChevronRight, MapPin, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFetch } from "./hooks";
import { navigate, mskDay } from "./router";
import type { MatchDayDTO, MatchDTO, OverviewDTO } from "./types";
import { FormatChip } from "./visuals";
import { LoadingBlock, matchScore, EmptyState } from "./ui-bits";

interface Props {
  format: string;
  overview: OverviewDTO | null;
  version: number;
  favs: string[];
  onToggleFav: (leagueId: string) => void;
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

export default function MatchDayView({ format, version, favs, onToggleFav }: Props) {
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
    const filtered = src.map((l) => ({ ...l, matches: l.matches.filter(filterFn) })).filter((l) => l.matches.length > 0);
    // Избранные лиги — вверху ленты
    return filtered.sort((a, b) => Number(favs.includes(b.league.id)) - Number(favs.includes(a.league.id)));
  }, [data, status, favs]);

  const totalMatches = leagues.reduce((sum, l) => sum + l.matches.length, 0);

  return (
    <div className="space-y-3">
      {/* ---------- Фильтры ---------- */}
      <div className="rounded-xl border border-sline bg-s1">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-sline/60 px-4 py-3">
          {DAY_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => { setDayTab(t.id); setCustomDate(null); }}
              className={cn(
                "relative pb-0.5 text-sm font-semibold transition-colors",
                dayTab === t.id && !customDate ? "text-gold" : "text-ink2 hover:text-ink"
              )}
            >
              {t.label}
              {dayTab === t.id && !customDate && <span className="absolute inset-x-0 -bottom-[13px] h-0.5 rounded-full bg-gold" />}
            </button>
          ))}
          <label className="flex items-center gap-1.5 text-xs text-ink3">
            <CalendarDays className="h-3.5 w-3.5" />
            <input
              type="date"
              value={customDate ?? ""}
              onChange={(e) => e.target.value && setCustomDate(e.target.value)}
              className="rounded-md border border-sline bg-s1 px-2 py-1 text-xs text-ink2 focus:border-gold focus:outline-none [color-scheme:dark]"
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
                      ? "bg-live text-white"
                      : "bg-gold text-goldink"
                    : "bg-s2 text-ink2 hover:text-ink"
                )}
              >
                {t.id === "live" && <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-white align-middle live-dot" />}
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
        <EmptyState title="В этот день матчей нет" hint="Попробуйте «Все даты» или выберите другую дату в календаре" />
      )}
      {leagues.map((l) => (
        <section key={l.league.id} className="overflow-hidden rounded-xl border border-sline bg-s1">
          {/* Заголовок лиги */}
          <div className="flex items-center gap-2 border-b border-sline/60 bg-s2/50 px-4 py-2.5">
            <FormatChip format={l.league.format} />
            <button
              onClick={() => navigate(`/league/${l.league.id}`)}
              className="text-sm font-bold text-ink hover:text-gold"
            >
              {l.league.name}
            </button>
            <span className="hidden text-[11px] text-ink3 sm:inline">· {l.season.name}</span>
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={() => onToggleFav(l.league.id)}
                className={cn("flex h-7 w-7 items-center justify-center rounded-lg transition-colors", favs.includes(l.league.id) ? "text-gold" : "text-ink3 hover:text-ink2")}
                aria-label={favs.includes(l.league.id) ? "Убрать из избранного" : "Добавить в избранное"}
                title={favs.includes(l.league.id) ? "Убрать из избранного" : "В избранное"}
              >
                <Star className={cn("h-4 w-4", favs.includes(l.league.id) && "fill-gold")} />
              </button>
              <button
                onClick={() => navigate(`/league/${l.league.id}/table`)}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-gold hover:bg-gold/10"
              >
                Таблица
              </button>
              <ChevronRight className="h-3.5 w-3.5 text-ink3" />
            </div>
          </div>
          {l.matches.map((m) => <MatchRow key={m.id} m={m} />)}
        </section>
      ))}
    </div>
  );
}

/** Строка матча в стиле livescore (тёмная) */
function MatchRow({ m }: { m: MatchDTO }) {
  const score = matchScore(m);
  const time = new Date(m.kickoff);
  const timeStr = time.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Moscow" });
  const dateStr = time.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", timeZone: "Europe/Moscow" });

  const left = m.status === "SCHEDULED" || m.status === "POSTPONED" ? timeStr : m.status === "LIVE" ? "LIVE" : dateStr;

  return (
    <button
      onClick={() => navigate(`/match/${m.id}`)}
      className={cn(
        "grid w-full grid-cols-[64px_minmax(0,1fr)_auto_minmax(0,1fr)_24px] items-center gap-2 border-b border-sline/40 px-4 py-2.5 text-left transition-colors last:border-b-0 hover:bg-s2/60",
        m.status === "LIVE" && "bg-live/[0.06]"
      )}
    >
      {/* время / статус */}
      {m.status === "LIVE" ? (
        <span className="flex items-center gap-1.5 font-mono text-xs font-bold text-live">
          <span className="h-1.5 w-1.5 rounded-full bg-live live-dot" />
          {left}
        </span>
      ) : (
        <span className={cn("font-mono text-xs tabular", m.status === "COMPLETED" || m.status === "WALKOVER" ? "text-ink3" : "font-semibold text-ink2")}>
          {left}
        </span>
      )}

      {/* хозяева */}
      <span className="flex min-w-0 items-center justify-end gap-2 text-sm">
        <span className={cn("truncate", score && score.home > score.away ? "font-bold text-ink" : "font-medium text-ink2")}>
          {m.homeTeam.name}
        </span>
      </span>

      {/* счёт */}
      <span className="flex w-16 shrink-0 items-center justify-center rounded-md bg-s2 py-1 font-mono text-sm font-bold tabular">
        {score ? (
          <span className={m.status === "WALKOVER" ? "text-amber-400" : m.status === "LIVE" ? "text-live" : "text-ink"}>
            {score.home} : {score.away}
          </span>
        ) : (
          <span className="text-ink3">— : —</span>
        )}
      </span>

      {/* гости */}
      <span className="flex min-w-0 items-center gap-2 text-sm">
        <span className={cn("truncate", score && score.away > score.home ? "font-bold text-ink" : "font-medium text-ink2")}>
          {m.awayTeam.name}
        </span>
      </span>

      {/* стадион */}
      <span className="hidden justify-self-end text-ink3 md:block" title={m.stadium ? `${m.stadium.name}${m.stadium.city ? `, ${m.stadium.city}` : ""}` : undefined}>
        <MapPin className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}
