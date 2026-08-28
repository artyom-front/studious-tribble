"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Trophy, CalendarDays, Target, Ban, Shield, Flag, ArrowRight, ClipboardList } from "lucide-react";
import { useFetch, fmtDate } from "./hooks";
import type { MatchDTO, OverviewDTO } from "./types";
import { LoadingBlock, ScoreBox, StatusBadge, matchScore } from "./ui-bits";
import type { View } from "./Portal";

interface Props {
  overview: OverviewDTO | null;
  onOpenMatch: (id: string) => void;
  onOpenPlayer: (id: string) => void;
  onNavigate: (v: View) => void;
  onRequireLogin: () => void;
}

export default function HomeView({ overview, onOpenMatch, onOpenPlayer, onNavigate }: Props) {
  const firstSeason = overview?.leagues[0]?.seasons.find((s) => s.isCurrent) ?? overview?.leagues[0]?.seasons[0];
  const { data: matchesData } = useFetch<{ matches: MatchDTO[] }>(
    firstSeason ? `/api/public/matches?seasonId=${firstSeason.id}` : null
  );
  const { data: scorers } = useFetch<{ scorers: { personId: string; name: string; teamName: string; goals: number }[] }>(
    firstSeason ? `/api/public/scorers?seasonId=${firstSeason.id}` : null
  );

  const s = overview?.stats;
  const matches = matchesData?.matches ?? [];
  const finished = matches.filter((m) => m.status === "COMPLETED" || m.status === "WALKOVER").slice(-5).reverse();
  const upcoming = matches.filter((m) => m.status === "SCHEDULED").slice(0, 5);
  const topScorers = scorers?.scorers.slice(0, 5) ?? [];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="overflow-hidden rounded-2xl bg-zinc-900 p-6 text-white sm:p-10">
        <div className="max-w-2xl">
          <Badge className="mb-3 bg-emerald-600 hover:bg-emerald-600">Региональный футбольный хаб</Badge>
          <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">
            Турниры, статистика и судейство <span className="text-emerald-400">Чувашии</span> — в одном портале
          </h1>
          <p className="mt-3 text-sm text-zinc-300 sm:text-base">
            «Золотой стандарт» достоверности: автоматические дисквалификации, технические поражения по регламенту,
            контроль заявок на дату матча и глубокая аналитика для игроков, клубов и болельщиков.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => onNavigate("standings")}>
              <Trophy className="mr-1 h-4 w-4" /> Турнирная таблица
            </Button>
            <Button variant="outline" className="border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700" onClick={() => onNavigate("calendar")}>
              <CalendarDays className="mr-1 h-4 w-4" /> Календарь матчей
            </Button>
          </div>
        </div>
      </section>

      {/* Статистика портала */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { icon: Trophy, label: "Лиг", value: s ? overview!.leagues.length : "—" },
          { icon: Shield, label: "Клубов", value: s?.clubs ?? "—" },
          { icon: Users, label: "Игроков", value: s?.persons ?? "—" },
          { icon: CalendarDays, label: "Матчей", value: s?.matches ?? "—" },
          { icon: Target, label: "Голов", value: s?.goals ?? "—" },
          { icon: Ban, label: "Дисквалификаций", value: s?.activeSuspensions ?? "—" },
        ].map((item) => (
          <Card key={item.label} className="border-zinc-200">
            <CardContent className="flex flex-col items-center gap-1 p-4 text-center">
              <item.icon className="h-5 w-5 text-emerald-600" />
              <p className="text-2xl font-bold tabular-nums">{item.value}</p>
              <p className="text-xs text-zinc-500">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Последние результаты */}
        <Card className="border-zinc-200 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><ClipboardList className="h-4 w-4 text-emerald-600" /> Последние результаты</CardTitle>
            <Button variant="ghost" size="sm" className="text-emerald-600" onClick={() => onNavigate("calendar")}>
              Все матчи <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {finished.length === 0 && <p className="py-6 text-center text-sm text-zinc-400">Матчи ещё не сыграны</p>}
            {finished.map((m) => {
              const score = matchScore(m);
              return (
                <button
                  key={m.id}
                  onClick={() => onOpenMatch(m.id)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-zinc-50"
                >
                  <div className="w-24 shrink-0 text-xs text-zinc-400">{fmtDate(m.kickoff, false).replace(", 00:00", "")}</div>
                  <div className="flex flex-1 items-center justify-end gap-2 text-sm font-medium">
                    <span className="truncate">{m.homeTeam.name}</span>
                    <ScoreBox score={score} status={m.status} />
                    <span className="truncate">{m.awayTeam.name}</span>
                  </div>
                  <div className="w-32 shrink-0 text-right">
                    <StatusBadge status={m.status} />
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Топ бомбардиры */}
        <Card className="border-zinc-200">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><Target className="h-4 w-4 text-emerald-600" /> Бомбардиры</CardTitle>
            <Button variant="ghost" size="sm" className="text-emerald-600" onClick={() => onNavigate("scorers")}>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {topScorers.length === 0 && <p className="py-6 text-center text-sm text-zinc-400">Нет данных</p>}
            {topScorers.map((p, i) => (
              <button
                key={p.personId}
                onClick={() => onOpenPlayer(p.personId)}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-zinc-50"
              >
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${i === 0 ? "bg-emerald-600 text-white" : "bg-zinc-100 text-zinc-600"}`}>
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="truncate text-xs text-zinc-400">{p.teamName}</p>
                </div>
                <span className="font-mono text-sm font-bold text-emerald-600">{p.goals}</span>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Ближайшие матчи */}
      <Card className="border-zinc-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><CalendarDays className="h-4 w-4 text-emerald-600" /> Ближайшие матчи</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.length === 0 && <p className="py-6 text-center text-sm text-zinc-400">Расписание завершено</p>}
            {upcoming.map((m) => (
              <button
                key={m.id}
                onClick={() => onOpenMatch(m.id)}
                className="rounded-xl border border-zinc-200 p-4 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50/40"
              >
                <p className="text-xs text-zinc-400">
                  {m.round ? `${m.round}-й тур · ` : ""}{fmtDate(m.kickoff)}
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {m.homeTeam.name} <span className="text-zinc-300">—</span> {m.awayTeam.name}
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-zinc-400">
                  <Flag className="h-3 w-3" /> {m.stadium?.name ?? "Стадион уточняется"}
                </p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
