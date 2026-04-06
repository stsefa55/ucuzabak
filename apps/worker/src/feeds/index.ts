import { FeedType } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import https from "node:https";
import { AmazonJsonAdapter } from "./amazon.adapter";
import { HepsiburadaCsvAdapter } from "./hepsiburada.adapter";
import { TrendyolXmlAdapter } from "./trendyol.adapter";
import { isTrendyolNormalizedJsonPayload, TrendyolJsonAdapter } from "./trendyol-json.adapter";
import { FeedAdapter } from "./types";

const trendyolAdapter = new TrendyolXmlAdapter();
const hepsiburadaAdapter = new HepsiburadaCsvAdapter();
const amazonAdapter = new AmazonJsonAdapter();
const trendyolJsonAdapter = new TrendyolJsonAdapter();

export function getFeedAdapter(type: FeedType, storeSlug: string): FeedAdapter {
  const slug = storeSlug.toLowerCase();
  switch (type) {
    case "XML":
      return trendyolAdapter;
    case "CSV":
      return hepsiburadaAdapter;
    case "JSON_API":
    default:
      return slug === "trendyol" ? trendyolJsonAdapter : amazonAdapter;
  }
}

export { isTrendyolNormalizedJsonPayload, trendyolJsonAdapter };

function fetchRemote(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https://") ? https : http;
    const req = client.get(url, (res) => {
      if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
        reject(new Error(`Uzak feed indirilemedi (status: ${res.statusCode})`));
        res.resume();
        return;
      }
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        resolve(Buffer.concat(chunks).toString("utf8"));
      });
    });
    req.on("error", (err) => reject(err));
  });
}

export async function readFeedFile(sourceRef: string): Promise<string> {
  if (!sourceRef) {
    throw new Error("Feed kaynağı (sourceRef) boş.");
  }

  if (sourceRef.startsWith("http://") || sourceRef.startsWith("https://")) {
    return fetchRemote(sourceRef);
  }

  const cwd = process.cwd();
  const appsSegment = `${path.sep}apps${path.sep}`;
  const repoRoot =
    cwd.includes(appsSegment) ? cwd.slice(0, cwd.indexOf(appsSegment)) : cwd;

  const baseDir =
    process.env.FEEDS_BASE_PATH || path.join(repoRoot, "feeds", "sample");
  const filePath = path.isAbsolute(sourceRef) ? sourceRef : path.join(baseDir, sourceRef);
  return fs.readFileSync(filePath, "utf8");
}

export type { FeedParseResult, ParsedFeedItem } from "./types";
export {
  coerceFeedItemExternalId,
  isValidFeedExternalId,
  primitiveFeedIdCandidate,
  slugSafeSegmentFromExternalId,
  stripFeedFileUtf8Bom
} from "./feedIdentity";

