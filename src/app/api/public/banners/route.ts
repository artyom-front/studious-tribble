// Активные баннеры по слотам (Milestone 4). Пустой слот → UI рисует заглушку «Реклама».

import { db } from "@/lib/db";
import { errorResponse } from "@/lib/http";

export async function GET() {
  try {
    const now = new Date();
    const banners = await db.banner.findMany({
      where: {
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    });
    return Response.json({
      banners: banners.map((b) => ({
        id: b.id, placement: b.placement, title: b.title,
        imageUrl: b.imageUrl, linkUrl: b.linkUrl, text: b.text,
      })),
    });
  } catch (e) {
    return errorResponse(e);
  }
}

export const dynamic = "force-dynamic";
