"use client";

// Сетка команд сезона: клик по карточке — проваливание в профиль команды.

import { Card, CardContent } from "@/components/ui/card";
import { Shield, MapPin, Users, ArrowUpRight } from "lucide-react";
import { useFetch } from "./hooks";
import { navigate } from "./router";
import type { TeamDTO } from "./types";
import { LoadingBlock, ErrorBlock, EmptyState } from "./ui-bits";

export default function TeamsView({ seasonId, version }: { seasonId: string; version: number }) {
  const { data, loading, error } = useFetch<{ teams: TeamDTO[] }>(seasonId ? `/api/public/teams?seasonId=${seasonId}` : null, version);

  if (!seasonId) return <EmptyState title="Сезон не выбран" />;
  if (loading && !data) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Команды</h2>
        <p className="text-sm text-zinc-500">{data.teams.length} команд заявлено на сезон</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {data.teams.map((t) => (
          <button
            key={t.id}
            onClick={() => navigate(`/team/${t.id}`)}
            className="group rounded-xl border border-zinc-200 bg-white p-4 text-left transition-all hover:border-emerald-300 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-emerald-400">
                <Shield className="h-5 w-5" />
              </span>
              <ArrowUpRight className="h-4 w-4 text-zinc-300 transition-colors group-hover:text-emerald-500" />
            </div>
            <p className="mt-3 font-semibold group-hover:text-emerald-700">{t.name}</p>
            <p className="flex items-center gap-1 text-xs text-zinc-400">
              <MapPin className="h-3 w-3" /> {t.clubName}{t.city ? ` · ${t.city}` : ""}
            </p>
            <p className="mt-1 flex items-center gap-1 text-xs text-zinc-400">
              <Users className="h-3 w-3" /> {t.players.filter((p) => !p.endDate).length} в заявке
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
