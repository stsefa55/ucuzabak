"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFeedAdapter = getFeedAdapter;
exports.readFeedFile = readFeedFile;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_http_1 = __importDefault(require("node:http"));
const node_https_1 = __importDefault(require("node:https"));
const amazon_adapter_1 = require("./amazon.adapter");
const hepsiburada_adapter_1 = require("./hepsiburada.adapter");
const trendyol_adapter_1 = require("./trendyol.adapter");
const trendyolAdapter = new trendyol_adapter_1.TrendyolXmlAdapter();
const hepsiburadaAdapter = new hepsiburada_adapter_1.HepsiburadaCsvAdapter();
const amazonAdapter = new amazon_adapter_1.AmazonJsonAdapter();
function getFeedAdapter(type, storeSlug) {
    switch (type) {
        case "XML":
            return trendyolAdapter;
        case "CSV":
            return hepsiburadaAdapter;
        case "JSON_API":
        default:
            return amazonAdapter;
    }
}
function fetchRemote(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith("https://") ? node_https_1.default : node_http_1.default;
        const req = client.get(url, (res) => {
            if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
                reject(new Error(`Uzak feed indirilemedi (status: ${res.statusCode})`));
                res.resume();
                return;
            }
            const chunks = [];
            res.on("data", (chunk) => chunks.push(chunk));
            res.on("end", () => {
                resolve(Buffer.concat(chunks).toString("utf8"));
            });
        });
        req.on("error", (err) => reject(err));
    });
}
async function readFeedFile(sourceRef) {
    if (!sourceRef) {
        throw new Error("Feed kaynağı (sourceRef) boş.");
    }
    if (sourceRef.startsWith("http://") || sourceRef.startsWith("https://")) {
        return fetchRemote(sourceRef);
    }
    const cwd = process.cwd();
    const appsSegment = `${node_path_1.default.sep}apps${node_path_1.default.sep}`;
    const repoRoot = cwd.includes(appsSegment) ? cwd.slice(0, cwd.indexOf(appsSegment)) : cwd;
    const baseDir = process.env.FEEDS_BASE_PATH || node_path_1.default.join(repoRoot, "feeds", "sample");
    const filePath = node_path_1.default.isAbsolute(sourceRef) ? sourceRef : node_path_1.default.join(baseDir, sourceRef);
    return node_fs_1.default.readFileSync(filePath, "utf8");
}
//# sourceMappingURL=index.js.map