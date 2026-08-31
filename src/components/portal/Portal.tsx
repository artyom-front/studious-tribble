"use client";

// ============================================================
// ScoreBox — шелл портала (livescore-архитектура по референсу):
// шапка → табы видов футбола → фильтры даты/статуса → 3 колонки:
// сайдбар топ-лиг · лента матчей по лигам · правая колонка виджетов.
// Навигация — hash-роутер (#/match/12, #/team/3, ...).
// ============================================================

import { useCallback, useEffect, useState } from "react";
import { Toaster } from "sonner";
import { LogIn, LogOut, Settings2, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BRAND } from "./brand";
import { navigate, useRoute } from "./router";
import type { BannerDTO, OverviewDTO, SessionUserDTO } from "./types";
import { FORMAT_LABELS } from "./types";
import LeaguesSidebar from "./LeaguesSidebar";
import RightRail from "./RightRail";
import MatchDayView from "./MatchDayView";
import LeaguePage from "./LeaguePage";
import MatchPage from "./MatchPage";
import PlayerPage from "./PlayerPage";
import TeamPage from "./TeamPage";
import StadiumPage from "./StadiumPage";
import LoginView from "./LoginView";
import AdminPanel from "./AdminPanel";

const FORMATS: { id: string; label: string }[] = [
  { id: "all", label: "Все виды" },
  { id: "F11", label: "11×11" },
  { id: "F8", label: "8×8" },
  { id: "F6", label: "6×6" },
  { id: "FUTSAL", label: "Мини-футбол" },
];

export default function Portal() {
  const route = useRoute();
  const [overview, setOverview] = useState<OverviewDTO | null>(null);
  const [banners, setBanners] = useState<BannerDTO[]>([]);
  const [user, setUser] = useState<SessionUserDTO | null>(null);
  const [version, setVersion] = useState(0);
  const [format, setFormat] = useState("all");

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const reloadOverview = useCallback(() => {
    fetch("/api/public/overview")
      .then((r) => r.json())
      .then((j: OverviewDTO) => setOverview(j))
      .catch(() => toast.error("Не удалось загрузить данные портала"));
    fetch("/api/public/banners")
      .then((r) => r.json())
      .then((j) => setBanners(j.banners ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    reloadOverview();
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => setUser(j.user ?? null))
      .catch(() => {});
  }, [reloadOverview]);

  const canAdmin = !!user && ["SUPER_ADMIN", "LEAGUE_ADMIN", "CLUB_ADMIN", "REFEREE"].includes(user.role);
  const topBanner = banners.find((b) => b.placement === "TOP");

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    navigate("/");
    toast.success("Вы вышли из системы");
  };

  return (
    <div className="flex min-h-screen flex-col bg-zinc-100">
      <Toaster richColors position="top-right" />

      {/* ---------- Шапка (минималистичная) ---------- */}
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center gap-3 px-4">
          <button
            className="flex items-center gap-2.5"
            onClick={() => navigate("/")}
            aria-label={`${BRAND.name} — на главную`}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 shadow-sm">
              <Trophy className="h-5 w-5 text-white" />
            </span>
            <span className="text-left leading-none">
              <span className="block text-lg font-extrabold tracking-tight text-zinc-900">{BRAND.name}</span>
              <span className="mt-0.5 hidden text-[10px] font-medium text-zinc-400 sm:block">{BRAND.domain} · {BRAND.tagline}</span>
            </span>
          </button>

          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <>
                <div className="hidden text-right sm:block">
                  <p className="text-xs font-semibold leading-tight text-zinc-800">{user.personName ?? user.email}</p>
                  <p className="text-[10px] text-zinc-400">
                    {user.role === "SUPER_ADMIN" ? "Супер-админ" : user.role === "LEAGUE_ADMIN" ? "Админ лиги" : user.role === "REFEREE" ? "Судья" : user.role === "CLUB_ADMIN" ? "Админ клуба" : "Игрок"}
                  </p>
                </div>
                {canAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(route.name === "admin" && "border-emerald-300 bg-emerald-50 text-emerald-700")}
                    onClick={() => navigate("/admin")}
                  >
                    <Settings2 className="mr-1 h-4 w-4" />
                    <span className="hidden sm:inline">Админка</span>
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={logout} aria-label="Выйти">
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => navigate("/login")}>
                <LogIn className="mr-1 h-4 w-4" /> Войти
              </Button>
            )}
          </div>
        </div>

        {/* ---------- Табы видов футбола (аналог меню видов спорта) ---------- */}
        <nav className="border-t border-zinc-100 bg-zinc-900" aria-label="Виды футбола">
          <div className="mx-auto flex w-full max-w-[1400px] items-center gap-1 overflow-x-auto px-4 scrollbar-none">
            {FORMATS.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setFormat(f.id);
                  if (route.name !== "home") navigate("/");
                }}
                className={cn(
                  "relative shrink-0 px-3.5 py-2.5 text-sm font-semibold transition-colors",
                  format === f.id ? "text-white" : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                {f.label}
                {format === f.id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-emerald-400" />}
              </button>
            ))}
          </div>
        </nav>
      </header>

      {/* ---------- Верхний баннер (слот TOP, 728×90) ---------- */}
      {topBanner && (
        <div className="mx-auto w-full max-w-[1400px] px-4 pt-3">
          <a
            href={topBanner.linkUrl ?? "#"}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="flex h-[72px] w-full items-center justify-between gap-4 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white px-6"
          >
            <div>
              <p className="text-sm font-bold text-zinc-800">{topBanner.title}</p>
              {topBanner.text && <p className="text-xs text-zinc-500">{topBanner.text}</p>}
            </div>
            <span className="rounded-md bg-amber-400 px-3 py-1 text-xs font-bold text-zinc-900">Реклама</span>
          </a>
        </div>
      )}

      {/* ---------- 3-колоночная сетка ---------- */}
      <main className="flex-1">
        <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[250px_minmax(0,1fr)] xl:grid-cols-[250px_minmax(0,1fr)_310px]">
          {/* Левый сайдбар: топ-лиги + остальные (на мобиле — скрыт) */}
          <aside className="hidden lg:block">
            <div className="sticky top-[104px] max-h-[calc(100vh-120px)] overflow-y-auto pr-1">
              <LeaguesSidebar overview={overview} version={version} activeLeagueId={route.name === "league" ? route.id : null} />
            </div>
          </aside>

          {/* Центр: контент по роуту */}
          <div className="min-w-0">
            {route.name === "home" && (
              <MatchDayView
                format={format}
                overview={overview}
                version={version}
              />
            )}
            {route.name === "league" && <LeaguePage leagueId={route.id} tab={route.tab} overview={overview} version={version} />}
            {route.name === "match" && <MatchPage matchId={route.id} user={user} onRated={bump} />}
            {route.name === "team" && <TeamPage teamId={route.id} version={version} />}
            {route.name === "player" && <PlayerPage personId={route.id} />}
            {route.name === "stadium" && <StadiumPage stadiumId={route.id} />}
            {route.name === "login" && (
              <LoginView
                onLoggedIn={(u) => {
                  setUser(u);
                  navigate("/");
                  reloadOverview();
                }}
              />
            )}
            {route.name === "admin" && canAdmin && (
              <AdminPanel user={user!} version={version} bump={bump} onReload={reloadOverview} focusMatchId={route.matchId ?? null} onMatchHandled={() => navigate("/admin")} />
            )}
            {route.name === "admin" && !canAdmin && (
              <div className="rounded-xl border border-amber-200 bg-white p-6 text-amber-700">
                Недостаточно прав для доступа к панели управления. <button className="underline" onClick={() => navigate("/login")}>Войти</button>
              </div>
            )}
          </div>

          {/* Правая колонка: виджеты + баннеры (на мобиле/планшете — скрыта) */}
          <aside className="hidden xl:block">
            <div className="sticky top-[104px] max-h-[calc(100vh-120px)] space-y-4 overflow-y-auto">
              <RightRail overview={overview} banners={banners} version={version} />
            </div>
          </aside>
        </div>
      </main>

      {/* ---------- Футер ---------- */}
      <footer className="mt-auto bg-zinc-900 text-zinc-400">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 px-4 py-6 text-xs sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold text-white">{BRAND.name} · {BRAND.domain}</p>
            <p className="mt-0.5">Спортивно-аналитический портал «{BRAND.tagline}» · демо-стенд по PRD v1.0</p>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span>Дисквалификации</span>
            <span>Техпоражения</span>
            <span>Трансферы</span>
            <span>Merge профилей</span>
            <span>Рейтинги судей</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
