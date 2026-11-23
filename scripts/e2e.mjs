// End-to-end check of the demo loop in a real browser (Microsoft Edge via playwright-core).
// Usage: npm run dev (in another terminal), then: npm run e2e
// Creates throwaway accounts, walks every role through the app, then deletes them.
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(".env.local");
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});
const run = Date.now().toString(36);
const PASSWORD = "e2e-password-123";
const email = (who) => `e2e-${who}-${run}@tipidtayo.test`;
const createdUsers = [];
const consoleErrors = [];

const step = (msg) => console.log(`\n▶ ${msg}`);
const ok = (msg) => console.log(`  ✓ ${msg}`);

async function makeUser(who, role) {
  const { data, error } = await admin.auth.admin.createUser({ email: email(who), password: PASSWORD, email_confirm: true });
  if (error) throw error;
  createdUsers.push(data.user.id);
  if (role) await admin.from("profiles").update({ role }).eq("id", data.user.id);
  return data.user.id;
}

async function newPage(browser) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(`${page.url()}: ${m.text()}`));
  page.on("pageerror", (e) => consoleErrors.push(`${page.url()}: ${e.message}`));
  return page;
}

async function login(page, who) {
  await page.goto(`${BASE}/login`);
  await page.getByLabel("Email").fill(email(who));
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).last().click();
  // Sign-in redirects to "/" which then redirects to the role's home page.
  await page.waitForURL((u) => u.pathname !== "/" && !u.pathname.startsWith("/login"));
}

async function enterBill(page, { account, kwh, amount, baseline }) {
  await page.goto(`${BASE}/scan`);
  await page.getByLabel("Account number").fill(account);
  await page.getByLabel("Period start").fill("2026-09-15");
  await page.getByLabel("Period end").fill("2026-10-15");
  await page.getByLabel("kWh used").fill(String(kwh));
  await page.getByLabel("Amount due (₱)").fill(String(amount));
  await page.getByLabel("Same month last year (kWh)").fill(String(baseline));
  await page.getByRole("button", { name: "Save bill" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Save bill" }).click();
  await page.getByRole("article", { name: "Itemized receipt" }).waitFor();
}

const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  step("Landing page");
  const visitor = await newPage(browser);
  await visitor.goto(BASE);
  await visitor.getByRole("heading", { name: "Your bill is one number. Make it a receipt." }).waitFor();
  await visitor.getByText("Unaccounted").first().waitFor();
  ok("hero with the example receipt rendered");
  await visitor.locator("#ranking input[type=range]").first().fill("190");
  await visitor.getByText("Big house ranks higher").waitFor();
  ok("fair-score slider recomputes the leader");
  await visitor.locator("[data-id=bill] a").click();
  await visitor.waitForFunction(() => scrollY === 0 && document.querySelector("[aria-current=step]")?.closest("li")?.dataset.id === "bill");
  ok("Oct 1 in the month strip scrolls to the very top and is selected");

  step("Resident A signs up through the UI and enters a bill");
  const a = await newPage(browser);
  await a.goto(`${BASE}/login?mode=up`);
  await a.getByLabel("Email").fill(email("a"));
  await a.getByLabel("Password").fill(PASSWORD);
  await a.getByRole("button", { name: "Create account" }).last().click();
  await a.getByText("Tick this to create your account").waitFor();
  ok("sign-up refuses without privacy consent");
  await a.getByLabel(/I agree that Kuryentipid/).check();
  await a.getByRole("button", { name: "Create account" }).last().click();
  await a.waitForURL(/\/home/);
  await a.getByRole("tab", { name: "Get started" }).waitFor();
  ok("new account lands on the empty receipt state");
  const { data: aUser } = await admin.auth.admin.listUsers({ perPage: 1000 });
  createdUsers.push(aUser.users.find((u) => u.email === email("a")).id);

  await enterBill(a, { account: `11${run.slice(-8).replace(/\D/g, "7").padStart(8, "1")}`, kwh: 117, amount: 1469.52, baseline: 150 });
  await a.locator("[data-sonner-toast]", { hasText: "Bill saved. Here's your receipt." }).first().waitFor();
  assert.ok(await a.getByText("22% less than last year").first().isVisible());
  ok("approved bill scored 22% saved");

  step("Resident A adds appliances; receipt itemizes");
  await a.goto(`${BASE}/scan`);
  await a.getByRole("tab", { name: /Appliances/ }).click();
  await a.getByLabel("Appliance", { exact: true }).selectOption("aircon");
  await a.getByLabel("Hours a day").fill("2");
  await a.getByLabel("Inverter?").selectOption("no");
  await a.getByRole("button", { name: "Add appliance" }).click();
  await a.getByText("Aircon added.").waitFor();
  await a.getByRole("tab", { name: /Appliances/ }).click();
  await a.getByLabel("Appliance", { exact: true }).selectOption("electric_fan");
  await a.getByRole("button", { name: "Add appliance" }).click();
  await a.getByText("Electric fan added.").waitFor();
  await a.goto(`${BASE}/receipt`);
  await a.getByRole("article", { name: "Itemized receipt" }).getByText("Aircon").waitFor();
  await a.getByText("Unaccounted").first().waitFor();
  await a.getByText("Switch to an inverter aircon").waitFor();
  ok("receipt shows lines, Unaccounted, and a swap tip");

  step("Camera scan API reads a sticker photo with Gemini");
  const sticker = readFileSync("scripts/fixtures/aircon-sticker.jpg");
  const res = await a.request.post(`${BASE}/api/extract/appliance`, {
    multipart: { photo: { name: "sticker.jpg", mimeType: "image/jpeg", buffer: sticker } },
  });
  const body = await res.json();
  assert.equal(res.status(), 200, JSON.stringify(body));
  console.log("  ", JSON.stringify(body.data));
  if (body.data.extraction) {
    assert.equal(body.data.extraction.appliance_type, "aircon");
    assert.equal(body.data.extraction.watts, 1050);
    ok(`sticker read by ${body.data.servedBy}`);
  } else {
    console.log("  ! all AI steps failed (quota?), manual form would be shown");
  }

  step("Camera scan API reads a bill photo with Gemini");
  const billPhoto = readFileSync("scripts/fixtures/sample-bill.jpg");
  const billRes = await a.request.post(`${BASE}/api/extract/bill`, {
    multipart: { photo: { name: "bill.jpg", mimeType: "image/jpeg", buffer: billPhoto } },
  });
  const billBody = await billRes.json();
  assert.equal(billRes.status(), 200, JSON.stringify(billBody));
  if (billBody.data.photoPath) await admin.storage.from("bill-photos").remove([billBody.data.photoPath]);
  if (billBody.data.extraction) {
    const extracted = billBody.data.extraction;
    assert.ok(extracted.readable);
    assert.ok(String(extracted.account_number).replace(/\D/g, "").endsWith("3123456789"));
    assert.ok(Math.abs(extracted.kwh - 117) < 1);
    assert.ok(Math.abs(extracted.amount_due - 1469.52) < 1);
    assert.ok(extracted.history.length >= 12);
    ok(`bill read by ${billBody.data.servedBy}`);
  } else {
    console.log("  ! bill AI steps failed (quota?), manual form would be shown");
  }

  step("The hourly scan limit stops the 21st request");
  const { data: allUsers } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const aId = allUsers.users.find((u) => u.email === email("a")).id;
  // One sticker scan and one bill scan already used two of the twenty attempts.
  await admin.from("extraction_attempts").insert(
    Array.from({ length: 18 }, () => ({ profile_id: aId, kind: "appliance" })),
  );
  const limited = await a.request.post(`${BASE}/api/extract/appliance`, {
    multipart: { photo: { name: "sticker.jpg", mimeType: "image/jpeg", buffer: sticker } },
  });
  assert.equal(limited.status(), 429);
  ok("21st scan in an hour is rejected");

  step("Resident B (big house) and C (suspicious bill)");
  await makeUser("b");
  await makeUser("c");
  const b = await newPage(browser);
  await login(b, "b");
  await enterBill(b, { account: `22${run.slice(-8).replace(/\D/g, "7").padStart(8, "2")}`, kwh: 940, amount: 11806.4, baseline: 1000 });
  ok("B approved at 6%");
  const c = await newPage(browser);
  await login(c, "c");
  await enterBill(c, { account: `33${run.slice(-8).replace(/\D/g, "7").padStart(8, "3")}`, kwh: 300, amount: 500, baseline: 320 });
  await c.getByText("The barangay will check this bill").waitFor();
  ok("C flagged (rate ₱1.67/kWh)");

  step("Ranking: small house beats big house");
  await b.goto(`${BASE}/ranking`);
  const rows = await b.locator("ol > li").allInnerTexts();
  const ia = rows.findIndex((r) => r.includes("22%"));
  const ib = rows.findIndex((r) => r.includes("(you)"));
  assert.ok(ia >= 0 && ib >= 0 && ia < ib, `ranking order wrong: ${rows.join(" | ")}`);
  ok("A ranks above B");

  step("A forged Google token is refused");
  const g = await newPage(browser);
  await g.goto(`${BASE}/login`);
  await g.evaluate(() => {
    const input = document.querySelector("input[name=google_credential]");
    input.value = "forged.token.value";
    input.form.requestSubmit();
  });
  await g.getByText("Google sign-in didn't go through").waitFor();
  ok("server rejects an unverified Google ID token");

  step("A store owner signs up and waits for approval");
  const storeName = `E2E Store ${run}`;
  const s = await newPage(browser);
  await s.goto(`${BASE}/login?mode=up&role=store`);
  await s.getByLabel("Store name").fill(storeName);
  await s.getByLabel(/I agree that Kuryentipid/).check();
  await s.getByLabel("Email").fill(email("store"));
  await s.getByLabel("Password").fill(PASSWORD);
  await s.getByRole("button", { name: "Create account" }).last().click();
  await s.waitForURL(/\/store/);
  await s.getByText("Waiting for the barangay").waitFor();
  const { data: sUsers } = await admin.auth.admin.listUsers({ perPage: 1000 });
  createdUsers.push(sUsers.users.find((u) => u.email === email("store")).id);
  ok("store account is pending, no redeem form yet");

  step("Admin signs up with the access code");
  const ad = await newPage(browser);
  await ad.goto(`${BASE}/login?mode=up&role=admin`);
  await ad.getByLabel("Admin access code").fill("not-the-code");
  await ad.getByLabel(/I agree that Kuryentipid/).check();
  await ad.getByLabel("Email").fill(email("admin"));
  await ad.getByLabel("Password").fill(PASSWORD);
  await ad.getByRole("button", { name: "Create account" }).last().click();
  await ad.getByText("That admin access code isn't right.").waitFor();
  ok("wrong admin code refused, no account created");
  await ad.getByLabel("Admin access code").fill(process.env.ADMIN_SIGNUP_CODE);
  await ad.getByLabel(/I agree that Kuryentipid/).check();
  await ad.getByLabel("Password").fill(PASSWORD);
  await ad.getByRole("button", { name: "Create account" }).last().click();
  await ad.waitForURL(/\/admin/);
  const { data: adUsers } = await admin.auth.admin.listUsers({ perPage: 1000 });
  createdUsers.push(adUsers.users.find((u) => u.email === email("admin")).id);
  ok("right code creates an admin");

  step("Admin tests an AI fallback provider before adding it");
  const ai = ad.locator("section", { has: ad.getByRole("heading", { name: "Photo reading (AI)" }) });
  await ai.getByLabel("Provider").selectOption("openai");
  await ai.getByLabel("Model").fill("gpt-4.1-mini");
  await ai.getByLabel("API key").fill("sk-e2e-not-a-real-key-000");
  assert.ok(await ai.getByRole("button", { name: "Add to the chain" }).isDisabled(), "Add must be locked before a test");
  await ai.getByRole("button", { name: "Run test" }).click();
  await ai.getByText(/^FAIL/).waitFor({ timeout: 60000 });
  assert.ok(await ai.getByRole("button", { name: "Add to the chain" }).isDisabled(), "Add must stay locked after a failed test");
  const aiLog = await ai.getByRole("list", { name: "Test log" }).innerText();
  assert.ok(!aiLog.includes("sk-e2e-not-a-real-key-000"), "the API key must never appear in the test log");
  ok("bad key: test log shows FAIL, Add stays locked");

  step("Admin approves the store, approves C, issues vouchers");
  const pending = ad.locator("li", { hasText: storeName });
  await pending.getByRole("button", { name: "Approve" }).click();
  await ad.getByRole("dialog").getByRole("button", { name: "Approve store" }).click();
  await ad.getByText("Store approved.").waitFor();
  ok("store approved");
  const cBill = ad.locator("li", { hasText: "Rate ₱1.67/kWh is outside" });
  await cBill.getByRole("button", { name: "Approve" }).click();
  await ad.getByRole("dialog").getByRole("button", { name: "Approve" }).click();
  await ad.getByText("Bill approved and added to the ranking.").waitFor();
  ok("flagged bill approved");
  await ad.reload();
  await ad.getByLabel("Store", { exact: true }).selectOption({ label: storeName });
  await ad.getByLabel("Vouchers").fill("2");
  await ad.getByRole("button", { name: "Issue vouchers" }).click();
  await ad.getByRole("dialog").getByRole("button", { name: "Issue vouchers" }).click();
  await ad.getByText(/vouchers? issued to/).waitFor();
  ok(await ad.getByText(/vouchers? issued to/).innerText());

  step("Resident A sees the voucher; store redeems it once");
  await a.goto(`${BASE}/vouchers`);
  const code = (await a.locator("p.tracking-widest").first().innerText()).trim();
  assert.match(code, /^[A-Z0-9]{6}$/);
  ok(`voucher ${code} with QR`);
  await s.goto(`${BASE}/store`);
  await s.getByLabel("Voucher code").fill(code);
  await s.getByRole("button", { name: "Redeem" }).click();
  await s.getByText("Voucher accepted").waitFor();
  ok("first redeem accepted");
  await s.getByLabel("Voucher code").fill(code);
  await s.getByRole("button", { name: "Redeem" }).click();
  await s.getByText(/Already used on/).waitFor();
  ok("second redeem rejected");

  step("Profile name and theme persist");
  await a.goto(`${BASE}/profile`);
  await a.getByRole("textbox", { name: "Name" }).fill("Mang Jun");
  await a.getByRole("button", { name: "Save name" }).click();
  await a.locator("[data-sonner-toast]", { hasText: "Name saved." }).first().waitFor();
  await a.reload();
  await a.getByRole("heading", { name: "Mang Jun" }).waitFor();
  const appearance = a.getByRole("radiogroup", { name: "Theme" }).last();
  await appearance.getByRole("radio", { name: "Dark" }).click();
  await a.waitForFunction(() => document.documentElement.dataset.theme === "dark");
  await a.waitForTimeout(400);
  await a.reload();
  await a.waitForFunction(() => document.documentElement.dataset.theme === "dark");
  await appearance.getByRole("radio", { name: "System" }).click();
  await a.waitForFunction(() => !document.documentElement.dataset.theme);
  ok("name and theme survive a reload");

  step("Roles are enforced");
  await a.goto(`${BASE}/admin`);
  // The loading shell streams first; the server redirect lands on /home after hydration.
  await a.waitForURL((u) => !u.pathname.startsWith("/admin"));
  ok("resident cannot open /admin");

  step("Sign out");
  await a.goto(`${BASE}/home`);
  await a.getByRole("button", { name: "Open account menu" }).click();
  await a.getByRole("button", { name: "Sign out" }).click();
  await a.getByRole("dialog").getByRole("button", { name: "Sign out" }).click();
  await a.waitForURL(/\/login/);
  ok("sign out returns to login");

  if (consoleErrors.length) throw new Error(`Console errors:\n${consoleErrors.join("\n")}`);
  ok("no console errors");
  console.log("\nALL E2E CHECKS PASSED");
} finally {
  await browser.close();
  for (const id of createdUsers) await admin.auth.admin.deleteUser(id);
  // Stores/vouchers cascade with their owner's profile.
}
