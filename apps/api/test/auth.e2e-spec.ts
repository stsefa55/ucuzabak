import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AppModule } from "../src/app.module";
import request from "supertest";

describe("Auth flow (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

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
    expect(registerRes.body.accessToken).toBeDefined();
    const cookies = registerRes.get("set-cookie");
    expect(cookies.join("")).toContain("refresh_token");

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
    expect(loginCookies.join("")).toContain("refresh_token");

    const refreshCookie = loginCookies.find((c) => c.startsWith("refresh_token"))!;

    // refresh
    const refreshRes = await request(server)
      .post("/api/v1/auth/refresh")
      .set("Cookie", refreshCookie)
      .expect(200);

    expect(refreshRes.body).toHaveProperty("accessToken");

    // logout
    await request(server)
      .post("/api/v1/auth/logout")
      .set("Cookie", refreshCookie)
      .expect(200);

    // refresh after logout should return null accessToken
    const refreshAfterLogoutRes = await request(server)
      .post("/api/v1/auth/refresh")
      .set("Cookie", refreshCookie)
      .expect(200);

    expect(refreshAfterLogoutRes.body.accessToken).toBeNull();
  });
});

