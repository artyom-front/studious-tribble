"use client";

import { useCallback, useEffect, useState } from "react";

/** Мини-хук загрузки данных с авто-перезагрузкой при смене версии данных */
export function useFetch<T>(url: string | null, version = 0) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!url);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(url, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Ошибка загрузки данных");
      setData(j as T);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    void load();
  }, [load, version]);

  return { data, loading, error, reload: load };
}

/** POST/PATCH JSON-запрос; возвращает { ok, data | error } */
export async function apiPost<T = unknown>(url: string, body: unknown, method = "POST"): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
    const r = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, error: j?.error || `Ошибка ${r.status}` };
    return { ok: true, data: j as T };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Сетевая ошибка" };
  }
}

const TZ = "Europe/Moscow"; // все турниры — Чувашия (МСК)

export function fmtDate(iso: string, withTime = true): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric", timeZone: TZ });
  if (!withTime) return date;
  return `${date}, ${d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: TZ })}`;
}

export function fmtShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: TZ });
}
