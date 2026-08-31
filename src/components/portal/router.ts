"use client";

// Мини hash-роутер SPA (в песочнице доступен только маршрут "/", поэтому навигация — через #/...).
// Даёт шаринг ссылок и кнопку «назад» без перезагрузки: #/match/12, #/team/3, #/league/2/table ...
// ВАЖНО: начальный стейт всегда "home" (совпадает с SSR), реальный hash применяется
// после гидратации — иначе возникает hydration mismatch.

import { useEffect, useState } from "react";

export type Route =
  | { name: "home" }
  | { name: "league"; id: string; tab: string }
  | { name: "match"; id: string }
  | { name: "team"; id: string }
  | { name: "player"; id: string }
  | { name: "stadium"; id: string }
  | { name: "login" }
  | { name: "admin"; matchId?: string };

const HOME: Route = { name: "home" };

export function parseHash(raw: string): Route {
  const hash = raw.replace(/^#\/?/, "").replace(/\?.*$/, "").replace(/\/$/, "");
  if (!hash) return HOME;
  const parts = hash.split("/");
  switch (parts[0]) {
    case "league":
      return parts[1] ? { name: "league", id: parts[1], tab: parts[2] ?? "matches" } : HOME;
    case "match":
      return parts[1] ? { name: "match", id: parts[1] } : HOME;
    case "team":
      return parts[1] ? { name: "team", id: parts[1] } : HOME;
    case "player":
      return parts[1] ? { name: "player", id: parts[1] } : HOME;
    case "stadium":
      return parts[1] ? { name: "stadium", id: parts[1] } : HOME;
    case "login":
      return { name: "login" };
    case "admin":
      return { name: "admin", matchId: parts[1] || undefined };
    default:
      return HOME;
  }
}

export function navigate(path: string) {
  const target = path.startsWith("#") ? path : `#${path.startsWith("/") ? path : `/${path}`}`;
  if (window.location.hash === target) return;
  window.location.hash = target;
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(HOME);

  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash(window.location.hash));
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", onChange);
    // Пост-гидратационная синхронизация с реальным URL (deep links #/match/…)
    const t = setTimeout(onChange, 0);
    return () => {
      window.removeEventListener("hashchange", onChange);
      clearTimeout(t);
    };
  }, []);

  return route;
}

/** Дата (МСК) в YYYY-MM-DD со смещением в днях */
export function mskDay(offsetDays = 0): string {
  return new Date(Date.now() + 3 * 3600 * 1000 + offsetDays * 86400000).toISOString().slice(0, 10);
}
