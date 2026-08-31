"use client";

// Левый сайдбар: «Топ-лиги» (закреплены админом, раскрыты с мини-таблицей топ-5)
// + «Все лиги» свёрнуты по видам футбола. Клик — проваливание в лигу/команду.

import { useState } from "react";
import { ChevronDown, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFetch } from "./hooks";
import { navigate } from "./router";
import type { LeagueDTO, OverviewDTO, StandingRowDTO } from "./types";
import { FORMAT_LABELS } from "./types";

interface Props {
  overview: OverviewDTO | null;
  version: number;
  activeLeagueId: string | null;
}

export default function LeaguesSidebar({ overview, version, activeLeagueId }: Props) {
  const leagues = overview?.leagues ?? [];
  const pinned = leagues.filter((l) => l.isPinned).sort((a, b) => a.priority - b.priority);
  const rest = leagues.filter((l) => !l.isPinned);
  const [openLeagueId, setOpenLeagueId] = useState<string | null>(pinned[0]?.id ?? null);
  const [openFormats, setOpenFormats] = useState<Record<string, boolean>>({});

  if (!overview) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-400">Загрузка лиг...</div>
    );
  }

  const LeagueRow = ({ league, active, withChevron, expanded, onToggle }: { league: LeagueDTO; active: boolean; withChevron?: boolean; expanded?: boolean; onToggle?: () => void }) => (
    <div>
      <div className={cn("flex items-center", active && "bg-emerald-50")}>
        <button
          onClick={() => navigate(`/league/${league.id}`)}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
            active ? "font-semibold text-emerald-800" : "text-zinc-700 hover:bg-zinc-50"
          )}
        >
          <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold text-zinc-500">
            {FORMAT_LABELS[league.format] ?? league.format}
          </span>
          <span className="min-w-0 flex-1 truncate">{league.shortName ?? league.name}</span>
        </button>
        {withChevron && onToggle && (
          <button
            onClick={onToggle}
            className="shrink-0 px-2 py-2 text-zinc-400 hover:text-zinc-600"
            aria-label={expanded ? "Свернуть таблицу" : "Показать таблицу"}
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
          </button>
        )}
      </div>
      {withChevron && expanded && <MiniStandings league={league} version={version} />}
    </div>
  );

  return (
    <nav className="space-y-3" aria-label="Лиги">
      {/* ---------- Топ-лиги (закреплены админом) ---------- */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="flex items-center gap-1.5 border-b border-zinc-100 bg-zinc-50 px-3 py-2.5">
          <Trophy className="h-3.5 w-3.5 text-emerald-600" />
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-600">Топ-лиги</p>
        </div>
        {pinned.map((l) => (
          <LeagueRow
            key={l.id}
            league={l}
            active={activeLeagueId === l.id}
            withChevron
            expanded={openLeagueId === l.id}
            onToggle={() => setOpenLeagueId(openLeagueId === l.id ? null : l.id)}
          />
        ))}
        {pinned.length === 0 && <p className="px-3 py-3 text-xs text-zinc-400">Нет закреплённых лиг</p>}
      </div>

      {/* ---------- Все лиги (свёрнуты по видам) ---------- */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 bg-zinc-50 px-3 py-2.5">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-600">Все лиги</p>
        </div>
        {Object.entries(FORMAT_LABELS).map(([fmt, label]) => {
          const group = rest.filter((l) => l.format === fmt);
          const hasPinned = pinned.some((l) => l.format === fmt);
          if (group.length === 0 && !hasPinned) return null;
          const open = !!openFormats[fmt];
          return (
            <div key={fmt} className="border-b border-zinc-100 last:border-b-0">
              <button
                onClick={() => setOpenFormats((s) => ({ ...s, [fmt]: !s[fmt] }))}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-zinc-500 hover:bg-zinc-50"
              >
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
                {label}
                <span className="ml-auto text-[10px] font-normal text-zinc-300">{group.length}</span>
              </button>
              {open && (
                <div className="bg-zinc-50/50">
                  {group.map((l) => (
                    <LeagueRow key={l.id} league={l} active={activeLeagueId === l.id} />
                  ))}
                  {group.length === 0 && <p className="px-3 py-2 text-[11px] text-zinc-300">Все лиги формата — в «Топ-лигах»</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}

/** Мини-таблица топ-5 текущего сезона лиги */
function MiniStandings({ league, version }: { league: LeagueDTO; version: number }) {
  const season = league.seasons.find((s) => s.isCurrent) ?? league.seasons[0];
  const { data } = useFetch<{ standings: StandingRowDTO[] }>(
    season ? `/api/public/standings?seasonId=${season.id}` : null,
    version
  );
  const rows = (data?.standings ?? []).slice(0, 5);
  if (!season) return null;

  return (
    <div className="bg-zinc-50/60 pb-1">
      {rows.map((r) => (
        <button
          key={r.teamId}
          onClick={() => navigate(`/team/${r.teamId}`)}
          className="flex w-full items-center gap-2 px-3 py-1.5 pl-7 text-xs text-zinc-600 hover:bg-white"
        >
          <span className="w-4 text-center font-mono text-[10px] text-zinc-400">{r.position}</span>
          <span className="min-w-0 flex-1 truncate text-left font-medium">{r.teamName}</span>
          <span className="text-[10px] text-zinc-400">{r.games}</span>
          <span className="w-6 text-right font-mono font-bold text-zinc-700">{r.points}</span>
        </button>
      ))}
      <button
        onClick={() => navigate(`/league/${league.id}/table`)}
        className="w-full px-3 py-1.5 text-right text-[11px] font-semibold text-emerald-600 hover:text-emerald-700"
      >
        Полная таблица →
      </button>
    </div>
  );
}
