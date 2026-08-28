"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardPen, Ban, CalendarPlus, ArrowRightLeft, GitMerge, ScrollText, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFetch, fmtDate } from "./hooks";
import type { SessionUserDTO } from "./types";
import { STATUS_LABELS } from "./types";
import { ScoreBox, StatusBadge } from "./ui-bits";
import ProtocolEditor from "./ProtocolEditor";
import { KdcPanel, SchedulePanel, RegistrationsPanel, MergePanel, AuditPanel } from "./AdminPanels";

interface AdminMatch {
  id: string;
  round: number | null;
  kickoff: string;
  status: string;
  walkoverType: string | null;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: { id: string; name: string };
  awayTeam: { id: string; name: string };
  referee: { id: string; name: string } | null;
}

interface Props {
  user: SessionUserDTO;
  seasonId: string;
  version: number;
  bump: () => void;
  focusMatchId: string | null;
  onMatchHandled: () => void;
  onOpenPlayer: (id: string) => void;
}

type Tab = "protocol" | "kdc" | "schedule" | "registrations" | "merge" | "audit";

export default function AdminPanel({ user, seasonId, version, bump, focusMatchId, onMatchHandled }: Props) {
  const [tab, setTab] = useState<Tab>("protocol");
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  // активный матч для редактора: приоритет — переход из карточки матча (focusMatchId)
  const activeMatchId = focusMatchId ?? selectedMatchId;
  const activeTab = focusMatchId ? "protocol" : tab;

  const { data, loading } = useFetch<{ matches: AdminMatch[] }>(seasonId ? `/api/admin/matches?seasonId=${seasonId}` : null, version);

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }>; roles: string[] }[] = [
    { id: "protocol", label: "Протоколы", icon: ClipboardPen, roles: ["REFEREE", "LEAGUE_ADMIN", "SUPER_ADMIN"] },
    { id: "kdc", label: "КДК", icon: Ban, roles: ["LEAGUE_ADMIN", "SUPER_ADMIN"] },
    { id: "schedule", label: "Расписание", icon: CalendarPlus, roles: ["LEAGUE_ADMIN", "SUPER_ADMIN"] },
    { id: "registrations", label: "Заявки", icon: ArrowRightLeft, roles: ["CLUB_ADMIN", "LEAGUE_ADMIN", "SUPER_ADMIN"] },
    { id: "merge", label: "Merge", icon: GitMerge, roles: ["SUPER_ADMIN"] },
    { id: "audit", label: "Аудит", icon: ScrollText, roles: ["LEAGUE_ADMIN", "SUPER_ADMIN"] },
  ];
  const visibleTabs = tabs.filter((t) => t.roles.includes(user.role) || user.role === "SUPER_ADMIN");

  // Выбранный матч → редактор протокола
  if (activeTab === "protocol" && activeMatchId) {
    return (
      <ProtocolEditor
        matchId={activeMatchId}
        user={user}
        onBack={() => {
          onMatchHandled();
          setSelectedMatchId(null);
        }}
        bump={bump}
      />
    );
  }

  const matches = data?.matches ?? [];
  const pending = matches.filter((m) => m.status === "SCHEDULED" || m.status === "LIVE");
  const done = matches.filter((m) => m.status === "COMPLETED" || m.status === "WALKOVER");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Панель управления</h2>
        <p className="text-sm text-zinc-500">
          {user.role === "REFEREE" ? "Ваши назначения: ввод протоколов" : "Полный цикл управления турниром"}
        </p>
      </div>

      {/* Табы */}
      <div className="flex gap-1 overflow-x-auto rounded-lg bg-zinc-100 p-1">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === t.id ? "bg-white shadow-sm" : "text-zinc-500 hover:text-zinc-800"
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ---------- Протоколы ---------- */}
      {tab === "protocol" && (
        <div className="space-y-4">
          {!seasonId && <p className="text-sm text-zinc-400">Выберите сезон на панели выше</p>}
          {seasonId && loading && !data && <p className="py-8 text-center text-sm text-zinc-400">Загрузка...</p>}
          {seasonId && data && (
            <>
              <Card className="border-zinc-200">
                <CardContent className="p-0">
                  <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-2.5 text-sm font-semibold">
                    К вводу протокола · {pending.length}
                  </div>
                  {pending.length === 0 && <p className="py-8 text-center text-sm text-zinc-400">Нет матчей, ожидающих протокола</p>}
                  {pending.map((m) => (
                    <button key={m.id} onClick={() => setSelectedMatchId(m.id)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 border-b border-zinc-100 px-4 py-3 text-left transition-colors hover:bg-emerald-50/40">
                      <div className="w-32 shrink-0 text-xs text-zinc-400">{fmtDate(m.kickoff)}</div>
                      <div className="flex min-w-[200px] flex-1 items-center gap-2 text-sm font-medium">
                        {m.homeTeam.name}
                        <ScoreBox score={m.homeScore !== null ? { home: m.homeScore, away: m.awayScore ?? 0 } : null} />
                        {m.awayTeam.name}
                      </div>
                      <StatusBadge status={m.status} />
                      {m.referee ? (
                        <span className="flex items-center gap-1 text-xs text-zinc-400"><Flag className="h-3 w-3" />{m.referee.name}</span>
                      ) : (
                        <Badge variant="outline" className="border-red-200 bg-red-50 text-red-600">судья не назначен</Badge>
                      )}
                      <ClipboardPen className="ml-auto h-4 w-4 text-emerald-600" />
                    </button>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-zinc-200">
                <CardContent className="p-0">
                  <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-2.5 text-sm font-semibold">
                    Завершённые · {done.length}
                  </div>
                  {done.map((m) => (
                    <button key={m.id} onClick={() => setSelectedMatchId(m.id)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 border-b border-zinc-100 px-4 py-2.5 text-left transition-colors hover:bg-zinc-50">
                      <div className="w-32 shrink-0 text-xs text-zinc-400">{fmtDate(m.kickoff, false)}</div>
                      <div className="flex min-w-[200px] flex-1 items-center gap-2 text-sm text-zinc-500">
                        {m.homeTeam.name}
                        <ScoreBox score={m.homeScore !== null ? { home: m.homeScore, away: m.awayScore ?? 0 } : null} status={m.status} />
                        {m.awayTeam.name}
                      </div>
                      <StatusBadge status={m.status} />
                    </button>
                  ))}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ---------- Другие разделы ---------- */}
      {tab === "kdc" && <KdcPanel seasonId={seasonId} bump={bump} />}
      {tab === "schedule" && <SchedulePanel seasonId={seasonId} bump={bump} />}
      {tab === "registrations" && <RegistrationsPanel seasonId={seasonId} bump={bump} />}
      {tab === "merge" && <MergePanel bump={bump} />}
      {tab === "audit" && <AuditPanel />}
    </div>
  );
}
