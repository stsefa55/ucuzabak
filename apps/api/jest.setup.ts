import path from "path";
import dotenv from "dotenv";

// Proje kökündeki .env (c:\...\ucuzabakcom\.env)
dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });

// apps/api klasöründeki .env (isteğe bağlı, varsa okunur)
dotenv.config();

