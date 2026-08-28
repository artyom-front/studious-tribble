import { errorResponse } from "@/lib/http";
import { loadSeasonData, toMatchDTO } from "@/lib/queries";

/** Календарь матчей сезона */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const seasonId = searchParams.get("seasonId");
    if (!seasonId) return Response.json({ error: "Укажите seasonId" }, { status: 422 });

    const { season, matches } = await loadSeasonData(seasonId);
    return Response.json({
      season: {
        id: season.id,
        name: season.name,
        league: { id: season.league.id, name: season.league.name, walkoverScore: season.league.walkoverScore },
      },
      matches: matches.map((m) => toMatchDTO(m, season.league.walkoverScore)),
    });
  } catch (e) {
    return errorResponse(e);
  }
}

export const dynamic = "force-dynamic";
