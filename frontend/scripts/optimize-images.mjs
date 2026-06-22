import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");
const maxWidth = 1280;
const webpQuality = 78;

async function optimizePng(fileName) {
    const inputPath = path.join(publicDir, fileName);
    const outputPath = path.join(publicDir, fileName.replace(/\.png$/i, ".webp"));
    const before = (await stat(inputPath)).size;

    await sharp(inputPath)
        .rotate()
        .resize({ width: maxWidth, withoutEnlargement: true })
        .webp({ quality: webpQuality, effort: 4 })
        .toFile(outputPath);

    const after = (await stat(outputPath)).size;
    const saved = Math.round((1 - after / before) * 100);
    console.log(`${fileName} → ${fileName.replace(/\.png$/i, ".webp")} (${Math.round(before / 1024)}KB → ${Math.round(after / 1024)}KB, -${saved}%)`);
}

const entries = await readdir(publicDir);
const pngFiles = entries.filter((name) => /^[0-9]+\.png$/i.test(name));

if (pngFiles.length === 0) {
    console.log("No gallery PNG files found.");
    process.exit(0);
}

await Promise.all(pngFiles.map(optimizePng));
console.log(`Optimized ${pngFiles.length} images.`);
