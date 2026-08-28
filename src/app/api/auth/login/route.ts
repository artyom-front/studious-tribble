import { db } from "@/lib/db";
import { verifyPassword, setSessionCookie } from "@/lib/auth";
import { errorResponse, HttpError } from "@/lib/http";

export async function POST(req: Request) {
  try {
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
