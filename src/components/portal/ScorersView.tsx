"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Info, Target, Zap, Shield, Ban } from "lucide-react";
import { useFetch } from "./hooks";
import type { PlayerStatRowDTO, ScorersDTO } from "./types";
import { LoadingBlock, ErrorBlock, EmptyState, PositionBadge } from "./ui-bits";

export default function ScorersView({ seasonId, version, onOpenPlayer }: { seasonId: string; version: number; onOpenPlayer: (id: string) => void }) {
  const { data, loading, error } = useFetch<ScorersDTO>(seasonId ? `/api/public/scorers?seasonId=${seasonId}` : null, version);
  const [tab, setTab] = useState("scorers");

  if (!seasonId) return <EmptyState title="Сезон не выбран" />;
  if (loading && !data) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;
  if (!data) return null;

  const Row = ({ p, i, metric, metricLabel }: { p: PlayerStatRowDTO; i: number; metric: number; metricLabel: string }) => (
    <button
      onClick={() => onOpenPlayer(p.personId)}
      className="flex w-full items-center gap-3 border-b border-zinc-100 px-4 py-2.5 text-left transition-colors hover:bg-zinc-50"
    >
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${i < 3 ? "bg-emerald-600 text-white" : "bg-zinc-100 text-zinc-500"}`}>
        {i + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 truncate text-sm font-medium">
          {p.name} <PositionBadge position={p.position} />
        </p>
        <p className="truncate text-xs text-zinc-400">{p.teamName}</p>
      </div>
      <span className="text-xs text-zinc-400">{p.games} матч.</span>
      <span className="w-10 text-right font-mono text-base font-bold text-emerald-600" title={metricLabel}>{metric}</span>
    </button>
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Статистика игроков</h2>
        <p className="text-sm text-zinc-500">Индивидуальные показатели сезона</p>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>Голы, ассисты и карточки, полученные в матчах, оформленных как техническое поражение, <b>не учитываются</b> в индивидуальной статистике (инвариант Epic 2 PRD).</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-zinc-100">
          <TabsTrigger value="scorers"><Target className="mr-1 h-3.5 w-3.5" /> Бомбардиры</TabsTrigger>
          <TabsTrigger value="assisters"><Zap className="mr-1 h-3.5 w-3.5" /> Ассистенты</TabsTrigger>
          <TabsTrigger value="goalkeepers"><Shield className="mr-1 h-3.5 w-3.5" /> Вратари</TabsTrigger>
          <TabsTrigger value="fairPlay"><Ban className="mr-1 h-3.5 w-3.5" /> Дисциплина</TabsTrigger>
        </TabsList>

        <TabsContent value="scorers">
          <Card className="overflow-hidden border-zinc-200">
            <CardContent className="p-0">
              {data.scorers.map((p, i) => <Row key={p.personId} p={p} i={i} metric={p.goals} metricLabel={`Голов: ${p.goals} (пенальти: ${p.penalties})`} />)}
              {data.scorers.length === 0 && <p className="py-10 text-center text-sm text-zinc-400">Голов пока нет</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assisters">
          <Card className="overflow-hidden border-zinc-200">
            <CardContent className="p-0">
              {data.assisters.map((p, i) => <Row key={p.personId} p={p} i={i} metric={p.assists} metricLabel="Ассистов" />)}
              {data.assisters.length === 0 && <p className="py-10 text-center text-sm text-zinc-400">Ассистов пока нет</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goalkeepers">
          <Card className="overflow-hidden border-zinc-200">
            <CardContent className="p-0">
              <div className="flex items-center gap-3 border-b border-zinc-100 bg-zinc-50 px-4 py-2 text-xs font-medium text-zinc-500">
                <span className="w-7" /> <span className="flex-1">Вратарь</span> <span className="w-16 text-right">Матчей</span> <span className="w-24 text-right">«Сухие» матчи</span>
              </div>
              {data.goalkeepers.map((p, i) => (
                <button key={p.personId} onClick={() => onOpenPlayer(p.personId)} className="flex w-full items-center gap-3 border-b border-zinc-100 px-4 py-2.5 text-left transition-colors hover:bg-zinc-50">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-500">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="truncate text-xs text-zinc-400">{p.teamName}</p>
                  </div>
                  <span className="w-16 text-right text-sm tabular-nums text-zinc-500">{p.games}</span>
                  <span className="w-24 text-right font-mono text-base font-bold text-emerald-600">{p.cleanSheets}</span>
                </button>
              ))}
              {data.goalkeepers.length === 0 && <p className="py-10 text-center text-sm text-zinc-400">Нет данных</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fairPlay">
          <Card className="overflow-hidden border-zinc-200">
            <CardContent className="p-0">
              <div className="flex items-center gap-3 border-b border-zinc-100 bg-zinc-50 px-4 py-2 text-xs font-medium text-zinc-500">
                <span className="w-7" /> <span className="flex-1">Игрок</span> <span className="w-14 text-right">ЖК</span> <span className="w-14 text-right">КК</span>
              </div>
              {data.fairPlay.map((p, i) => (
                <button key={p.personId} onClick={() => onOpenPlayer(p.personId)} className="flex w-full items-center gap-3 border-b border-zinc-100 px-4 py-2.5 text-left transition-colors hover:bg-zinc-50">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-500">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="truncate text-xs text-zinc-400">{p.teamName}</p>
                  </div>
                  <span className="w-14 text-right font-mono font-bold text-yellow-600">{p.yellowCards}</span>
                  <span className="w-14 text-right font-mono font-bold text-red-600">{p.redCards}</span>
                </button>
              ))}
              {data.fairPlay.length === 0 && <p className="py-10 text-center text-sm text-zinc-400">Карточек пока нет</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
