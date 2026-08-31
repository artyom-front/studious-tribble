import { db } from "@/lib/db";
import { verifyPassword, setSessionCookie } from "@/lib/auth";
import { errorResponse, HttpError } from "@/lib/http";

// Прод-защита от подбора пароля: скользящее окно на IP (в памяти процесса).
// Для кластера из нескольких инстансов выносится в Redis — см. DEPLOY.md.
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 10;
const attempts = new Map<string, number[]>();

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "local";
}

function tooManyAttempts(ip: string): boolean {
  const now = Date.now();
  const arr = (attempts.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= MAX_ATTEMPTS) {
    attempts.set(ip, arr);
    return true;
  }
  arr.push(now);
  attempts.set(ip, arr);
  // не даём карте расти бесконечно
  if (attempts.size > 10_000) attempts.clear();
  return false;
}

export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    if (tooManyAttempts(ip)) {
      throw new HttpError(429, "Слишком много попыток входа. Подождите минуту и попробуйте снова");
    }

    const { email, password } = await req.json();
    if (!email || !password) throw new HttpError(422, "Укажите email и пароль");

    const user = await db.user.findUnique({ where: { email: String(email).toLowerCase().trim() }, include: { person: true } });
    if (!user || !verifyPassword(String(password), user.passwordHash)) {
      throw new HttpError(401, "Неверный email или пароль");
    }

    await setSessionCookie(user.id);
    return Response.json({
      id: user.id,
      email: user.email,
      role: user.role,
      personId: user.personId,
      clubId: user.clubId,
      personName: user.person ? `${user.person.lastName} ${user.person.firstName}` : null,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
