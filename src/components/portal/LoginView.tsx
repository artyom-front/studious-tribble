"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LogIn, KeyRound, Info } from "lucide-react";
import { apiPost } from "./hooks";
import type { SessionUserDTO } from "./types";

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
      <Card className="border-zinc-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><LogIn className="h-4 w-4 text-emerald-600" /> Вход в систему</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={login} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@ff21.ru" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Пароль</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
              <KeyRound className="mr-1 h-4 w-4" /> Войти
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-zinc-200 bg-zinc-900 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Info className="h-4 w-4 text-emerald-400" /> Демо-аккаунты (RBAC)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {DEMO_ACCOUNTS.map((a) => (
            <button
              key={a.email}
              onClick={() => login(undefined, { email: a.email, password: a.password })}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-800/50 p-3 text-left transition-colors hover:border-emerald-700 hover:bg-zinc-800"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-emerald-400">{a.role}</span>
                <span className="text-[11px] text-zinc-400">{a.email} / {a.password}</span>
              </div>
              <p className="mt-0.5 text-xs text-zinc-400">{a.desc}</p>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
