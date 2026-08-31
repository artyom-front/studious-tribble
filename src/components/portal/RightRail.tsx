"use client";

// Правая колонка: баннеры (RIGHT_TOP/RIGHT_BOTTOM), «Матч тура» (ближайший топ-матч),
// «Самый результативный» и топ бомбардиров с переключателем лиги и табами Голы/Ассист/ЖК/КК.

import { useMemo, useState } from "react";
import { CalendarClock, Flame, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFetch } from "./hooks";
import { navigate } from "./router";
import type { BannerDTO, MatchDTO, MatchDayDTO, OverviewDTO, PlayerStatRowDTO } from "./types";
import { FORMAT_LABELS } from "./types";
import { matchScore } from "./ui-bits";

interface Props {
  overview: OverviewDTO | null;
  banners: BannerDTO[];
  version: number;
}

const STAT_TABS = [
  { id: "goals", label: "Голы" },
  { id: "assists", label: "Ассист" },
  { id: "yc", label: "ЖК" },
  { id: "rc", label: "КК" },
] as const;

export default function RightRail({ overview, banners, version }: Props) {
  const pinned = (overview?.leagues ?? []).filter((l) => l.isPinned).sort((a, b) => a.priority - b.priority);
  const allLeagues = overview?.leagues ?? [];
  const [leagueId, setLeagueId] = useState<string>("");
  const [statTab, setStatTab] = useState<(typeof STAT_TABS)[number]["id"]>("goals");

  const selectedLeague = allLeagues.find((l) => l.id === leagueId) ?? pinned[0] ?? allLeagues[0];
  const season = selectedLeague?.seasons.find((s) => s.isCurrent) ?? selectedLeague?.seasons[0];

  // Лента всех матчей — для «Матч тура» и «Самого результативного»
  const { data: dayData } = useFetch<{ leagues: MatchDayDTO[] }>(overview ? "/api/public/matches/day?date=all" : null, version);
  const { data: scorers } = useFetch<{ scorers: PlayerStatRowDTO[]; assisters: PlayerStatRowDTO[]; fairPlay: PlayerStatRowDTO[] }>(
    season ? `/api/public/scorers?seasonId=${season.id}` : null,
    version
  );

  const { hotMatch, bestMatch } = useMemo(() => {
    const all = (dayData?.leagues ?? []).flatMap((l) => l.matches);
    const now = Date.now();
    const upcoming = all
      .filter((m) => m.status === "SCHEDULED" && new Date(m.kickoff).getTime() >= now)
      .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());
    const live = all.filter((m) => m.status === "LIVE");
    const hot = live[0] ?? upcoming[0] ?? null;
    const best = all
      .filter((m) => m.status === "COMPLETED")
      .sort((a, b) => (b.homeScore ?? 0) + (b.awayScore ?? 0) - (a.homeScore ?? 0) - (a.awayScore ?? 0))[0] ?? null;
    return { hotMatch: hot, bestMatch: best };
  }, [dayData]);

  const statRows = useMemo(() => {
    if (!scorers) return [];
    switch (statTab) {
      case "goals":
        return scorers.scorers.slice(0, 5).map((p) => ({ p, v: p.goals }));
      case "assists":
        return scorers.assisters.slice(0, 5).map((p) => ({ p, v: p.assists }));
      case "yc":
        return [...scorers.fairPlay].sort((a, b) => b.yellowCards - a.yellowCards).slice(0, 5).map((p) => ({ p, v: p.yellowCards }));
      case "rc":
        return [...scorers.fairPlay].sort((a, b) => b.redCards - a.redCards).filter((p) => p.redCards > 0).slice(0, 5).map((p) => ({ p, v: p.redCards }));
    }
  }, [scorers, statTab]);

  const topBanner = banners.find((b) => b.placement === "RIGHT_TOP");
  const bottomBanner = banners.find((b) => b.placement === "RIGHT_BOTTOM");

  return (
    <div className="space-y-4">
      <BannerSlot banner={topBanner} />

      {/* ---------- Матч тура ---------- */}
      {hotMatch && <FeaturedMatch match={hotMatch} kind="hot" />}

      {/* ---------- Самый результативный ---------- */}
      {bestMatch && <FeaturedMatch match={bestMatch} kind="best" />}

      {/* ---------- Бомбардиры ---------- */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="flex items-center gap-1.5 border-b border-zinc-100 bg-zinc-50 px-3 py-2.5">
          <Target className="h-3.5 w-3.5 text-emerald-600" />
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-600">Топ игроков</p>
        </div>
        <div className="flex items-center gap-1 border-b border-zinc-100 px-2 py-2">
          <select
            value={selectedLeague?.id ?? ""}
            onChange={(e) => setLeagueId(e.target.value)}
            className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs font-medium text-zinc-700 focus:border-emerald-400 focus:outline-none"
            aria-label="Лига"
          >
            {allLeagues.map((l) => (
              <option key={l.id} value={l.id}>
                {l.shortName ?? l.name} · {FORMAT_LABELS[l.format] ?? l.format}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-4 border-b border-zinc-100">
          {STAT_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setStatTab(t.id)}
              className={cn(
                "py-2 text-xs font-semibold transition-colors",
                statTab === t.id ? "border-b-2 border-emerald-500 text-emerald-700" : "text-zinc-400 hover:text-zinc-600"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        {statRows.length === 0 && <p className="py-5 text-center text-xs text-zinc-400">Нет данных</p>}
        {statRows.map(({ p, v }, i) => (
          <button
            key={p.personId}
            onClick={() => navigate(`/player/${p.personId}`)}
            className="flex w-full items-center gap-2.5 border-b border-zinc-50 px-3 py-2 text-left hover:bg-zinc-50"
          >
            <span className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
              i === 0 ? "bg-emerald-600 text-white" : "bg-zinc-100 text-zinc-500"
            )}>
              {i + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold text-zinc-800">{p.name}</span>
              <span className="block truncate text-[10px] text-zinc-400">{p.teamName}</span>
            </span>
            <span className="font-mono text-sm font-bold text-emerald-600">{v}</span>
          </button>
        ))}
        {selectedLeague && (
          <button
            onClick={() => navigate(`/league/${selectedLeague.id}/scorers`)}
            className="w-full py-2 text-center text-[11px] font-semibold text-emerald-600 hover:text-emerald-700"
          >
            Весь список →
          </button>
        )}
      </div>

      <BannerSlot banner={bottomBanner} />
    </div>
  );
}

/** Карточка «Матч тура» / «Самый результативный» */
function FeaturedMatch({ match, kind }: { match: MatchDTO; kind: "hot" | "best" }) {
  const isHot = kind === "hot";
  const score = matchScore(match);
  const shown = score ? `${score.home}:${score.away}` : null;
  const time = new Date(match.kickoff);
  const timeStr = time.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Moscow" });
  const dateStr = time.toLocaleDateString("ru-RU", { day: "numeric", month: "short", timeZone: "Europe/Moscow" });

  return (
    <button
      onClick={() => navigate(`/match/${match.id}`)}
      className="w-full overflow-hidden rounded-xl border border-zinc-200 bg-white text-left transition-colors hover:border-emerald-300"
    >
      <div className={cn("flex items-center gap-1.5 px-3 py-2", isHot ? "bg-red-50" : "bg-amber-50")}>
        {isHot ? <CalendarClock className="h-3.5 w-3.5 text-red-500" /> : <Flame className="h-3.5 w-3.5 text-amber-500" />}
        <p className={cn("text-xs font-bold uppercase tracking-wide", isHot ? "text-red-600" : "text-amber-700")}>
          {isHot ? (match.status === "LIVE" ? "Прямо сейчас" : "Матч тура") : "Самый результативный"}
        </p>
        {isHot && match.status === "LIVE" && <span className="ml-auto flex items-center gap-1 text-[10px] font-bold text-red-600"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />LIVE</span>}
      </div>
      <div className="px-3 py-3">
        <div className="flex items-center justify-between gap-2 text-sm font-semibold text-zinc-800">
          <span className="min-w-0 flex-1 truncate text-right">{match.homeTeam.name}</span>
          <span className="shrink-0 rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-sm font-bold tabular-nums text-zinc-900">
            {shown ?? timeStr}
          </span>
          <span className="min-w-0 flex-1 truncate">{match.awayTeam.name}</span>
        </div>
        <p className="mt-2 flex items-center gap-2 text-[11px] text-zinc-400">
          <span>{match.round ? `${match.round}-й тур` : ""}</span>
          <span>·</span>
          <span>{dateStr}</span>
          {match.stadium && <><span>·</span><span className="truncate">{match.stadium.name}</span></>}
        </p>
      </div>
    </button>
  );
}

/** Слот баннера 300×250; если пусто — заглушка «Реклама» */
export function BannerSlot({ banner }: { banner: BannerDTO | undefined }) {
  if (!banner) {
    return (
      <div className="flex h-[190px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 bg-white/60 px-4 text-center">
        <p className="text-xs font-bold uppercase tracking-wide text-zinc-300">Реклама</p>
        <p className="mt-1 text-[10px] text-zinc-300">Слот 300×250 · управляется в админ-панели</p>
      </div>
    );
  }
  return (
    <a
      href={banner.linkUrl ?? "#"}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="flex h-[190px] flex-col justify-between rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4"
    >
      <div>
        <p className="text-sm font-bold text-zinc-800">{banner.title}</p>
        {banner.text && <p className="mt-1 text-xs text-zinc-500">{banner.text}</p>}
      </div>
      <span className="self-start rounded-md bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-zinc-900">Реклама</span>
    </a>
  );
}
