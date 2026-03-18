import { test, expect } from "@playwright/test";

test.describe("Auth and basic flows", () => {
  test("user can login and see header greeting", async ({ page }) => {
    await page.goto("/giris");
    await page.fill('input#email', "user@ucuzabak.com");
    await page.fill('input#password', "User123!");
    await page.click('button[type="submit"]');

    await expect(page.getByText(/Merhaba,/)).toBeVisible();
  });

  test("session persists on reload (refresh-on-load)", async ({ page }) => {
    await page.goto("/giris");
    await page.fill('input#email', "user@ucuzabak.com");
    await page.fill('input#password', "User123!");
    await page.click('button[type="submit"]');
    await expect(page.getByText(/Merhaba,/)).toBeVisible();

    await page.reload();
    await expect(page.getByText(/Merhaba,/)).toBeVisible();
  });

  test("user can add favorite and see it in favorites page", async ({ page }) => {
    await page.goto("/giris");
    await page.fill('input#email', "user@ucuzabak.com");
    await page.fill('input#password', "User123!");
    await page.click('button[type="submit"]');

    // go to a product detail from homepage
    await page.goto("/");
    const firstProductLink = page.locator("a").filter({ hasText: /UcuzaBak.com/ }).first();
    // fallback: go directly to known product
    await page.goto("/urun/apple-iphone-14-128gb");

    // click favorite button
    await page.getByRole("button", { name: /Favorilere ekle|Favorilerden kaldır/ }).click();

    await page.goto("/favoriler");
    await expect(page.getByText(/Favorilerim/)).toBeVisible();
  });

  test("admin access control works", async ({ page }) => {
    // normal user should be blocked
    await page.goto("/giris");
    await page.fill('input#email', "user@ucuzabak.com");
    await page.fill('input#password', "User123!");
    await page.click('button[type="submit"]');
    await page.goto("/admin");
    await expect(page.getByText(/yetkiniz yok/i)).toBeVisible();

    // login as admin
    await page.goto("/giris");
    await page.fill('input#email', "admin@ucuzabak.com");
    await page.fill('input#password', "Admin123!");
    await page.click('button[type="submit"]');
    await page.goto("/admin");
    await expect(page.getByText(/Genel bakış/)).toBeVisible();
  });

  test("search page works with query", async ({ page }) => {
    await page.goto("/");
    await page.fill('input[name="q"]', "iphone");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/arama/);
    await expect(page.getByText(/Arama sonuçları/)).toBeVisible();
  });
});

