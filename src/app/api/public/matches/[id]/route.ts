import { db } from "@/lib/db";
import { errorResponse, HttpError } from "@/lib/http";

/** Детальная карточка матча: события, составы, судья, оценки */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const match = await db.match.findUnique({
      where: { id },
      include: {
        homeTeam: { include: { club: true } },
        awayTeam: { include: { club: true } },
        stadium: true,
        referee: true,
        stage: { include: { season: { include: { league: true } } } },
        events: {
          include: { person: true, assistPerson: true, team: true },
          orderBy: { minute: "asc" },
        },
        lineups: { include: { person: true, team: true } },
        ratings: { include: { author: true } },
      },
    });
    if (!match) throw new HttpError(404, "Матч не найден");

    return Response.json({
      match: {
        id: match.id,
        round: match.round,
        kickoff: match.kickoff.toISOString(),
        status: match.status,
        walkoverType: match.walkoverType,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        note: match.note,
        regulationScore: match.stage.season.league.walkoverScore,
        homeTeam: { id: match.homeTeam.id, name: match.homeTeam.name, clubName: match.homeTeam.club?.name ?? null },
        awayTeam: { id: match.awayTeam.id, name: match.awayTeam.name, clubName: match.awayTeam.club?.name ?? null },
        stadium: match.stadium ? { id: match.stadium.id, name: match.stadium.name, city: match.stadium.city } : null,
        referee: match.referee ? { id: match.referee.id, name: `${match.referee.lastName} ${match.referee.firstName} ${match.referee.middleName ?? ""}`.trim() } : null,
        season: { id: match.stage.season.id, name: match.stage.season.name },
        league: { id: match.stage.season.league.id, name: match.stage.season.league.name, walkoverScore: match.stage.season.league.walkoverScore },
        events: match.events.map((e) => ({
          id: e.id,
          minute: e.minute,
          type: e.type,
          person: { id: e.person.id, name: `${e.person.lastName} ${e.person.firstName}` },
          assist: e.assistPerson ? { id: e.assistPerson.id, name: `${e.assistPerson.lastName} ${e.assistPerson.firstName}` } : null,
          teamId: e.teamId,
        })),
        lineups: match.lineups.map((l) => ({
          id: l.id,
          teamId: l.teamId,
          person: { id: l.person.id, name: `${l.person.lastName} ${l.person.firstName}`, position: l.person.position },
          isStarter: l.isStarter,
          number: l.number,
        })),
        ratings: match.ratings.map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          createdAt: r.createdAt.toISOString(),
          // анонимность автора (PRD §4)
          authorRole: r.author.role,
        })),
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
