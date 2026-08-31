"use client";

// Панель управления: полный продакшен-цикл.
// Справочники (лиги/сезоны, клубы/команды, люди, стадионы, баннеры) + турнирные
// операции (матчи, протоколы, КДК, расписание, заявки, merge, аудит).

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useFetch, fmtDate } from "./hooks";
import type { OverviewDTO, SessionUserDTO } from "./types";
import { ScoreBox, StatusBadge } from "./ui-bits";
import ProtocolEditor from "./ProtocolEditor";
import { KdcPanel, SchedulePanel, RegistrationsPanel, MergePanel, AuditPanel } from "./AdminPanels";
import { TournamentsPanel, ClubsTeamsPanel } from "./CrudPanels";
import { PeoplePanel, StadiumsPanel, BannersPanel } from "./CrudPanels2";
import { MatchesCrudPanel } from "./MatchesCrudPanel";
import {
  Trophy, Shield, Users, MapPin, CalendarPlus, ClipboardPen, Ban, Megaphone,
  ArrowRightLeft, GitMerge, ScrollText, Flag,
} from "lucide-react";

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
  version: number;
  bump: () => void;
  onReload: () => void;
  focusMatchId: string | null;
  onMatchHandled: () => void;
}

type Tab =
  | "tournaments" | "teams" | "people" | "stadiums" | "matches" | "banners"
  | "protocol" | "kdc" | "schedule" | "registrations" | "merge" | "audit";

export default function AdminPanel({ user, version, bump, onReload, focusMatchId, onMatchHandled }: Props) {
  const [tab, setTab] = useState<Tab>("protocol");
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [leagueId, setLeagueId] = useState("");
  const [seasonId, setSeasonId] = useState("");

  const { data: overview } = useFetch<OverviewDTO>("/api/public/overview", version);
  const leagues = overview?.leagues ?? [];
  const league = leagues.find((l) => l.id === (leagueId || leagues[0]?.id));
  const seasons = league?.seasons ?? [];
  const effectiveSeasonId = seasonId || seasons.find((s) => s.isCurrent)?.id || seasons[0]?.id || "";

  const { data, loading } = useFetch<{ matches: AdminMatch[] }>(
    effectiveSeasonId && (tab === "protocol" || tab === "kdc" || tab === "schedule" || tab === "registrations")
      ? `/api/admin/matches?seasonId=${effectiveSeasonId}`
      : null,
    version
  );

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }>; roles: string[] }[] = [
    { id: "tournaments", label: "Турниры", icon: Trophy, roles: ["LEAGUE_ADMIN", "SUPER_ADMIN"] },
    { id: "teams", label: "Клубы и команды", icon: Shield, roles: ["CLUB_ADMIN", "LEAGUE_ADMIN", "SUPER_ADMIN"] },
    { id: "people", label: "Люди", icon: Users, roles: ["CLUB_ADMIN", "LEAGUE_ADMIN", "SUPER_ADMIN"] },
    { id: "stadiums", label: "Стадионы", icon: MapPin, roles: ["LEAGUE_ADMIN", "SUPER_ADMIN"] },
    { id: "matches", label: "Матчи", icon: CalendarPlus, roles: ["LEAGUE_ADMIN", "SUPER_ADMIN"] },
    { id: "protocol", label: "Протоколы", icon: ClipboardPen, roles: ["REFEREE", "LEAGUE_ADMIN", "SUPER_ADMIN"] },
    { id: "kdc", label: "КДК", icon: Ban, roles: ["LEAGUE_ADMIN", "SUPER_ADMIN"] },
    { id: "schedule", label: "Расписание", icon: CalendarPlus, roles: ["LEAGUE_ADMIN", "SUPER_ADMIN"] },
    { id: "registrations", label: "Заявки", icon: ArrowRightLeft, roles: ["CLUB_ADMIN", "LEAGUE_ADMIN", "SUPER_ADMIN"] },
    { id: "banners", label: "Баннеры", icon: Megaphone, roles: ["LEAGUE_ADMIN", "SUPER_ADMIN"] },
    { id: "merge", label: "Merge", icon: GitMerge, roles: ["SUPER_ADMIN"] },
    { id: "audit", label: "Аудит", icon: ScrollText, roles: ["LEAGUE_ADMIN", "SUPER_ADMIN"] },
  ];
  const visibleTabs = tabs.filter((t) => t.roles.includes(user.role) || user.role === "SUPER_ADMIN");

  const activeMatchId = focusMatchId ?? selectedMatchId;

  // Редактор протокола: переход из карточки матча (focusMatchId) или выбор в списке
  if (activeMatchId) {
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
  const needsSeason = ["protocol", "kdc", "schedule", "registrations"].includes(tab);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight">Панель управления</h2>
        <p className="text-sm text-zinc-500">
          {user.role === "REFEREE" ? "Ваши назначения: ввод протоколов" : "Полный цикл управления турнирами и справочниками"}
        </p>
      </div>

      {/* Табы */}
      <div className="flex gap-1 overflow-x-auto rounded-lg bg-zinc-200/70 p-1 scrollbar-none">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setSelectedMatchId(null); }}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === t.id ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-800"
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Селектор лиги/сезона для турнирных разделов */}
      {needsSeason && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3">
          <select
            value={leagueId || leagues[0]?.id || ""}
            onChange={(e) => { setLeagueId(e.target.value); setSeasonId(""); }}
            className="h-9 rounded-md border border-zinc-200 bg-white px-2 text-sm"
            aria-label="Лига"
          >
            {leagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select
            value={effectiveSeasonId}
            onChange={(e) => setSeasonId(e.target.value)}
            className="h-9 rounded-md border border-zinc-200 bg-white px-2 text-sm"
            aria-label="Сезон"
          >
            {seasons.map((s) => <option key={s.id} value={s.id}>{s.name}{s.isCurrent ? " (тек.)" : ""}</option>)}
          </select>
        </div>
      )}

      {/* ---------- Справочники ---------- */}
      {tab === "tournaments" && <TournamentsPanel bump={bump} onReload={onReload} />}
      {tab === "teams" && <ClubsTeamsPanel bump={bump} onReload={onReload} />}
      {tab === "people" && <PeoplePanel bump={bump} onReload={onReload} />}
      {tab === "stadiums" && <StadiumsPanel bump={bump} onReload={onReload} />}
      {tab === "banners" && <BannersPanel bump={bump} onReload={onReload} />}
      {tab === "matches" && (
        <MatchesCrudPanel
          bump={bump}
          version={version}
          overview={overview}
          onOpenProtocol={(matchId) => setSelectedMatchId(matchId)}
        />
      )}

      {/* ---------- Протоколы ---------- */}
      {tab === "protocol" && (
        <div className="space-y-4">
          {!effectiveSeasonId && <p className="text-sm text-zinc-400">Создайте лигу и сезон в разделе «Турниры»</p>}
          {effectiveSeasonId && loading && !data && <p className="py-8 text-center text-sm text-zinc-400">Загрузка...</p>}
          {effectiveSeasonId && data && (
            <>
              <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-2.5 text-sm font-bold">
                  К вводу протокола · {pending.length}
                </div>
                {pending.length === 0 && <p className="py-8 text-center text-sm text-zinc-400">Нет матчей, ожидающих протокола</p>}
                {pending.map((m) => (
                  <button key={m.id} onClick={() => setSelectedMatchId(m.id)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 border-b border-zinc-100 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-emerald-50/40">
                    <div className="w-36 shrink-0 text-xs text-zinc-400">{fmtDate(m.kickoff)}</div>
                    <div className="flex min-w-[220px] flex-1 items-center gap-2 text-sm font-medium text-zinc-700">
                      {m.homeTeam.name}
                      <ScoreBox score={m.homeScore !== null ? { home: m.homeScore, away: m.awayScore ?? 0 } : null} status={m.status} />
                      {m.awayTeam.name}
                    </div>
                    <StatusBadge status={m.status} />
                    {m.referee ? (
                      <span className="flex items-center gap-1 text-xs text-zinc-400"><Flag className="h-3 w-3" />{m.referee.name}</span>
                    ) : (
                      <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">судья не назначен</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-2.5 text-sm font-bold">
                  Завершённые · {done.length}
                </div>
                {done.map((m) => (
                  <button key={m.id} onClick={() => setSelectedMatchId(m.id)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 border-b border-zinc-100 px-4 py-2.5 text-left transition-colors last:border-b-0 hover:bg-zinc-50">
                    <div className="w-36 shrink-0 text-xs text-zinc-400">{fmtDate(m.kickoff, false)}</div>
                    <div className="flex min-w-[220px] flex-1 items-center gap-2 text-sm text-zinc-500">
                      {m.homeTeam.name}
                      <ScoreBox score={m.homeScore !== null ? { home: m.homeScore, away: m.awayScore ?? 0 } : null} status={m.status} />
                      {m.awayTeam.name}
                    </div>
                    <StatusBadge status={m.status} />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ---------- Турнирные операции ---------- */}
      {tab === "kdc" && <KdcPanel seasonId={effectiveSeasonId} bump={bump} />}
      {tab === "schedule" && <SchedulePanel seasonId={effectiveSeasonId} bump={bump} />}
      {tab === "registrations" && <RegistrationsPanel seasonId={effectiveSeasonId} bump={bump} />}
      {tab === "merge" && <MergePanel bump={bump} />}
      {tab === "audit" && <AuditPanel />}
    </div>
  );
}
