/**
 * `imports/pending/*.json` içindeki ürün dizilerinden benzersiz marka adlarını çıkarır,
 * normalize eder ve name,slug CSV üretir.
 *
 * Kullanım (worker kökünden):
 *   pnpm extract:brands-pending
 *   pnpm extract:brands-pending -- --dir imports/pending --out brands.csv
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import {
  isGenericFeedImportBrandPhrase,
  normalizeFeedBrandMatchKey,
  slugifyCanonical
} from "@ucuzabak/shared";

const BRAND_RE = /"brand"\s*:\s*"([^"]*)"/g;

function titleCaseWord(word: string): string {
  if (!word) return word;
  let w = word;
  if (/^[A-Za-zÇĞİÖŞÜçğıöşü0-9]{1,5}\.$/.test(w)) {
    w = w.slice(0, -1);
  }
  const lower = w.toLocaleLowerCase("tr-TR");
  return lower.charAt(0).toLocaleUpperCase("tr-TR") + lower.slice(1);
}

/** Ör. bosch → Bosch, GHASSY CO. → Ghassy Co */
function brandToProperName(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map(titleCaseWord)
    .join(" ");
}

function parseArgs(argv: string[]) {
  let dir = path.resolve(__dirname, "../imports/pending");
  let out: string | null = path.join(dir, "brands-extracted.csv");
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--dir" && argv[i + 1]) {
      dir = path.resolve(process.cwd(), argv[++i]);
    } else if (argv[i] === "--out" && argv[i + 1]) {
      out = path.resolve(process.cwd(), argv[++i]);
    } else if (argv[i] === "--stdout") {
      out = null;
    }
  }
  return { dir, out };
}

async function extractBrandsFromFile(filePath: string, freq: Map<string, number>): Promise<void> {
  const stream = fs.createReadStream(filePath, { encoding: "utf8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) {
    BRAND_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = BRAND_RE.exec(line)) !== null) {
      const b = m[1].trim();
      if (b.length < 2) continue;
      freq.set(b, (freq.get(b) ?? 0) + 1);
    }
  }
}

function pickRepresentativeRaw(candidates: Map<string, number>): string {
  let best = "";
  let bestScore = -1;
  for (const [raw, count] of candidates) {
    const len = raw.length;
    if (count > bestScore || (count === bestScore && len > best.length)) {
      bestScore = count;
      best = raw;
    }
  }
  return best;
}

function escapeCsvField(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function main() {
  const { dir, out } = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(dir)) {
    console.error(`Klasör yok: ${dir}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".json"))
    .map((f) => path.join(dir, f));

  if (files.length === 0) {
    console.error(`${dir} içinde .json yok.`);
    process.exit(1);
  }

  const rawFreq = new Map<string, number>();
  for (const f of files) {
    process.stderr.write(`Okunuyor: ${path.basename(f)}\n`);
    await extractBrandsFromFile(f, rawFreq);
  }

  const byNorm = new Map<string, Map<string, number>>();
  for (const [raw, count] of rawFreq) {
    const k = normalizeFeedBrandMatchKey(raw);
    if (k.length < 2) continue;
    if (!byNorm.has(k)) byNorm.set(k, new Map());
    const m = byNorm.get(k)!;
    m.set(raw, (m.get(raw) ?? 0) + count);
  }

  const rows: { name: string; slug: string }[] = [];
  let skippedGeneric = 0;

  for (const [normKey, candidates] of byNorm) {
    if (isGenericFeedImportBrandPhrase(normKey)) {
      skippedGeneric += 1;
      continue;
    }
    const raw = pickRepresentativeRaw(candidates);
    const name = brandToProperName(raw);
    const slug = slugifyCanonical(name);
    if (!slug || slug.length < 2) continue;
    rows.push({ name, slug });
  }

  rows.sort((a, b) => a.name.localeCompare(b.name, "tr", { sensitivity: "base" }));

  const lines = ["name,slug", ...rows.map((r) => `${escapeCsvField(r.name)},${r.slug}`)];
  const csv = `${lines.join("\n")}\n`;

  if (out) {
    fs.writeFileSync(out, csv, "utf8");
    process.stderr.write(
      `\nYazıldı: ${out}\nMarka: ${rows.length} (jenerik grup atlandı: ${skippedGeneric}, ham tekil string: ${rawFreq.size})\n`
    );
  } else {
    process.stdout.write(csv);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
