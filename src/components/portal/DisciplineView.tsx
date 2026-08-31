"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Info, Ban, Clock } from "lucide-react";
import { useFetch, fmtDate } from "./hooks";
import type { SuspensionDTO } from "./types";
import { SOURCE_LABELS } from "./types";
import { LoadingBlock, ErrorBlock, EmptyState } from "./ui-bits";

export default function DisciplineView({ seasonId, version, onOpenPlayer }: { seasonId: string; version: number; onOpenPlayer: (id: string) => void }) {
  const { data, loading, error } = useFetch<{ suspensions: SuspensionDTO[] }>(seasonId ? `/api/public/suspensions?seasonId=${seasonId}` : null, version);

  if (!seasonId) return <EmptyState title="Сезон не выбран" />;
  if (loading && !data) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;
  if (!data) return null;

  const active = data.suspensions.filter((s) => s.isActive);
  const history = data.suspensions.filter((s) => !s.isActive);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Дисциплинарные санкции</h2>
        <p className="text-sm text-zinc-500">Автоматический учёт по регламенту и решения КДК</p>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-zinc-200 bg-white p-3 text-xs text-zinc-500">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        <p>
          Красная карточка — автоматический пропуск следующего матча турнира. Каждые 3 жёлтые карточки — пропуск 1 матча.
          Комитет по дисциплине (КДК) вправе ужесточить санкцию или назначить пожизненную дисквалификацию.
        </p>
      </div>

      <Card className="overflow-hidden border-red-200">
        <CardContent className="p-0">
          <div className="flex items-center gap-2 border-b border-red-100 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700">
            <Ban className="h-4 w-4" /> Активные дисквалификации · {active.length}
          </div>
          {active.length === 0 && <p className="py-8 text-center text-sm text-zinc-400">Все игроки в строю</p>}
          {active.map((s) => (
            <button key={s.id} onClick={() => onOpenPlayer(s.person.id)} className="flex w-full flex-wrap items-center gap-3 border-b border-zinc-100 px-4 py-3 text-left transition-colors hover:bg-zinc-50">
              <div className="min-w-[180px] flex-1">
                <p className="text-sm font-semibold">{s.person.name}</p>
                <p className="text-xs text-zinc-400">{s.team?.name ?? "—"}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.source === "MANUAL" ? "bg-red-100 text-red-700" : s.source === "AUTO_RED" ? "bg-orange-100 text-orange-700" : "bg-yellow-100 text-yellow-700"}`}>
                {SOURCE_LABELS[s.source] ?? s.source}
              </span>
              <div className="min-w-[220px] flex-1 text-xs text-zinc-500">{s.reason}</div>
              <div className="flex items-center gap-1.5 text-sm font-bold text-red-600">
                <Clock className="h-4 w-4" />
                {s.isLifetime ? "Пожизненно" : `осталось ${s.matchesTotal - s.matchesServed} матч.`}
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      {history.length > 0 && (
        <Card className="overflow-hidden border-zinc-200">
          <CardContent className="p-0">
            <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-zinc-600">
              Отбытые · {history.length}
            </div>
            {history.map((s) => (
              <button key={s.id} onClick={() => onOpenPlayer(s.person.id)} className="flex w-full flex-wrap items-center gap-3 border-b border-zinc-100 px-4 py-2.5 text-left transition-colors hover:bg-zinc-50">
                <div className="min-w-[180px] flex-1">
                  <p className="text-sm font-medium text-zinc-500">{s.person.name}</p>
                  <p className="text-xs text-zinc-400">{s.team?.name ?? "—"} · {fmtDate(s.createdAt, false)}</p>
                </div>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">{SOURCE_LABELS[s.source] ?? s.source}</span>
                <span className="text-xs text-zinc-400">отбыто {s.matchesServed}/{s.matchesTotal}</span>
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
