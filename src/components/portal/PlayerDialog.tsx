"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Goal, TriangleAlert, OctagonX, Repeat, Ban, ArrowRightLeft } from "lucide-react";
import { useFetch, fmtDate, fmtShortDate } from "./hooks";
import { EVENT_LABELS, SOURCE_LABELS } from "./types";
import { LoadingBlock, PositionBadge } from "./ui-bits";

interface PlayerDetail {
  player: {
    id: string;
    name: string;
    birthDate: string | null;
    position: string | null;
    isReferee: boolean;
    registrations: {
      team: { id: string; name: string; clubName: string | null };
      season: { id: string; name: string; league: string };
      startDate: string;
      endDate: string | null;
      number: number | null;
    }[];
    suspensions: {
      league: string; source: string; reason: string | null;
      matchesTotal: number; matchesServed: number; isLifetime: boolean; isActive: boolean; createdAt: string;
    }[];
    statsBySeason: {
      season: { id: string; name: string; league: string };
      stats: {
        games: number; goals: number; penalties: number; ownGoals: number; assists: number;
        yellowCards: number; redCards: number; cleanSheets: number;
      };
    }[];
    events: { id: string; type: string; minute: number; isAssist: boolean; match: { id: string; home: string; away: string; status: string; kickoff: string } }[];
  };
}

export default function PlayerDialog({ playerId, onClose }: { playerId: string | null; onClose: () => void }) {
  const { data } = useFetch<PlayerDetail>(playerId ? `/api/public/players/${playerId}` : null);

  const p = data?.player;

  return (
    <Dialog open={!!playerId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        {(!data || !p) && <LoadingBlock label="Загрузка игрока..." />}
        {data && p && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {p.name} <PositionBadge position={p.position} />
                {p.isReferee && <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">судья</Badge>}
              </DialogTitle>
              {p.birthDate && (
                <p className="text-xs text-zinc-400">
                  Дата рождения: {new Date(p.birthDate).toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow" })}
                </p>
              )}
            </DialogHeader>

            {/* Заявки / трансферы */}
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><ArrowRightLeft className="h-4 w-4 text-emerald-600" /> Заявки и трансферы</p>
              <div className="space-y-1.5">
                {p.registrations.map((r, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm">
                    <span className="font-medium">{r.team.name}</span>
                    <span className="text-xs text-zinc-400">{r.season.league} · {r.season.name}</span>
                    <span className="ml-auto text-xs text-zinc-400">
                      {fmtShortDate(r.startDate)} — {r.endDate ? fmtShortDate(r.endDate) : "н.в."}
                    </span>
                    {r.number && <Badge variant="secondary" className="font-mono">№{r.number}</Badge>}
                    {r.endDate && <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">отзаявлен</Badge>}
                  </div>
                ))}
              </div>
            </div>

            {/* Статистика */}
            <div>
              <p className="mb-2 text-sm font-semibold">Статистика по сезонам</p>
              {p.statsBySeason.map((s) => (
                <div key={s.season.id} className="mb-2 rounded-xl border border-zinc-200 p-3">
                  <p className="mb-2 text-xs font-medium text-zinc-500">{s.season.league} · {s.season.name}</p>
                  <div className="grid grid-cols-4 gap-2 text-center sm:grid-cols-7">
                    {[
                      ["Матчи", s.stats.games],
                      ["Голы", s.stats.goals],
                      ["Пен.", s.stats.penalties],
                      ["Ассист", s.stats.assists],
                      ["ЖК", s.stats.yellowCards],
                      ["КК", s.stats.redCards],
                      ["Сухие", s.stats.cleanSheets],
                    ].map(([label, value]) => (
                      <div key={label as string}>
                        <p className="font-mono text-base font-bold">{value as number}</p>
                        <p className="text-[10px] text-zinc-400">{label as string}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Дисквалификации */}
            {p.suspensions.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Ban className="h-4 w-4 text-red-500" /> Дисквалификации</p>
                {p.suspensions.map((s, i) => (
                  <div key={i} className={`mb-1.5 rounded-lg border px-3 py-2 text-sm ${s.isActive ? "border-red-200 bg-red-50" : "border-zinc-200"}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{SOURCE_LABELS[s.source] ?? s.source}</span>
                      <span className="text-xs text-zinc-400">{fmtDate(s.createdAt, false)}</span>
                      <span className={`ml-auto text-xs font-bold ${s.isActive ? "text-red-600" : "text-zinc-400"}`}>
                        {s.isLifetime ? "пожизненно" : `${s.matchesServed}/${s.matchesTotal} отбыто`}
                      </span>
                    </div>
                    {s.reason && <p className="mt-0.5 text-xs text-zinc-500">{s.reason}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* События */}
            {p.events.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-semibold">Участие в событиях</p>
                <div className="max-h-52 space-y-1 overflow-y-auto">
                  {p.events.map((e) => (
                    <div key={e.id} className="flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-1.5 text-sm">
                      {e.type === "GOAL" || e.type === "PENALTY" ? <Goal className="h-3.5 w-3.5 text-emerald-600" /> :
                       e.type === "YELLOW_CARD" ? <TriangleAlert className="h-3.5 w-3.5 text-yellow-500" /> :
                       e.type === "RED_CARD" ? <OctagonX className="h-3.5 w-3.5 text-red-600" /> :
                       <Repeat className="h-3.5 w-3.5 text-zinc-400" />}
                      <span className="text-xs">{e.match.home} — {e.match.away}</span>
                      <span className="ml-auto font-mono text-xs text-zinc-400">
                        {e.isAssist ? `ассист ${e.minute}&apos;` : `${EVENT_LABELS[e.type] ?? e.type} ${e.minute}&apos;`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
