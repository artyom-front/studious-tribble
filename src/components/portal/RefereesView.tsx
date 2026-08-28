"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Star, Flag } from "lucide-react";
import { useFetch } from "./hooks";
import type { RefereeStatDTO } from "./types";
import { LoadingBlock, ErrorBlock, EmptyState } from "./ui-bits";

export default function RefereesView({ seasonId, version }: { seasonId: string; version: number }) {
  const { data, loading, error } = useFetch<{ referees: RefereeStatDTO[] }>(seasonId ? `/api/public/referees?seasonId=${seasonId}` : null, version);

  if (!seasonId) return <EmptyState title="Сезон не выбран" />;
  if (loading && !data) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Судейский корпус</h2>
        <p className="text-sm text-zinc-500">Назначения, средние показатели и рейтинг команд</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.referees.map((r) => (
          <Card key={r.personId} className="border-zinc-200">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-900 text-emerald-400">
                  <Flag className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold leading-tight">{r.name}</p>
                  <p className="text-xs text-zinc-400">{r.matches} обслуженных матчей</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-zinc-50 py-2">
                  <p className="text-lg font-bold font-mono text-yellow-600">{r.yellowAvg}</p>
                  <p className="text-[11px] text-zinc-400">ЖК за матч</p>
                </div>
                <div className="rounded-lg bg-zinc-50 py-2">
                  <p className="text-lg font-bold font-mono text-red-600">{r.redAvg}</p>
                  <p className="text-[11px] text-zinc-400">КК за матч</p>
                </div>
                <div className="rounded-lg bg-zinc-50 py-2">
                  <p className="text-lg font-bold font-mono text-zinc-700">{r.penaltyAvg}</p>
                  <p className="text-[11px] text-zinc-400">Пенальти</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3">
                <span className="text-xs text-zinc-400">Рейтинг команд</span>
                {r.avgRating !== null ? (
                  <span className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className={`h-4 w-4 ${i <= Math.round(r.avgRating!) ? "fill-amber-400 text-amber-400" : "text-zinc-200"}`} />
                    ))}
                    <span className="ml-1 font-mono text-sm font-bold">{r.avgRating}</span>
                    <span className="text-[11px] text-zinc-400">({r.ratingsCount})</span>
                  </span>
                ) : (
                  <span className="text-xs text-zinc-300">нет оценок</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-zinc-400">
        Оценки выставляют капитаны и администраторы клубов после завершённых матчей; авторы оценок скрыты (анонимность по PRD).
      </p>
    </div>
  );
}
