import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const catalogPath = join(__dirname, "..", "backend", "LearnCSharp.Api", "Data", "service-area-streets.json");

const query =
    '[out:json][timeout:120];(way["highway"]["name"](48.5853095,22.2452223,48.6032686,22.2934663););out tags;';

const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "CleanPro/1.0",
    },
    body: `data=${encodeURIComponent(query)}`,
});

const data = await response.json();
const names = new Set();

for (const element of data.elements ?? []) {
    for (const key of ["name", "name:uk"]) {
        const value = element.tags?.[key]?.trim();
        if (value) {
            names.add(value);
        }
    }
}

const raw = readFileSync(catalogPath, "utf8").replace(/^\uFEFF/, "");
const catalog = JSON.parse(raw);
catalog.settlements.minai = {
    id: "minai",
    label: "с. Минай",
    shortName: "Минай",
    streets: [...names].sort((left, right) => left.localeCompare(right, "uk")),
};

writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), "utf8");
console.log(`Updated Mynai with ${catalog.settlements.minai.streets.length} streets`);
