"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Shield, MapPin, Users } from "lucide-react";
import { useFetch, fmtShortDate } from "./hooks";
import type { TeamDTO } from "./types";
import { LoadingBlock, ErrorBlock, EmptyState, PositionBadge } from "./ui-bits";

export default function TeamsView({ seasonId, version, onOpenPlayer }: { seasonId: string; version: number; onOpenPlayer: (id: string) => void }) {
  const { data, loading, error } = useFetch<{ teams: TeamDTO[] }>(seasonId ? `/api/public/teams?seasonId=${seasonId}` : null, version);
  const [teamId, setTeamId] = useState<string | null>(null);

  if (!seasonId) return <EmptyState title="Сезон не выбран" />;
  if (loading && !data) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;
  if (!data) return null;

  const team = data.teams.find((t) => t.id === teamId) ?? null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Команды</h2>
        <p className="text-sm text-zinc-500">{data.teams.length} команд заявлено на сезон</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {data.teams.map((t) => (
          <button
            key={t.id}
            onClick={() => setTeamId(t.id)}
            className="group rounded-xl border border-zinc-200 bg-white p-4 text-left transition-all hover:border-emerald-300 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-emerald-400">
                <Shield className="h-5 w-5" />
              </span>
              <span className="flex items-center gap-1 text-xs text-zinc-400"><Users className="h-3 w-3" /> {t.players.filter((p) => !p.endDate).length}</span>
            </div>
            <p className="mt-3 font-semibold group-hover:text-emerald-700">{t.name}</p>
            <p className="flex items-center gap-1 text-xs text-zinc-400">
              <MapPin className="h-3 w-3" /> {t.clubName}{t.city ? ` · ${t.city}` : ""}
            </p>
          </button>
        ))}
      </div>

      <Dialog open={!!team} onOpenChange={(o) => !o && setTeamId(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          {team && (
            <>
              <DialogHeader>
                <DialogTitle>{team.name}</DialogTitle>
                <p className="text-sm text-zinc-400">{team.clubName}{team.city ? ` · ${team.city}` : ""}</p>
              </DialogHeader>
              <div className="space-y-1">
                {team.players.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setTeamId(null); onOpenPlayer(p.id); }}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-zinc-50"
                  >
                    <span className="w-8 shrink-0 text-center font-mono text-sm text-zinc-400">{p.number ?? "—"}</span>
                    <span className="flex-1 truncate text-sm font-medium">{p.name}</span>
                    <PositionBadge position={p.position} />
                    {p.endDate && (
                      <Badge variant="outline" className="border-amber-200 bg-amber-50 text-[10px] text-amber-700">
                        уехал {fmtShortDate(p.endDate)}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
