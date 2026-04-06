import { randomBytes } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { diskStorage } from "multer";
import type { Options } from "multer";

export const BANNER_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
]);

export function bannerUploadRoot(): string {
  const dir =
    process.env.BANNER_UPLOAD_DIR?.trim() ||
    path.join(process.cwd(), "data", "uploads", "banners");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const SAFE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

export function bannerImageDiskStorage() {
  return diskStorage({
    destination: (_req, _file, cb) => cb(null, bannerUploadRoot()),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
      const safeExt = SAFE_EXT.has(ext) ? ext : ".jpg";
      cb(null, `banner-${Date.now()}-${randomBytes(6).toString("hex")}${safeExt}`);
    }
  });
}

export function bannerImageMulterOptions(): Options {
  return {
    storage: bannerImageDiskStorage(),
    limits: { fileSize: 6 * 1024 * 1024 }
  };
}

export function tryRemoveLocalBannerFile(imageUrl: string | null | undefined): void {
  if (!imageUrl || !imageUrl.startsWith("/uploads/banners/")) return;
  const name = path.basename(imageUrl);
  if (!name || name === "." || name === "..") return;
  const root = path.resolve(bannerUploadRoot());
  const full = path.resolve(path.join(root, name));
  if (!full.startsWith(root + path.sep)) return;
  try {
    if (fs.existsSync(full)) fs.unlinkSync(full);
  } catch {
    /* ignore */
  }
}
