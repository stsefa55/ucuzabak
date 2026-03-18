import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix("api/v1");

  const isProd = process.env.NODE_ENV === "production";
  const fallbackWebOrigin = isProd ? "https://ucuzabak.com" : "http://localhost:3000";
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

  const port = process.env.PORT || 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API listening on port ${port}`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Failed to bootstrap API", err);
  process.exit(1);
});

