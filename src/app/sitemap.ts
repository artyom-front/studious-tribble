import type { MetadataRoute } from "next";

/** Карта сайта. Портал — SPA с hash-роутингом (#/match/…), поэтому публичный
 *  вход один — главная livescore-страница; глубокие ссылки индексируются
 *  по мере перехода на SSR-страницы (см. план SEO в DEPLOY.md). */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.SITE_URL ?? "https://scores21.ru";
  return [
    {
      url: base,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
  ];
}
