/**
 * Fetches all named highways from OpenStreetMap for Uzhhorod bbox + Mynai + Storozhnytsia areas.
 * Run: node scripts/fetch-osm-streets.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "backend", "LearnCSharp.Api", "Data", "service-area-streets.json");

const OVERPASS = "https://overpass-api.de/api/interpreter";
const USER_AGENT = "CleanPro/1.0 (street-import; contact@cleanpro.local)";

const AREAS = {
    uzhhorod: {
        label: "м. Ужгород",
        shortName: "Ужгород",
        bboxes: [
            [48.4623731, 22.1422572, 48.6223731, 22.3022572],
            [48.4623731, 22.3022572, 48.6223731, 22.4622572],
            [48.6223731, 22.1422572, 48.7823731, 22.3022572],
            [48.6223731, 22.3022572, 48.7823731, 22.4622572],
        ],
        areaIds: [],
    },
    minai: {
        label: "с. Минай",
        shortName: "Минай",
        bboxes: [[48.5853095, 22.2452223, 48.6032686, 22.2934663]],
        areaIds: [],
    },
    storozhnytsia: {
        label: "с. Сторожниця",
        shortName: "Сторожниця",
        bboxes: [[48.5888716, 22.2112623, 48.6148466, 22.2694073]],
        areaIds: [],
    },
};

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function overpass(query) {
    const response = await fetch(OVERPASS, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": USER_AGENT,
        },
        body: `data=${encodeURIComponent(query)}`,
    });

    const text = await response.text();
    if (!response.ok) {
        throw new Error(`Overpass ${response.status}: ${text.slice(0, 400)}`);
    }

    return JSON.parse(text);
}

function collectNames(elements) {
    const names = new Set();
    for (const element of elements) {
        const tags = element.tags ?? {};
        const uk = tags["name:uk"]?.trim();
        const name = tags.name?.trim();

        if (uk) {
            names.add(uk);
        } else if (name) {
            names.add(name);
        }
    }
    return names;
}

async function fetchBBox(south, west, north, east) {
    const query = `[out:json][timeout:120];
(
  way["highway"]["name"](${south},${west},${north},${east});
);
out tags;`;

    const data = await overpass(query);
    return collectNames(data.elements ?? []);
}

async function fetchArea(areaId) {
    const query = `[out:json][timeout:120];
area(${areaId})->.a;
(
  way["highway"]["name"](area.a);
);
out tags;`;

    const data = await overpass(query);
    return collectNames(data.elements ?? []);
}

async function fetchSettlement(id, config) {
    const names = new Set();

    for (const areaId of config.areaIds) {
        console.log(`  area ${areaId}...`);
        const chunk = await fetchArea(areaId);
        chunk.forEach((name) => names.add(name));
        await sleep(5000);
    }

    for (const [south, west, north, east] of config.bboxes) {
        console.log(`  bbox ${south},${west},${north},${east}...`);
        const chunk = await fetchBBox(south, west, north, east);
        chunk.forEach((name) => names.add(name));
        await sleep(5000);
    }

    return [...names].sort((a, b) => a.localeCompare(b, "uk"));
}

async function main() {
    const output = {
        fetchedAtUtc: new Date().toISOString(),
        source: "OpenStreetMap via Overpass API",
        settlements: {},
    };

    for (const [id, config] of Object.entries(AREAS)) {
        console.log(`Fetching ${config.shortName}...`);
        try {
            const streets = await fetchSettlement(id, config);
            output.settlements[id] = {
                id,
                label: config.label,
                shortName: config.shortName,
                streets,
            };
            console.log(`  -> ${streets.length} streets`);
        } catch (error) {
            console.error(`  FAILED: ${error.message}`);
            output.settlements[id] = {
                id,
                label: config.label,
                shortName: config.shortName,
                streets: [],
                error: error.message,
            };
        }
    }

    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, JSON.stringify(output, null, 2), "utf8");
    console.log(`Saved ${OUT}`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
