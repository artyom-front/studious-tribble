"use client";

// Профиль стадиона: характеристики, статистика (матчи/голы/средняя результативность),
// календарь сыгранных и предстоящих матчей.

import { useState } from "react";
import { MapPin, Users, Goal, BarChart3, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFetch } from "./hooks";
import { navigate } from "./router";
import type { MatchDTO } from "./types";
import { LoadingBlock, EmptyState, matchScore } from "./ui-bits";

interface StadiumDetail {
  stadium: { id: string; name: string; city: string | null; address: string | null; capacity: number | null };
  stats: { hosted: number; goals: number; avgGoals: number };
  matches: (MatchDTO & { league: { id: string; name: string; format: string } })[];
}

export default function StadiumPage({ stadiumId }: { stadiumId: string }) {
  const { data, error } = useFetch<StadiumDetail>(`/api/public/stadiums/${stadiumId}`);
  const [matchFilter, setMatchFilter] = useState<"all" | "played" | "upcoming">("all");

  if (error) return <EmptyState title="Стадион не найден" hint={error} />;
  if (!data || !data.stadium) return <LoadingBlock label="Загрузка стадиона..." />;

  const { stadium, stats, matches } = data;
  const matchesFiltered = matches.filter((m) => {
    if (matchFilter === "played") return m.status === "COMPLETED" || m.status === "WALKOVER";
    if (matchFilter === "upcoming") return m.status === "SCHEDULED" || m.status === "POSTPONED" || m.status === "LIVE";
    return true;
  });

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
            <MapPin className="h-6 w-6 text-emerald-600" />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold tracking-tight text-zinc-900">СК «{stadium.name}»</h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-zinc-400">
              {stadium.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{stadium.city}</span>}
              {stadium.address && <span>{stadium.address}</span>}
              {stadium.capacity && <span className="flex items-center gap-1"><Users className="h-3 w-3" />вместимость {stadium.capacity.toLocaleString("ru-RU")}</span>}
            </p>
          </div>
        </div>
      </div>

      {/* ---------- Статистика ---------- */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: BarChart3, label: "Матчей проведено", value: stats.hosted },
          { icon: Goal, label: "Голов забито", value: stats.goals },
          { icon: BarChart3, label: "Голов за матч", value: stats.avgGoals },
        ].map((s) => (
          <div key={s.label} className="flex flex-col items-center gap-1 rounded-xl border border-zinc-200 bg-white p-4 text-center">
            <s.icon className="h-5 w-5 text-emerald-600" />
            <p className="font-mono text-2xl font-extrabold tabular-nums text-zinc-900">{s.value}</p>
            <p className="text-xs text-zinc-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ---------- Матчи ---------- */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold">Матчи на стадионе</p>
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
                <span className="min-w-0 flex-1 truncate font-medium text-zinc-700">
                  {m.homeTeam.name} <span className="text-zinc-300">vs</span> {m.awayTeam.name}
                </span>
                <span className="hidden max-w-[140px] shrink-0 truncate text-[11px] text-zinc-400 md:block">{m.league.name}</span>
                <span className={cn("shrink-0 font-mono text-sm font-bold", m.status === "WALKOVER" ? "text-amber-600" : "text-zinc-800")}>
                  {score ? `${score.home}:${score.away}` : time.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Moscow" })}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
