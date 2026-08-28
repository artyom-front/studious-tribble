"use client";

import { useCallback, useEffect, useState } from "react";
import { Toaster } from "sonner";
import {
  LayoutDashboard, Trophy, CalendarDays, Target, Shield, Flag, Ban, Settings2, LogIn, LogOut, Dices,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { OverviewDTO, SessionUserDTO } from "./types";
import { FORMAT_LABELS } from "./types";
import HomeView from "./HomeView";
import StandingsView from "./StandingsView";
import CalendarView from "./CalendarView";
import ScorersView from "./ScorersView";
import TeamsView from "./TeamsView";
import RefereesView from "./RefereesView";
import DisciplineView from "./DisciplineView";
import LoginView from "./LoginView";
import AdminPanel from "./AdminPanel";
import MatchDialog from "./MatchDialog";
import PlayerDialog from "./PlayerDialog";

export type View = "home" | "standings" | "calendar" | "scorers" | "teams" | "referees" | "discipline" | "login" | "admin";

const NAV: { id: View; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "home", label: "Обзор", icon: LayoutDashboard },
  { id: "standings", label: "Таблица", icon: Trophy },
  { id: "calendar", label: "Календарь", icon: CalendarDays },
  { id: "scorers", label: "Бомбардиры", icon: Target },
  { id: "teams", label: "Команды", icon: Shield },
  { id: "referees", label: "Судьи", icon: Flag },
  { id: "discipline", label: "Дисциплины", icon: Ban },
];

export default function Portal() {
  const [view, setView] = useState<View>("home");
  const [overview, setOverview] = useState<OverviewDTO | null>(null);
  const [leagueId, setLeagueId] = useState<string>("");
  const [seasonId, setSeasonId] = useState<string>("");
  const [user, setUser] = useState<SessionUserDTO | null>(null);
  const [version, setVersion] = useState(0);
  const [matchDialogId, setMatchDialogId] = useState<string | null>(null);
  const [playerDialogId, setPlayerDialogId] = useState<string | null>(null);
  const [adminMatchId, setAdminMatchId] = useState<string | null>(null);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    fetch("/api/public/overview")
      .then((r) => r.json())
      .then((j: OverviewDTO) => {
        setOverview(j);
        const first = j.leagues[0];
        if (first) {
          setLeagueId(first.id);
          const current = first.seasons.find((s) => s.isCurrent) ?? first.seasons[0];
          if (current) setSeasonId(current.id);
        }
      })
      .catch(() => toast.error("Не удалось загрузить данные портала"));
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => setUser(j.user ?? null))
      .catch(() => {});
  }, []);

  const league = overview?.leagues.find((l) => l.id === leagueId) ?? null;
  const canAdmin = !!user && ["SUPER_ADMIN", "LEAGUE_ADMIN", "CLUB_ADMIN", "REFEREE"].includes(user.role);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setView("home");
    toast.success("Вы вышли из системы");
  };

  const showSeasonBar = ["standings", "calendar", "scorers", "teams", "referees", "discipline"].includes(view);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <Toaster richColors position="top-right" />

      {/* ---------- Header ---------- */}
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-900 text-white">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4">
          <button className="flex items-center gap-2 font-bold tracking-tight" onClick={() => setView("home")}>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
              <Dices className="h-5 w-5" />
            </span>
            <span className="hidden sm:inline">Футбол Чувашии</span>
          </button>

          <nav className="ml-auto hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => setView(n.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  view === n.id ? "bg-zinc-800 text-emerald-400" : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
                )}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </button>
            ))}
            {canAdmin && (
              <button
                onClick={() => setView("admin")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  view === "admin" ? "bg-zinc-800 text-emerald-400" : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
                )}
              >
                <Settings2 className="h-4 w-4" />
                Управление
              </button>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-2 lg:ml-3">
            {user ? (
              <>
                <div className="hidden text-right sm:block">
                  <p className="text-xs font-medium leading-tight">{user.personName ?? user.email}</p>
                  <p className="text-[11px] text-zinc-400">{user.role === "SUPER_ADMIN" ? "Супер-админ" : user.role === "LEAGUE_ADMIN" ? "Админ лиги" : user.role === "REFEREE" ? "Судья" : "Админ клуба"}</p>
                </div>
                <Button variant="outline" size="sm" className="border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700" onClick={logout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setView("login")}>
                <LogIn className="mr-1 h-4 w-4" /> Войти
              </Button>
            )}
          </div>
        </div>

        {/* Мобильная навигация */}
        <div className="scrollbar-none flex gap-1 overflow-x-auto border-t border-zinc-800 px-3 py-2 lg:hidden">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setView(n.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                view === n.id ? "bg-emerald-600 text-white" : "bg-zinc-800 text-zinc-300"
              )}
            >
              <n.icon className="h-3.5 w-3.5" />
              {n.label}
            </button>
          ))}
          {canAdmin && (
            <button
              onClick={() => setView("admin")}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                view === "admin" ? "bg-emerald-600 text-white" : "bg-zinc-800 text-zinc-300"
              )}
            >
              <Settings2 className="h-3.5 w-3.5" /> Управление
            </button>
          )}
        </div>
      </header>

      {/* ---------- Селектор сезона ---------- */}
      {showSeasonBar && overview && (
        <div className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
            <Select
              value={leagueId}
              onValueChange={(v) => {
                setLeagueId(v);
                const l = overview.leagues.find((x) => x.id === v);
                const s = l?.seasons.find((x) => x.isCurrent) ?? l?.seasons[0];
                setSeasonId(s?.id ?? "");
              }}
            >
              <SelectTrigger className="w-[280px] bg-white"><SelectValue placeholder="Лига" /></SelectTrigger>
              <SelectContent>
                {overview.leagues.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name} · {FORMAT_LABELS[l.format] ?? l.format}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={seasonId} onValueChange={setSeasonId}>
              <SelectTrigger className="w-[180px] bg-white"><SelectValue placeholder="Сезон" /></SelectTrigger>
              <SelectContent>
                {league?.seasons.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {league && (
              <div className="ml-auto hidden items-center gap-2 text-xs text-zinc-500 md:flex">
                <span className="rounded-full bg-zinc-100 px-2 py-1">3 ЖК → пропуск матча</span>
                <span className="rounded-full bg-zinc-100 px-2 py-1">КК → пропуск матча</span>
                <span className="rounded-full bg-zinc-100 px-2 py-1">Тех. поражение {league.walkoverScore}:0</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------- Контент ---------- */}
      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-6">
          {view === "home" && <HomeView overview={overview} onOpenMatch={setMatchDialogId} onOpenPlayer={setPlayerDialogId} onNavigate={setView} onRequireLogin={() => setView("login")} />}
          {view === "standings" && <StandingsView seasonId={seasonId} version={version} />}
          {view === "calendar" && <CalendarView seasonId={seasonId} version={version} onOpenMatch={setMatchDialogId} />}
          {view === "scorers" && <ScorersView seasonId={seasonId} version={version} onOpenPlayer={setPlayerDialogId} />}
          {view === "teams" && <TeamsView seasonId={seasonId} version={version} onOpenPlayer={setPlayerDialogId} />}
          {view === "referees" && <RefereesView seasonId={seasonId} version={version} />}
          {view === "discipline" && <DisciplineView seasonId={seasonId} version={version} onOpenPlayer={setPlayerDialogId} />}
          {view === "login" && <LoginView onLoggedIn={(u) => { setUser(u); setView("home"); bump(); }} />}
          {view === "admin" && canAdmin && (
            <AdminPanel user={user!} seasonId={seasonId} version={version} bump={bump} focusMatchId={adminMatchId} onMatchHandled={() => setAdminMatchId(null)} onOpenPlayer={setPlayerDialogId} />
          )}
          {view === "admin" && !canAdmin && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-700">Недостаточно прав для доступа к панели управления.</div>
          )}
        </div>
      </main>

      {/* ---------- Footer ---------- */}
      <footer className="mt-auto bg-zinc-900 text-zinc-400">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-5 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>Спортивно-аналитический портал «Футбол Чувашии» · демо-стенд по PRD v1.0</p>
          <p>Дисциплинарный автомат · Технические поражения · Трансферы · Merge профилей</p>
        </div>
      </footer>

      {/* ---------- Диалоги ---------- */}
      <MatchDialog
        matchId={matchDialogId}
        onClose={() => setMatchDialogId(null)}
        user={user}
        onRated={bump}
        onEditProtocol={(matchId) => {
          if (!canAdmin) {
            toast.info("Для ввода протокола войдите как судья или администратор лиги");
            setView("login");
            return;
          }
          setAdminMatchId(matchId);
          setView("admin");
        }}
      />
      <PlayerDialog playerId={playerDialogId} onClose={() => setPlayerDialogId(null)} />
    </div>
  );
}
