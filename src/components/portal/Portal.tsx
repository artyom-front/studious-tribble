"use client";

// ============================================================
// SCORES21 · «Ночь под прожекторами» — шелл публичного сайта:
// тёмная шапка с брендом → меню видов футбола → фильтры →
// 3 колонки (топ-лиги · лента матчей · виджеты) + баннеры.
// Админка — отдельный полноэкранный светлый шелл (Ozon-style).
// ============================================================

import { useCallback, useEffect, useState } from "react";
import { Toaster } from "sonner";
import { toast } from "sonner";
import { LogIn, LogOut, Search, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BRAND } from "./brand";
import { navigate, useRoute } from "./router";
import type { BannerDTO, OverviewDTO, SessionUserDTO } from "./types";
import SearchDialog, { openGlobalSearch } from "./SearchDialog";
import LeaguesSidebar from "./LeaguesSidebar";
import RightRail from "./RightRail";
import MatchDayView from "./MatchDayView";
import LeaguePage from "./LeaguePage";
import MatchPage from "./MatchPage";
import PlayerPage from "./PlayerPage";
import TeamPage from "./TeamPage";
import StadiumPage from "./StadiumPage";
import LoginView from "./LoginView";
import AdminShell from "./AdminShell";

const FORMATS: { id: string; label: string }[] = [
  { id: "all", label: "Все виды" },
  { id: "F11", label: "11×11" },
  { id: "F8", label: "8×8" },
  { id: "F6", label: "6×6" },
  { id: "FUTSAL", label: "Мини-футбол" },
];

const FAV_KEY = "s21-fav-leagues";

function loadFavs(): string[] {
  try {
    return JSON.parse(localStorage.getItem(FAV_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export default function Portal() {
  const route = useRoute();
  const [overview, setOverview] = useState<OverviewDTO | null>(null);
  const [banners, setBanners] = useState<BannerDTO[]>([]);
  const [user, setUser] = useState<SessionUserDTO | null>(null);
  const [version, setVersion] = useState(0);
  const [format, setFormat] = useState("all");
  const [favs, setFavs] = useState<string[]>([]);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  // Избранное хранится в localStorage — читаем после гидратации (без рассинхрона SSR)
  useEffect(() => {
    const t = setTimeout(() => setFavs(loadFavs()), 0);
    return () => clearTimeout(t);
  }, []);

  const toggleFav = useCallback((leagueId: string) => {
    setFavs((prev) => {
      const next = prev.includes(leagueId) ? prev.filter((x) => x !== leagueId) : [...prev, leagueId];
      localStorage.setItem(FAV_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

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

  // ---------- Админка: полноэкранный светлый шелл ----------
  if (route.name === "admin") {
    if (!canAdmin) {
      return (
        <div className="theme-dark flex min-h-screen items-center justify-center p-4">
          <Toaster richColors position="top-right" />
          <div className="max-w-md rounded-2xl border border-sline bg-s1 p-8 text-center">
            <p className="text-lg font-bold">Доступ ограничен</p>
            <p className="mt-2 text-sm text-ink2">Для входа в панель управления нужны права администратора, лиги, клуба или судьи.</p>
            <div className="mt-4 flex justify-center gap-2">
              <Button variant="outline" className="border-sline bg-transparent text-ink hover:bg-s2" onClick={() => navigate("/")}>На главную</Button>
              <Button className="bg-gold text-goldink hover:bg-gold/85" onClick={() => navigate("/login")}>Войти</Button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <AdminShell
        user={user!}
        version={version}
        bump={bump}
        onReload={reloadOverview}
        focusMatchId={route.matchId ?? null}
        onMatchHandled={() => navigate("/admin")}
      />
    );
  }

  // ---------- Публичный сайт: тёмная «Ночь под прожекторами» ----------
  return (
    <div className="theme-dark flex min-h-screen flex-col bg-s0 text-ink">
      <Toaster richColors position="top-right" theme="dark" />
      <SearchDialog />

      {/* ---------- Шапка: минимализм, бренд, поиск, вход ---------- */}
      <header className="sticky top-0 z-40 border-b border-sline bg-s0/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center gap-3 px-4">
          <button className="flex items-center gap-2.5" onClick={() => navigate("/")} aria-label="SCORES21 — на главную">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold font-mono text-lg font-black tracking-tighter text-goldink shadow-[0_0_24px_rgba(255,212,0,0.35)]">
              {BRAND.mark}
            </span>
            <span className="text-left leading-none">
              <span className="block text-xl font-black tracking-tight">
                {BRAND.wordmark}
                <span className="ml-1 text-gold">{BRAND.mark}</span>
              </span>
              <span className="mt-0.5 hidden text-[10px] font-medium text-ink3 sm:block">{BRAND.tagline}</span>
            </span>
          </button>

          <button
            onClick={openGlobalSearch}
            className="ml-4 hidden h-10 min-w-0 flex-1 max-w-md items-center gap-2 rounded-xl border border-sline bg-s1 px-3.5 text-sm text-ink3 transition-colors hover:border-gold/50 hover:text-ink2 md:flex"
            aria-label="Поиск по порталу"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate text-left">Поиск: команды, игроки, судьи…</span>
            <kbd className="shrink-0 rounded border border-sline bg-s2 px-1.5 py-0.5 font-mono text-[10px]">/</kbd>
          </button>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={openGlobalSearch}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-sline bg-s1 text-ink2 hover:text-ink md:hidden"
              aria-label="Поиск"
            >
              <Search className="h-4 w-4" />
            </button>
            {user ? (
              <>
                <div className="hidden text-right sm:block">
                  <p className="max-w-[160px] truncate text-xs font-semibold leading-tight text-ink">{user.personName ?? user.email}</p>
                  <p className="text-[10px] text-ink3">
                    {user.role === "SUPER_ADMIN" ? "Супер-админ" : user.role === "LEAGUE_ADMIN" ? "Админ лиги" : user.role === "REFEREE" ? "Судья" : user.role === "CLUB_ADMIN" ? "Админ клуба" : "Игрок"}
                  </p>
                </div>
                {canAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn("border-sline bg-s1 text-ink2 hover:border-gold/50 hover:bg-s2 hover:text-ink", route.name === "admin" && "border-gold text-gold")}
                    onClick={() => navigate("/admin")}
                  >
                    <Settings2 className="mr-1 h-4 w-4" />
                    <span className="hidden sm:inline">Админка</span>
                  </Button>
                )}
                <Button variant="outline" size="sm" className="border-sline bg-s1 text-ink2 hover:bg-s2 hover:text-ink" onClick={logout} aria-label="Выйти">
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button size="sm" className="bg-gold text-goldink hover:bg-gold/85" onClick={() => navigate("/login")}>
                <LogIn className="mr-1 h-4 w-4" /> Войти
              </Button>
            )}
          </div>
        </div>

        {/* ---------- Меню видов футбола ---------- */}
        <nav className="border-t border-sline/60" aria-label="Виды футбола">
          <div className="mx-auto flex w-full max-w-[1440px] items-center gap-1 overflow-x-auto px-4 scrollbar-none">
            {FORMATS.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setFormat(f.id);
                  if (route.name !== "home") navigate("/");
                }}
                className={cn(
                  "relative shrink-0 px-4 py-3 text-sm font-semibold transition-colors",
                  format === f.id ? "text-gold" : "text-ink2 hover:text-ink"
                )}
              >
                {f.label}
                {format === f.id && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-gold" />}
              </button>
            ))}
          </div>
        </nav>
      </header>

      {/* ---------- Верхний баннер (слот TOP) ---------- */}
      {topBanner && (
        <div className="mx-auto w-full max-w-[1440px] px-4 pt-4">
          <a
            href={topBanner.linkUrl ?? "#"}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="flex h-[72px] w-full items-center justify-between gap-4 rounded-xl border border-gold/30 bg-gradient-to-r from-gold/10 to-transparent px-6 transition-colors hover:border-gold/60"
          >
            <div>
              <p className="text-sm font-bold">{topBanner.title}</p>
              {topBanner.text && <p className="text-xs text-ink2">{topBanner.text}</p>}
            </div>
            <span className="rounded-md bg-gold px-2.5 py-1 text-[10px] font-bold text-goldink">Реклама</span>
          </a>
        </div>
      )}

      {/* ---------- 3-колоночная сетка ---------- */}
      <main className="flex-1">
        <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)_320px]">
          <aside className="hidden lg:block">
            <div className="sticky top-[132px] max-h-[calc(100vh-148px)] overflow-y-auto pr-1 scrollbar-s21">
              <LeaguesSidebar overview={overview} version={version} activeLeagueId={route.name === "league" ? route.id : null} favs={favs} onToggleFav={toggleFav} />
            </div>
          </aside>

          <div className="min-w-0">
            {route.name === "home" && (
              <MatchDayView format={format} overview={overview} version={version} favs={favs} onToggleFav={toggleFav} />
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
          </div>

          <aside className="hidden xl:block">
            <div className="sticky top-[132px] max-h-[calc(100vh-148px)] space-y-4 overflow-y-auto scrollbar-s21">
              <RightRail overview={overview} banners={banners} version={version} />
            </div>
          </aside>
        </div>
      </main>

      {/* ---------- Футер ---------- */}
      <footer className="mt-auto border-t border-sline bg-[#07090d]">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-6 text-xs text-ink3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-black tracking-tight text-ink">
              {BRAND.name} <span className="text-gold">·</span> {BRAND.domain}
            </p>
            <p className="mt-0.5">Спортивно-аналитический портал «{BRAND.tagline}» · {BRAND.region} · демо-стенд по PRD v1.0</p>
          </div>
          <div className="flex max-w-md flex-wrap gap-x-4 gap-y-1">
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
