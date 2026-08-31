"use client";

// Страница лиги: вкладки Матчи / Таблица / Бомбардиры / Дисциплины / Команды / Судьи.
// Роут: #/league/{id}/{tab}. Сезон — переключатель в шапке (по умолчанию текущий).

import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { navigate } from "./router";
import type { OverviewDTO } from "./types";
import { FORMAT_LABELS } from "./types";
import { EmptyState, LoadingBlock } from "./ui-bits";
import CalendarView from "./CalendarView";
import StandingsView from "./StandingsView";
import ScorersView from "./ScorersView";
import DisciplineView from "./DisciplineView";
import TeamsView from "./TeamsView";
import RefereesView from "./RefereesView";

const TABS = [
  { id: "matches", label: "Матчи" },
  { id: "table", label: "Таблица" },
  { id: "scorers", label: "Бомбардиры" },
  { id: "discipline", label: "Дисциплины" },
  { id: "teams", label: "Команды" },
  { id: "referees", label: "Судьи" },
] as const;

interface Props {
  leagueId: string;
  tab: string;
  overview: OverviewDTO | null;
  version: number;
}

export default function LeaguePage({ leagueId, tab, overview, version }: Props) {
  const league = overview?.leagues.find((l) => l.id === leagueId) ?? null;
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
  // сезон: выбранный пользователем (если ещё принадлежит лиге) или текущий
  const currentSeason = league?.seasons.find((s) => s.isCurrent) ?? league?.seasons[0] ?? null;
  const seasonId =
    league && selectedSeasonId && league.seasons.some((s) => s.id === selectedSeasonId)
      ? selectedSeasonId
      : currentSeason?.id ?? "";

  if (!overview) return <LoadingBlock />;
  if (!league) return <EmptyState title="Лига не найдена" hint="Возможно, она была удалена" />;

  const activeTab = TABS.some((t) => t.id === tab) ? tab : "matches";

  return (
    <div className="space-y-3">
      {/* ---------- Шапка лиги ---------- */}
      <div className="rounded-xl border border-zinc-200 bg-white">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3.5">
          <button
            onClick={() => navigate("/")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800"
            aria-label="Назад к ленте"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="shrink-0 rounded bg-emerald-600/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                {FORMAT_LABELS[league.format] ?? league.format}
              </span>
              <h1 className="truncate text-lg font-extrabold tracking-tight text-zinc-900">{league.name}</h1>
            </div>
            <p className="mt-0.5 hidden text-xs text-zinc-400 sm:block">
              {league.yellowCardLimit} ЖК → пропуск · КК → {league.redCardBanMatches} матч · техпоражение {league.walkoverScore}:0
              {league.transferWindowEnd && " · трансферное окно до " + new Date(league.transferWindowEnd).toLocaleDateString("ru-RU")}
            </p>
          </div>
          {league.seasons.length > 1 && (
            <select
              value={seasonId}
              onChange={(e) => setSelectedSeasonId(e.target.value)}
              className="ml-auto rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs font-medium text-zinc-700 focus:border-emerald-400 focus:outline-none"
              aria-label="Сезон"
            >
              {league.seasons.map((s) => (
                <option key={s.id} value={s.id}>{s.name}{s.isCurrent ? " (текущий)" : ""}</option>
              ))}
            </select>
          )}
        </div>

        {/* ---------- Вкладки ---------- */}
        <div className="flex gap-1 overflow-x-auto border-t border-zinc-100 px-2 scrollbar-none">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => navigate(`/league/${leagueId}/${t.id}`)}
              className={cn(
                "relative shrink-0 px-3.5 py-2.5 text-sm font-semibold transition-colors",
                activeTab === t.id ? "text-emerald-600" : "text-zinc-500 hover:text-zinc-800"
              )}
            >
              {t.label}
              {activeTab === t.id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-emerald-500" />}
            </button>
          ))}
        </div>
      </div>

      {/* ---------- Контент вкладки ---------- */}
      {activeTab === "matches" && <CalendarView seasonId={seasonId} version={version} onOpenMatch={(id) => navigate(`/match/${id}`)} />}
      {activeTab === "table" && <StandingsView seasonId={seasonId} version={version} />}
      {activeTab === "scorers" && <ScorersView seasonId={seasonId} version={version} onOpenPlayer={(id) => navigate(`/player/${id}`)} />}
      {activeTab === "discipline" && <DisciplineView seasonId={seasonId} version={version} onOpenPlayer={(id) => navigate(`/player/${id}`)} />}
      {activeTab === "teams" && <TeamsView seasonId={seasonId} version={version} onOpenPlayer={(id) => navigate(`/player/${id}`)} />}
      {activeTab === "referees" && <RefereesView seasonId={seasonId} version={version} />}
    </div>
  );
}
