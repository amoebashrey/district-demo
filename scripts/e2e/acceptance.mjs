/**
 * Browser acceptance for docs/PLANS_FLOW_SPEC.md §"Build acceptance".
 *   BASE_URL=http://localhost:3000 node scripts/e2e/acceptance.mjs
 * Uses Playwright from PW_DIR (defaults to the session scratchpad install).
 */
import { createRequire } from "node:module";
const PW_DIR = process.env.PW_DIR ?? "/private/tmp/claude-503/-Users-personal/263cdb74-72f8-4d8a-a61d-f25574c578ff/scratchpad/pw";
process.env.PLAYWRIGHT_BROWSERS_PATH ??= "/private/tmp/claude-503/-Users-personal/263cdb74-72f8-4d8a-a61d-f25574c578ff/scratchpad/pw-browsers";
const { chromium } = createRequire(PW_DIR + "/package.json")("playwright");
const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const results = []; let step = ""; const at = (s) => { step = s; }; const shot = async (page, n) => { try { await page.screenshot({ path: `${process.env.SHOT_DIR ?? "/tmp"}/fail-${n}.png` }); } catch {} };
const pass = (n, msg) => results.push([n, true, msg]); const fail = (n, msg) => results.push([n, false, msg]);
const browser = await chromium.launch();

async function fresh() { const ctx = await browser.newContext({ viewport: { width: 420, height: 900 }, permissions: ["clipboard-read", "clipboard-write"] }); const page = await ctx.newPage(); page.setDefaultTimeout(20_000); return { ctx, page }; }
async function settle(page) { await page.waitForLoadState("networkidle"); await page.waitForTimeout(700); }
async function pickUser(page) { await page.goto(`${BASE}/switch`); await settle(page); await page.getByRole("tab", { name: "Bengaluru" }).click().catch(() => {}); await page.locator("li button").first().click(); await page.waitForURL(`${BASE}/`); await settle(page); }
async function addNames(page, names) { await settle(page); for (const n of names) { await page.getByPlaceholder("e.g. Rohan").fill(n); await page.getByRole("button", { name: /^Add$/ }).click(); await page.getByText(`Added ${n}`).waitFor(); } }
async function waitState(page, re, ms = 60_000) { await page.getByText(re).first().waitFor({ timeout: ms }); }
async function driveToConfirmed(page, n) {
  // status page: fills live → locks → shares settle → You're out
  await page.waitForURL(/\/plans\/[^/]+$/);
  await waitState(page, /It's filling up|Locked|Your plan/);
  await page.waitForURL(/\/plans\/[^/]+\/confirmed$/, { timeout: 90_000 });
  await waitState(page, /You're out/);
  await page.getByText(/Bill split via Splitpay/).waitFor();
  await page.getByRole("link", { name: "Done" }).click();
  await page.waitForURL(/\/plans\/[^/]+$/);
  await waitState(page, /Booked/);
  pass(n, `${page.url()}`);
}

// 1 — Suggestion → Yes, plan it → crew → Send invite → fills → locks → You're out → Done
let P1; try { P1 = await fresh(); const { page, ctx } = P1; at("pick user"); await pickUser(page); at("Let's go"); await page.getByRole("link", { name: /Let's go/ }).click(); await page.waitForURL(`${BASE}/plans/starter`); await settle(page);
  at("Yes, plan it"); await page.getByRole("button", { name: "Yes, plan it" }).click(); await page.waitForURL(/\/plans\/[^/]+\/crew$/); at("add names"); await addNames(page, ["Rohan", "Priya", "Kabir"]);
  at("Send invite"); await page.getByRole("button", { name: "Send invite" }).click(); at("drive"); await driveToConfirmed(page, 1); await ctx.close(); } catch (e) { await shot(P1?.page, 1); fail(1, `[${step}] ` + String(e).split("\n")[0]); }

// 2 — Suggestion → Let the crew vote → crew → options + tally → locks → confirmed
let P2; try { P2 = await fresh(); const { page, ctx } = P2; at("pick"); await pickUser(page); await page.goto(`${BASE}/plans/starter`); await settle(page); at("vote btn"); await page.getByRole("button", { name: "Let the crew vote instead" }).click(); await page.waitForURL(/\/plans\/[^/]+\/crew$/);
  await addNames(page, ["Rohan", "Priya", "Kabir"]); await page.getByRole("button", { name: "Send invite" }).click(); await page.waitForURL(/\/plans\/[^/]+$/);
  await waitState(page, /Pick a night/); await settle(page); await page.getByRole("button", { name: "I'm in" }).first().click(); await page.getByText(/1\/\d/).first().waitFor();
  at("drive"); await driveToConfirmed(page, 2); await ctx.close(); } catch (e) { await shot(P2?.page, 2); fail(2, `[${step}] ` + String(e).split("\n")[0]); }

// 3 — New plan (form) → Create plan → crew → … → confirmed
try { const { page, ctx } = await fresh(); await pickUser(page); await page.goto(`${BASE}/plans/new`); await settle(page); await page.getByRole("button", { name: "Create plan" }).click(); await page.waitForURL(/\/plans\/[^/]+\/crew$/);
  await addNames(page, ["Rohan", "Priya", "Kabir"]); await page.getByRole("button", { name: "Send invite" }).click(); await page.waitForURL(/\/plans\/[^/]+$/); await waitState(page, /Pick a night/);
  await page.getByRole("button", { name: "I'm in" }).first().click(); await driveToConfirmed(page, 3); await ctx.close(); } catch (e) { fail(3, String(e).split("\n")[0]); }

// 4 — "Go together" on an item → crew → … → confirmed
try { const { page, ctx } = await fresh(); await pickUser(page); await page.goto(`${BASE}/movies`); await settle(page); await page.locator('a[href^="/movies/"][href*="?plan=1"]').first().click(); await page.waitForURL(/\/movies\/[^/]+\?plan=1/);
  await settle(page); await page.getByRole("link", { name: /Go together/ }).click(); await page.waitForURL(/showtimes\?plan=1/); await settle(page); await page.locator("section button:not([disabled])").first().click(); await page.waitForURL(/\/plans\/[^/]+\/crew$/);
  await addNames(page, ["Rohan", "Priya"]); await page.getByRole("button", { name: "Send invite" }).click(); await driveToConfirmed(page, 4); await ctx.close(); } catch (e) { fail(4, String(e).split("\n")[0]); }

// 5 — Invitee opens the share link → sees the plan → I'm in → pays share → joined
try { const org = await fresh(); await pickUser(org.page); await org.page.goto(`${BASE}/plans/starter`); await settle(org.page); await org.page.getByRole("button", { name: "Yes, plan it" }).click(); await org.page.waitForURL(/\/plans\/[^/]+\/crew$/);
  await addNames(org.page, ["Rohan", "Priya"]); await org.page.getByRole("button", { name: "Copy link" }).click(); const link = await org.page.evaluate(() => navigator.clipboard.readText());
  if (!/\/join\/.+#s=/.test(link)) throw new Error(`share link lacks snapshot: ${link.slice(0, 80)}`);
  const inv = await fresh(); await inv.page.goto(link); await settle(inv.page); await inv.page.getByText(/is planning/).waitFor(); await inv.page.getByText(/won't be charged until it's locked/).waitFor();
  await inv.page.getByPlaceholder("Your name").fill("Guest Zoya"); await inv.page.getByRole("button", { name: "I'm in" }).click(); await settle(inv.page); await inv.page.getByText(/You're in/).first().waitFor();
  await inv.page.getByRole("button", { name: /Pay your share/ }).waitFor({ timeout: 60_000 }); await inv.page.getByRole("button", { name: /Pay your share/ }).click(); await inv.page.getByText(/Paid ₹/).waitFor();
  pass(5, inv.page.url().split("#")[0]); await inv.ctx.close(); await org.ctx.close(); } catch (e) { fail(5, String(e).split("\n")[0]); }

// 6 — routes: unknown ids show friendly recovery (no redirect home); every button/link on plan pages routes somewhere
try { const { page, ctx } = await fresh(); await pickUser(page);
  await page.goto(`${BASE}/plans/does-not-exist`); await page.getByText(/isn't available — start a new one/).waitFor(); if (new URL(page.url()).pathname === "/") throw new Error("redirected home");
  await page.goto(`${BASE}/join/nope-nope`); await page.getByText(/couldn't find that plan/).waitFor(); if (new URL(page.url()).pathname === "/") throw new Error("redirected home");
  await page.goto(`${BASE}/plans/nope/crew`); await page.getByText(/isn't available/).first().waitFor(); await page.goto(`${BASE}/plans/nope/confirmed`); await page.getByText(/isn't available/).first().waitFor();
  await page.goto(`${BASE}/no-such-page`); await page.getByText(/That page isn't here/).waitFor();
  const dead = []; for (const url of [`${BASE}/plans/demo-plan`, `${BASE}/plans/demo-plan/crew`, `${BASE}/join/demo`, `${BASE}/plans`, `${BASE}/plans/starter`, `${BASE}/plans/new`]) { await page.goto(url); await page.waitForLoadState("networkidle"); const bad = await page.$$eval("a", (as) => as.filter((a) => !a.getAttribute("href") || a.getAttribute("href") === "#").length); if (bad) dead.push(`${url}: ${bad} dead links`); }
  if (dead.length) throw new Error(dead.join("; ")); pass(6, "unknown ids → friendly screens; no dead links"); await ctx.close(); } catch (e) { fail(6, String(e).split("\n")[0]); }

await browser.close();
for (const [n, ok, msg] of results.sort((a, b) => a[0] - b[0])) console.log(`${ok ? "PASS" : "FAIL"}  path ${n}  ${msg}`);
process.exit(results.every((r) => r[1]) ? 0 : 1);
