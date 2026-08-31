import { db } from "@/lib/db";
import { errorResponse } from "@/lib/http";

/** Команды сезона с составами (заявками) */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const seasonId = searchParams.get("seasonId");
    if (!seasonId) return Response.json({ error: "Укажите seasonId" }, { status: 422 });

    const regs = await db.registration.findMany({
      where: { seasonId },
      include: { person: true, team: { include: { club: true } } },
    });

    const teamsMap = new Map<string, {
      id: string; name: string; clubName: string | null; city: string | null;
      players: { id: string; name: string; position: string | null; number: number | null; endDate: string | null }[];
    }>();

    for (const r of regs) {
      if (!teamsMap.has(r.teamId)) {
        teamsMap.set(r.teamId, {
          id: r.team.id,
          name: r.team.name,
          clubName: r.team.club?.name ?? null,
          city: r.team.club?.city ?? null,
          players: [],
        });
      }
      teamsMap.get(r.teamId)!.players.push({
        id: r.personId,
        name: `${r.person.lastName} ${r.person.firstName}`,
        position: r.person.position,
        number: r.number,
        endDate: r.endDate?.toISOString() ?? null,
      });
    }

    const teams = [...teamsMap.values()].map((t) => ({
      ...t,
      players: t.players.sort((a, b) => (a.number ?? 99) - (b.number ?? 99) || a.name.localeCompare(b.name, "ru")),
    }));

    return Response.json({ teams });
  } catch (e) {
    return errorResponse(e);
  }
}

export const dynamic = "force-dynamic";
