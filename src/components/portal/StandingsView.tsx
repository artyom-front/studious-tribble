"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";
import { useFetch } from "./hooks";
import type { StandingRowDTO } from "./types";
import { LoadingBlock, ErrorBlock, FormBadges, EmptyState } from "./ui-bits";

interface StandingsResponse {
  season: { name: string; league: { name: string; format: string } };
  stage: { name: string; tieBreakers: string } | null;
  standings: StandingRowDTO[];
}

const TIE_LABELS: Record<string, string> = {
  points: "очки",
  head_to_head: "личные встречи",
  goal_diff: "разница мячей",
  goals_for: "забитые мячи",
  wins: "победы",
  fair_play: "fair play (ЖК+КК)",
  name: "алфавит",
};

export default function StandingsView({ seasonId, version }: { seasonId: string; version: number }) {
  const { data, loading, error } = useFetch<StandingsResponse>(seasonId ? `/api/public/standings?seasonId=${seasonId}` : null, version);

  if (!seasonId) return <EmptyState title="Сезон не выбран" />;
  if (loading && !data) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;
  if (!data) return null;

  const rows = data.standings;
  const tie = data.stage?.tieBreakers?.split(",").filter(Boolean) ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Турнирная таблица</h2>
        <p className="text-sm text-zinc-500">{data.season.league.name} · {data.season.name}</p>
      </div>

      <Card className="overflow-hidden border-zinc-200">
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                <th className="w-10 px-3 py-3 text-center font-semibold">#</th>
                <th className="px-3 py-3 text-left font-semibold">Команда</th>
                <th className="w-12 px-2 py-3 text-center font-semibold" title="Игры">И</th>
                <th className="w-12 px-2 py-3 text-center font-semibold" title="Победы">В</th>
                <th className="w-12 px-2 py-3 text-center font-semibold" title="Ничьи">Н</th>
                <th className="w-12 px-2 py-3 text-center font-semibold" title="Поражения">П</th>
                <th className="w-24 px-2 py-3 text-center font-semibold" title="Забито:Пропущено">Мячи</th>
                <th className="w-12 px-2 py-3 text-center font-semibold" title="Разница">±</th>
                <th className="w-12 px-2 py-3 text-center font-semibold" title="Очки">О</th>
                <th className="w-28 px-2 py-3 text-center font-semibold" title="ЖК/КК">Дисц.</th>
                <th className="w-32 px-3 py-3 text-center font-semibold" title="Последние 5 матчей">Форма</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.teamId} className={`border-b border-zinc-100 ${r.position === 1 ? "bg-emerald-50/50" : ""} hover:bg-zinc-50`}>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${r.position === 1 ? "bg-emerald-600 text-white" : "text-zinc-500"}`}>
                      {r.position}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="font-medium">{r.teamName}</p>
                    {r.clubName && <p className="text-xs text-zinc-400">{r.clubName}</p>}
                  </td>
                  <td className="px-2 py-2.5 text-center tabular-nums">{r.games}</td>
                  <td className="px-2 py-2.5 text-center tabular-nums font-medium text-emerald-700">{r.wins}</td>
                  <td className="px-2 py-2.5 text-center tabular-nums">{r.draws}</td>
                  <td className="px-2 py-2.5 text-center tabular-nums text-red-500">{r.losses}</td>
                  <td className="px-2 py-2.5 text-center font-mono text-xs tabular-nums">{r.goalsFor}:{r.goalsAgainst}</td>
                  <td className="px-2 py-2.5 text-center tabular-nums">{r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}</td>
                  <td className="px-2 py-2.5 text-center text-base font-bold tabular-nums">{r.points}</td>
                  <td className="px-2 py-2.5 text-center text-xs">
                    <span className="mr-1 rounded bg-yellow-100 px-1.5 py-0.5 font-mono text-yellow-700">{r.yellowCards}</span>
                    <span className="rounded bg-red-100 px-1.5 py-0.5 font-mono text-red-700">{r.redCards}</span>
                  </td>
                  <td className="px-3 py-2.5"><div className="flex justify-center"><FormBadges form={r.form} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500">
          <p className="mb-1 flex items-center gap-1.5 font-medium text-zinc-700"><Info className="h-4 w-4 text-emerald-600" /> Технические поражения</p>
          <p>Неявка команды — регламентный счёт, индивидуальная статистика игроков при этом не затрагивается. Обе неявки (0:0) — 0 очков и техпоражение каждой команде. В форме: <b>Т</b> — техпоражение, <b>тВ</b> — техническая победа.</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500">
          <p className="mb-1 flex items-center gap-1.5 font-medium text-zinc-700"><Info className="h-4 w-4 text-emerald-600" /> Тай-брейки</p>
          <p>Порядок определения мест: {tie.map((t) => TIE_LABELS[t] ?? t).join(" → ")}.</p>
        </div>
      </div>
    </div>
  );
}
