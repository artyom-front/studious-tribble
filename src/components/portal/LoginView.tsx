"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LogIn, KeyRound, Info, ShieldCheck } from "lucide-react";
import { apiPost, useFetch } from "./hooks";
import type { SessionUserDTO } from "./types";
import { BRAND } from "./brand";

const DEMO_ACCOUNTS = [
  { email: "admin@ff21.ru", password: "admin123", role: "Супер-администратор", desc: "Merge профилей, КДК, аудит, все права" },
  { email: "liga@ff21.ru", password: "liga123", role: "Администратор лиги", desc: "Расписание, протоколы, дисциплины" },
  { email: "sudya@ff21.ru", password: "sudya123", role: "Судья", desc: "Ввод протоколов своих матчей" },
  { email: "club@ff21.ru", password: "club123", role: "Администратор клуба", desc: "Заявки и трансферы игроков" },
];

export default function LoginView({ onLoggedIn }: { onLoggedIn: (u: SessionUserDTO) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  // демо-входы скрыты на проде: SHOW_DEMO_ACCOUNTS=0 (см. DEPLOY.md)
  const { data: siteConfig } = useFetch<{ demoAccounts: boolean }>("/api/public/site-config");
  const showDemo = siteConfig?.demoAccounts ?? false;

  const login = async (e?: React.FormEvent, creds?: { email: string; password: string }) => {
    e?.preventDefault();
    const body = creds ?? { email, password };
    setLoading(true);
    const res = await apiPost<SessionUserDTO>("/api/auth/login", body);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`Добро пожаловать, ${res.data.personName ?? res.data.email}!`);
    onLoggedIn(res.data);
  };

  return (
    <div className="mx-auto grid max-w-3xl gap-4 py-6 lg:grid-cols-2">
      <div className="overflow-hidden rounded-2xl border border-sline bg-s1">
        <div className="stadium-glow flex items-center gap-2.5 px-5 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold font-mono text-base font-black text-goldink">{BRAND.mark}</span>
          <div>
            <p className="text-sm font-bold text-ink">Вход в систему</p>
            <p className="text-xs text-ink3">{BRAND.name} · протоколы, заявления, администрирование</p>
          </div>
        </div>
        <form onSubmit={login} className="space-y-4 p-5">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-ink2">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@ff21.ru" required className="border-sline bg-s1 text-ink placeholder:text-ink3" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-ink2">Пароль</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className="border-sline bg-s1 text-ink placeholder:text-ink3" />
          </div>
          <Button type="submit" className="w-full bg-gold text-goldink hover:bg-gold/85" disabled={loading}>
            <KeyRound className="mr-1 h-4 w-4" /> Войти
          </Button>
        </form>
      </div>

      {showDemo ? (
        <div className="overflow-hidden rounded-2xl border border-sline bg-s1">
          <div className="flex items-center gap-2 border-b border-sline/60 bg-s2/50 px-5 py-4">
            <Info className="h-4 w-4 text-gold" />
            <p className="text-sm font-bold text-ink">Демо-аккаунты (RBAC)</p>
          </div>
          <div className="space-y-2 p-4">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                onClick={() => login(undefined, { email: a.email, password: a.password })}
                className="w-full rounded-xl border border-sline/60 bg-s2/40 p-3 text-left transition-colors hover:border-gold/50 hover:bg-s2/80"
              >
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="text-sm font-semibold text-gold">{a.role}</span>
                  <span className="text-xs text-ink3">{a.email} / {a.password}</span>
                </div>
                <p className="mt-0.5 text-xs text-ink2">{a.desc}</p>
              </button>
            ))}
            <p className="pt-1 text-xs text-ink3">
              <LogIn className="mr-1 inline h-3 w-3" />
              Клик по аккаунту — мгновенный вход. Пароли демо-стенда, в проде — email-подтверждение и 2FA.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-sline bg-s1">
          <div className="flex items-center gap-2 border-b border-sline/60 bg-s2/50 px-5 py-4">
            <ShieldCheck className="h-4 w-4 text-ok" />
            <p className="text-sm font-bold text-ink">Доступ сотрудникам ФФЧ</p>
          </div>
          <div className="space-y-3 p-5 text-xs text-ink2">
            <p>Учётные данные выдаёт администратор федерации. Если вы потеряли доступ — напишите в службу поддержки портала.</p>
            <p className="text-ink3">Пароли хранятся в виде scrypt-хэшей; вход защищён ограничением числа попыток.</p>
          </div>
        </div>
      )}
    </div>
  );
}
