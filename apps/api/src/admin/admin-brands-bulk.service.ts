import { Injectable } from "@nestjs/common";
import { parse } from "csv-parse/sync";
import {
  isGenericFeedImportBrandPhrase,
  normalizeFeedBrandMatchKey,
  slugifyCanonical
} from "@ucuzabak/shared";
import { PrismaService } from "../prisma/prisma.service";

export type BulkBrandRowStatus =
  | "importable"
  | "created"
  | "skipped_duplicate"
  | "skipped_generic"
  | "skipped_invalid"
  | "skipped_duplicate_in_file"
  | "skipped_slug_unresolvable";

export type BulkBrandPreviewRow = {
  raw: string;
  name: string;
  slug: string;
  normalizedKey: string;
  status: BulkBrandRowStatus;
  messageTr: string;
};

export type BulkBrandImportResult = {
  dryRun: boolean;
  rows: BulkBrandPreviewRow[];
  importableCount: number;
  createdCount: number;
  skippedCount: number;
  duplicateCount: number;
  genericSkippedCount: number;
  invalidCount: number;
  duplicateInFileCount: number;
  slugSuffixedCount: number;
};

@Injectable()
export class AdminBrandsBulkService {
  constructor(private readonly prisma: PrismaService) {}

  private parseInput(format: "csv" | "lines", text: string): { name: string; slugHint: string | null; raw: string }[] {
    const t = text.replace(/^\uFEFF/, "").trim();
    if (!t) return [];

    if (format === "lines") {
      return t
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => ({ name: line, slugHint: null, raw: line }));
    }

    let records: Record<string, string>[];
    try {
      records = parse(t, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true
      }) as Record<string, string>[];
    } catch {
      return [];
    }

    const out: { name: string; slugHint: string | null; raw: string }[] = [];
    for (const rec of records) {
      const nameKey = this.findColumn(rec, ["name", "marka", "brand", "title", "ad"]);
      const slugKey = this.findColumn(rec, ["slug", "url", "handle"]);
      const name = nameKey ? String(rec[nameKey] ?? "").trim() : "";
      const slugHintRaw = slugKey ? String(rec[slugKey] ?? "").trim() : "";
      const slugHint = slugHintRaw.length > 0 ? slugHintRaw : null;
      const raw = JSON.stringify(rec);
      if (name) out.push({ name, slugHint, raw });
    }
    return out;
  }

  private findColumn(rec: Record<string, string>, candidates: string[]): string | null {
    const keys = Object.keys(rec);
    const lower = new Map(keys.map((k) => [k.toLowerCase(), k]));
    for (const c of candidates) {
      const k = lower.get(c.toLowerCase());
      if (k) return k;
    }
    return null;
  }

  private baseSlugFromName(name: string, slugHint: string | null): string {
    if (slugHint?.trim()) {
      const s = slugifyCanonical(slugHint.trim());
      if (s.length >= 2) return s;
    }
    return slugifyCanonical(name);
  }

  /** Mevcut slug kümesi + bu toplu işte ayrılan slug’lar içinde benzersiz slug (ürün slug’ları gibi -2, -3). */
  private allocateSlug(
    base: string,
    dbSlugs: Set<string>,
    reserved: Set<string>
  ): { slug: string; suffixed: boolean } {
    let candidate = base;
    if (candidate.length < 2) candidate = "marka";
    let n = 0;
    let suffixed = false;
    while (dbSlugs.has(candidate) || reserved.has(candidate)) {
      n += 1;
      suffixed = true;
      const suffix = n === 1 ? "2" : String(n + 1);
      const trimmedBase = base.slice(0, Math.max(2, 100 - suffix.length - 1)).replace(/-+$/g, "");
      candidate = `${trimmedBase}-${suffix}`;
      if (n > 500) {
        return { slug: "", suffixed: false };
      }
    }
    reserved.add(candidate);
    return { slug: candidate, suffixed };
  }

  async run(format: "csv" | "lines", text: string, dryRun: boolean): Promise<BulkBrandImportResult> {
    const parsed = this.parseInput(format, text);
    const existing = await this.prisma.brand.findMany({
      select: { id: true, name: true, slug: true }
    });

    const dbByNormKey = new Map<string, { id: number; name: string; slug: string }>();
    const dbSlugs = new Set<string>();
    for (const b of existing) {
      dbSlugs.add(b.slug);
      const k = normalizeFeedBrandMatchKey(b.name);
      if (k.length >= 2 && !dbByNormKey.has(k)) dbByNormKey.set(k, b);
    }

    const seenNormInFile = new Set<string>();
    const reservedSlugs = new Set<string>();

    const rows: BulkBrandPreviewRow[] = [];
    let duplicateCount = 0;
    let genericSkippedCount = 0;
    let invalidCount = 0;
    let duplicateInFileCount = 0;
    let slugSuffixedCount = 0;

    const toCreate: { name: string; slug: string }[] = [];

    for (const p of parsed) {
      const name = p.name.trim();
      const raw = p.raw.length > 200 ? `${p.raw.slice(0, 200)}…` : p.raw;

      if (name.length < 2) {
        invalidCount += 1;
        rows.push({
          raw,
          name,
          slug: "",
          normalizedKey: "",
          status: "skipped_invalid",
          messageTr: "Ad çok kısa veya boş."
        });
        continue;
      }

      const normKey = normalizeFeedBrandMatchKey(name);
      if (!normKey || normKey.length < 2 || isGenericFeedImportBrandPhrase(normKey)) {
        genericSkippedCount += 1;
        rows.push({
          raw,
          name,
          slug: "",
          normalizedKey: normKey,
          status: "skipped_generic",
          messageTr: "Jenerik / güvenilmez marka ifadesi (ör. «Genel Markalar») — atlandı."
        });
        continue;
      }

      if (dbByNormKey.has(normKey)) {
        duplicateCount += 1;
        const ex = dbByNormKey.get(normKey)!;
        rows.push({
          raw,
          name,
          slug: ex.slug,
          normalizedKey: normKey,
          status: "skipped_duplicate",
          messageTr: `Zaten var: «${ex.name}» (slug: ${ex.slug}).`
        });
        continue;
      }

      if (seenNormInFile.has(normKey)) {
        duplicateInFileCount += 1;
        rows.push({
          raw,
          name,
          slug: "",
          normalizedKey: normKey,
          status: "skipped_duplicate_in_file",
          messageTr: "Aynı dosyada bu normalize ad daha önce geçti — atlandı."
        });
        continue;
      }
      seenNormInFile.add(normKey);

      const base = this.baseSlugFromName(name, p.slugHint);
      if (!base || base.length < 2) {
        invalidCount += 1;
        rows.push({
          raw,
          name,
          slug: "",
          normalizedKey: normKey,
          status: "skipped_slug_unresolvable",
          messageTr: "Slug üretilemedi."
        });
        continue;
      }

      const { slug, suffixed } = this.allocateSlug(base, dbSlugs, reservedSlugs);
      if (!slug) {
        invalidCount += 1;
        rows.push({
          raw,
          name,
          slug: "",
          normalizedKey: normKey,
          status: "skipped_slug_unresolvable",
          messageTr: "Benzersiz slug ayrılamadı."
        });
        continue;
      }
      if (suffixed) slugSuffixedCount += 1;

      rows.push({
        raw,
        name,
        slug,
        normalizedKey: normKey,
        status: "importable",
        messageTr: suffixed
          ? `Slug çakışması nedeniyle «${slug}» olarak ayrıldı.`
          : "İçe aktarılabilir."
      });
      toCreate.push({ name, slug });
      dbSlugs.add(slug);
      dbByNormKey.set(normKey, { id: -1, name, slug });
    }

    let createdCount = 0;

    if (!dryRun && toCreate.length > 0) {
      await this.prisma.$transaction(
        toCreate.map((row) =>
          this.prisma.brand.create({
            data: { name: row.name, slug: row.slug }
          })
        )
      );
      createdCount = toCreate.length;
      const createdSlugs = new Set(toCreate.map((c) => c.slug));
      for (const r of rows) {
        if (r.status === "importable" && createdSlugs.has(r.slug)) {
          r.status = "created";
          r.messageTr = "Kayıt oluşturuldu.";
        }
      }
    }

    const skippedCount = rows.filter((r) => r.status !== "importable" && r.status !== "created").length;
    const importableCount = rows.filter((r) => r.status === "importable").length;

    return {
      dryRun,
      rows,
      importableCount,
      createdCount: dryRun ? 0 : createdCount,
      skippedCount,
      duplicateCount,
      genericSkippedCount,
      invalidCount,
      duplicateInFileCount,
      slugSuffixedCount
    };
  }

  /** Operatör onaylı nihai canonical ad listesi (satır başına bir ad). */
  async createFromCanonicalNames(names: string[], dryRun: boolean): Promise<BulkBrandImportResult> {
    const filtered = names.map((n) => n.trim()).filter((n) => n.length >= 2);
    if (filtered.length === 0) {
      return {
        dryRun,
        rows: [],
        importableCount: 0,
        createdCount: 0,
        skippedCount: 0,
        duplicateCount: 0,
        genericSkippedCount: 0,
        invalidCount: 0,
        duplicateInFileCount: 0,
        slugSuffixedCount: 0
      };
    }
    return this.run("lines", filtered.join("\n"), dryRun);
  }
}
