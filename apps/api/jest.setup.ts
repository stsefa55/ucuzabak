import path from "path";
import dotenv from "dotenv";

// Proje kökündeki .env (c:\...\ucuzabakcom\.env)
dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });

// apps/api klasöründeki .env (isteğe bağlı, varsa okunur)
dotenv.config();

// Üretimde zorunlu sır; testlerde .env yoksa yalnızca jest ortamı için varsayılan (canlıda kullanılmaz).
if (!process.env.API_JWT_SECRET?.trim()) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("API_JWT_SECRET is required (even for e2e when NODE_ENV=production).");
  }
  process.env.API_JWT_SECRET = "jest-test-only-jwt-secret-not-for-production-xx";
}

