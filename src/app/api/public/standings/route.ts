import { errorResponse } from "@/lib/http";
import { seasonStandings, loadSeasonData } from "@/lib/queries";

/** Турнирная таблица сезона (ленивая материализация — в проде Materialized View + пересчёт в очереди) */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const seasonId = searchParams.get("seasonId");
    if (!seasonId) return Response.json({ error: "Укажите seasonId" }, { status: 422 });

    const [standings, data] = await Promise.all([seasonStandings(seasonId), loadSeasonData(seasonId)]);
    return Response.json({
      season: {
        id: data.season.id,
        name: data.season.name,
        league: { id: data.season.league.id, name: data.season.league.name, format: data.season.league.format, walkoverScore: data.season.league.walkoverScore },
      },
      stage: data.stages[0] ? { id: data.stages[0].id, name: data.stages[0].name, tieBreakers: data.stages[0].tieBreakers } : null,
      standings,
    });
  } catch (e) {
    return errorResponse(e);
  }
}

export const dynamic = "force-dynamic";
