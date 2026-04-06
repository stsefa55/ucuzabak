import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AppModule } from "../src/app.module";
import { EmailQueueService } from "../src/email/email-queue.service";
import request from "supertest";

describe("Auth flow (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    })
      .overrideProvider(EmailQueueService)
      .useValue({
        safeEnqueueWelcome: () => undefined,
        safeEnqueueVerifyEmail: () => undefined,
        enqueueWelcome: async () => undefined,
        enqueueResetPassword: async () => undefined,
        enqueueVerifyEmail: async () => undefined,
        enqueuePriceAlert: async () => undefined,
        enqueueTestEmail: async () => undefined,
        onModuleDestroy: async () => undefined
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("registers, logs in, refreshes and logs out successfully", async () => {
    const server = app.getHttpServer();
    const uniqueEmail = `test_${Date.now()}@example.com`;

    // register
    const registerRes = await request(server)
      .post("/api/v1/auth/register")
      .send({
        email: uniqueEmail,
        name: "Test User",
        password: "Test123!"
      })
      .expect(201);

    expect(registerRes.body.user).toBeDefined();
    expect(registerRes.body.user.emailVerified).toBe(false);
    expect(registerRes.body.accessToken).toBeDefined();
    const cookies = registerRes.get("set-cookie");
    const cookieHeader = Array.isArray(cookies) ? cookies.join("") : String(cookies ?? "");
    expect(cookieHeader).toContain("refresh_token");

    // login
    const loginRes = await request(server)
      .post("/api/v1/auth/login")
      .send({
        email: uniqueEmail,
        password: "Test123!"
      })
      .expect(200);

    expect(loginRes.body.user).toBeDefined();
    expect(loginRes.body.accessToken).toBeDefined();
    const loginCookies = loginRes.get("set-cookie");
    const loginCookieArr = Array.isArray(loginCookies) ? loginCookies : loginCookies ? [loginCookies] : [];
    expect(loginCookieArr.join("")).toContain("refresh_token");

    const refreshCookie = loginCookieArr.find((c: string) => c.startsWith("refresh_token"));
    expect(refreshCookie).toBeDefined();
    const refreshCookieHeader = refreshCookie as string;

    // refresh
    const refreshRes = await request(server)
      .post("/api/v1/auth/refresh")
      .set("Cookie", refreshCookieHeader)
      .expect(200);

    expect(refreshRes.body).toHaveProperty("accessToken");

    // logout
    await request(server)
      .post("/api/v1/auth/logout")
      .set("Cookie", refreshCookieHeader)
      .expect(200);

    // refresh after logout should return null accessToken
    const refreshAfterLogoutRes = await request(server)
      .post("/api/v1/auth/refresh")
      .set("Cookie", refreshCookieHeader)
      .expect(200);

    expect(refreshAfterLogoutRes.body.accessToken).toBeNull();
  });
});

