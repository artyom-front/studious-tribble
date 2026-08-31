// Разовое обновление текста баннера в БД (SCOREBOX → SCORES21)
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const res = await db.banner.updateMany({
    where: { text: { contains: "SCOREBOX" } },
    data: { text: "Футбольная форма, бутсы и вратарские перчатки со скидкой 15% по промокоду SCORES21" },
  });
  console.log("Обновлено баннеров:", res.count);
}

main().finally(() => db.$disconnect());
