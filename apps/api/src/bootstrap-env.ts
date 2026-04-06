/**
 * Nest/Prisma başlamadan önce: monorepo kök `.env` + `apps/api/.env`.
 *
 * Öncelik:
 * - Docker Compose ile gelen `process.env` her zaman korunur (asla üzerine yazılmaz).
 * - Yerelde: önce kök, sonra uygulama; uygulama dosyası kökteki anahtarları geçersiz kılabilir (`override: true`).
 * - Docker’da (`RUNNING_IN_DOCKER`): uygulama `.env` dosyası yalnızca Compose’da tanımlı olmayan anahtarları doldurur (`override: false`).
 */
import { config } from "dotenv";
import path from "path";

function runningInDocker(): boolean {
  const v = process.env.RUNNING_IN_DOCKER?.trim();
  return v === "true" || v === "1";
}

const appRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(appRoot, "..", "..");

config({ path: path.join(repoRoot, ".env"), override: false });
config({
  path: path.join(appRoot, ".env"),
  override: !runningInDocker()
});
