"use client";

// Профиль команды: клуб/город, позиция в таблице, тренер, состав (клик — в игрока),
// календарь матчей (клик — в матч), лиги кликабельны.

import { useState } from "react";
import { Building2, MapPin, Shield, UserCog, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFetch } from "./hooks";
import { navigate } from "./router";
import type { MatchDTO } from "./types";
import { FORMAT_LABELS } from "./types";
import { LoadingBlock, EmptyState, matchScore } from "./ui-bits";

interface TeamDetail {
  team: {
    id: string; name: string; city: string | null; logoUrl: string | null;
    club: { id: string; name: string; city: string | null; description: string | null } | null;
  };
  seasons: {
    season: { id: string; name: string; league: { id: string; name: string; format: string } };
    players: { id: string; name: string; position: string | null; number: number | null; endDate: string | null }[];
    coaches: { id: string; name: string; endDate: string | null }[];
  }[];
  standings: { season: { id: string; name: string; league: { id: string; name: string; format: string } }; position: number; points: number; games: number; wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number }[];
  matches: (MatchDTO & { league: { id: string; name: string; format: string } })[];
}

export default function TeamPage({ teamId, version }: { teamId: string; version: number }) {
  const { data, error } = useFetch<TeamDetail>(`/api/public/teams/${teamId}`, version);
  const [matchFilter, setMatchFilter] = useState<"all" | "played" | "upcoming">("all");

  if (error) return <EmptyState title="Команда не найдена" hint={error} />;
  if (!data || !data.team) return <LoadingBlock label="Загрузка команды..." />;

  const { team, seasons, standings, matches } = data;
  const current = seasons[0];
  const matchesFiltered = matches.filter((m) => {
    if (matchFilter === "played") return m.status === "COMPLETED" || m.status === "WALKOVER";
    if (matchFilter === "upcoming") return m.status === "SCHEDULED" || m.status === "POSTPONED" || m.status === "LIVE";
    return true;
  });

  const groupByPos = ["GK", "DF", "MF", "FW"];

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
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600/10">
            <Shield className="h-6 w-6 text-emerald-600" />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold tracking-tight text-zinc-900">{team.name}</h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-400">
              {team.club && (
                <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{team.club.name}</span>
              )}
              {(team.city ?? team.club?.city) && (
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{team.city ?? team.club?.city}</span>
              )}
              {current && (
                <span className="cursor-pointer hover:text-emerald-600" onClick={() => navigate(`/league/${current.season.league.id}`)}>
                  {current.season.league.name} · {FORMAT_LABELS[current.season.league.format] ?? current.season.league.format}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ---------- Таблица (позиция в сезоне) ---------- */}
      {standings.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="mb-3 text-sm font-bold">Турнирное положение</p>
          <div className="space-y-2">
            {standings.map((s) => (
              <button
                key={s.season.id}
                onClick={() => navigate(`/league/${s.season.league.id}/table`)}
                className="flex w-full items-center gap-3 rounded-xl border border-zinc-200 px-4 py-3 text-left hover:border-emerald-300"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 font-mono text-sm font-bold text-white">
                  {s.position}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-800">{s.season.league.name}</p>
                  <p className="text-xs text-zinc-400">{s.season.name}</p>
                </div>
                <div className="ml-auto flex items-center gap-3 text-center font-mono text-xs text-zinc-500">
                  <span><b className="block text-sm text-zinc-800">{s.games}</b>игр</span>
                  <span><b className="block text-sm text-zinc-800">{s.wins}-{s.draws}-{s.losses}</b>В-Н-П</span>
                  <span><b className="block text-sm text-zinc-800">{s.goalsFor}:{s.goalsAgainst}</b>голы</span>
                  <span><b className="block text-base text-emerald-600">{s.points}</b>очки</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3 xl:grid-cols-2">
        {/* ---------- Состав + тренер ---------- */}
        {current && (
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold">Состав · {current.season.name}</p>
              <span className="text-xs text-zinc-400">{current.players.length} игроков</span>
            </div>
            {current.coaches.length > 0 && (
              <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <UserCog className="h-4 w-4 text-amber-600" />
                {current.coaches.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => navigate(`/player/${c.id}`)}
                    className="text-sm font-semibold text-zinc-800 hover:text-emerald-700"
                  >
                    {c.name}
                  </button>
                ))}
                <span className="text-xs text-zinc-400">тренерский штаб</span>
              </div>
            )}
            <div className="space-y-1">
              {groupByPos.map((pos) => {
                const group = current.players.filter((p) => p.position === pos);
                if (group.length === 0) return null;
                return (
                  <div key={pos}>
                    <p className="px-1 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                      {pos === "GK" ? "Вратари" : pos === "DF" ? "Защитники" : pos === "MF" ? "Полузащитники" : "Нападающие"}
                    </p>
                    {group.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => navigate(`/player/${p.id}`)}
                        className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-zinc-50"
                      >
                        <span className="w-7 shrink-0 text-center font-mono text-xs text-zinc-400">{p.number ?? "—"}</span>
                        <span className="min-w-0 flex-1 truncate font-medium text-zinc-700">{p.name}</span>
                        {p.endDate && <span className="text-[10px] text-amber-500">отзаявлен</span>}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ---------- Матчи ---------- */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold">Матчи</p>
            <div className="flex gap-1">
              {([["all", "Все"], ["played", "Сыгранные"], ["upcoming", "Предстоящие"]] as const).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setMatchFilter(id)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
                    matchFilter === id ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-[480px] space-y-1 overflow-y-auto">
            {matchesFiltered.length === 0 && <p className="py-6 text-center text-xs text-zinc-400">Нет матчей</p>}
            {matchesFiltered.map((m) => {
              const isHome = m.homeTeam.id === teamId;
              const score = matchScore(m);
              const time = new Date(m.kickoff);
              return (
                <button
                  key={m.id}
                  onClick={() => navigate(`/match/${m.id}`)}
                  className="flex w-full items-center gap-3 rounded-lg border border-zinc-100 px-3 py-2 text-left text-sm hover:bg-emerald-50/40"
                >
                  <span className="w-16 shrink-0 text-[11px] text-zinc-400">
                    {time.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", timeZone: "Europe/Moscow" })}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    <span className={isHome ? "font-bold text-zinc-900" : "text-zinc-500"}>{m.homeTeam.name}</span>
                    <span className="mx-1 text-zinc-300">vs</span>
                    <span className={!isHome ? "font-bold text-zinc-900" : "text-zinc-500"}>{m.awayTeam.name}</span>
                  </span>
                  <span className={cn("shrink-0 font-mono text-sm font-bold", m.status === "WALKOVER" ? "text-amber-600" : "text-zinc-800")}>
                    {score ? `${score.home}:${score.away}` : time.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Moscow" })}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
