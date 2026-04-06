import "./bootstrap-env";
import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import { bannerUploadRoot } from "./admin/banner-upload";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix("api/v1");

  const bodyLimit = process.env.JSON_BODY_LIMIT_MAX?.trim() || "32mb";
  app.useBodyParser("json", { limit: bodyLimit });
  app.useBodyParser("urlencoded", { limit: bodyLimit, extended: true });

  const isProd = process.env.NODE_ENV === "production";
  /** Localde tarayıcıyı 127.0.0.1 ile açanlar için CORS (localhost ile aynı değil). */
  const fallbackWebOrigin = isProd
    ? "https://www.ucuzabak.com"
    : "http://localhost:3000,http://127.0.0.1:3000";
  const corsOriginsRaw = (process.env.WEB_ORIGIN || process.env.CORS_ORIGIN || fallbackWebOrigin).trim();
  const corsOrigins = corsOriginsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins.length <= 1 ? corsOrigins[0] : corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"]
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: true
    }),
  );

  app.use(cookieParser());

  const bannerDir = bannerUploadRoot();
  app.useStaticAssets(bannerDir, { prefix: "/uploads/banners/" });

  if (!isProd) {
    const config = new DocumentBuilder()
      .setTitle("UcuzaBak.com API")
      .setDescription(
        "UcuzaBak.com fiyat karşılaştırma platformu için API dokümantasyonu (Phase 2 - core domain).",
      )
      .setVersion("0.2.0")
      .addBearerAuth(
        {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        },
        "access-token",
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/v1/docs", app, document);
  }

  const port = Number(process.env.PORT) || 4000;
  /** LAN’dan (Expo / telefon) erişim için; yalnızca 127.0.0.1 dinlenirse mobil cihaz bağlanamaz */
  const listenHost = process.env.LISTEN_HOST?.trim() || "0.0.0.0";
  await app.listen(port, listenHost);
  // eslint-disable-next-line no-console
  console.log(`API listening on http://${listenHost}:${port}`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Failed to bootstrap API", err);
  process.exit(1);
});

