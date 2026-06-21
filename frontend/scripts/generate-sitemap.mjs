const siteUrl = (process.env.VITE_SITE_URL ?? "https://smartclean.com.ua").replace(/\/$/, "");
const today = new Date().toISOString().slice(0, 10);

const routes = [
    { path: "/", changefreq: "weekly", priority: "1.0" },
    { path: "/services", changefreq: "weekly", priority: "0.9" },
    { path: "/reviews", changefreq: "weekly", priority: "0.8" },
    { path: "/faq", changefreq: "monthly", priority: "0.7" },
    { path: "/vacancies", changefreq: "monthly", priority: "0.5" },
];

const urls = routes
    .map(
        ({ path, changefreq, priority }) => `  <url>
    <loc>${siteUrl}${path === "/" ? "/" : path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`,
    )
    .join("\n");

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

await import("node:fs/promises").then(({ writeFile }) =>
    writeFile(new URL("../public/sitemap.xml", import.meta.url), sitemap, "utf8"),
);

console.log(`Generated sitemap.xml for ${siteUrl}`);
