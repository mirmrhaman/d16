import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

// Synthetic configuration only; no real environment file or database is read.
Object.assign(process.env, {
  API_ENV_FILE: "/dev/null", NODE_ENV: "qa", DB_HOST: "127.0.0.1", DB_PORT: "65531",
  DB_NAME: "dinterio_d16_qa", DB_USER: "offline_test", DB_PASSWORD: "synthetic-test-only",
  APP_ENCRYPTION_KEY_BASE64: Buffer.alloc(32, 71).toString("base64"),
  APP_HMAC_KEY_BASE64: Buffer.alloc(32, 82).toString("base64"),
});
const { createContentRepository, cleanPublicPayload, ABOUT_PAGE_ID, DASHBOARD_LAYOUT_ID, WEBSITE_ICONS_ID, WEBSITE_ICON_NAMES } = await import("../server/src/contentService.js");
const { decryptText, lookupHash } = await import("../server/src/security.js");
const { buildPoolOptions, pool } = await import("../server/src/db.js");
const { shouldUseLocalFallback } = await import("../server/src/dbFallback.js");
const { LIVE_SERVICES, LIVE_CONCEPTS } = await import("../src/data/liveContent.js");
const { DEFAULT_ABOUT, ABOUT_PAGE_ID: CLIENT_ABOUT_PAGE_ID } = await import("../src/data/aboutContent.js");
const { DEFAULT_DASHBOARD_LAYOUT, DEFAULT_WEBSITE_ICONS, DASHBOARD_LAYOUT_ID: CLIENT_DASHBOARD_LAYOUT_ID, WEBSITE_ICONS_ID: CLIENT_WEBSITE_ICONS_ID, ICON_NAMES } = await import("../src/data/siteAppearance.js");
test.after(() => pool.end());
const actor = { userId: "90000000-0000-4000-8000-000000000001", ipAddress: "127.0.0.1", userAgent: "synthetic-test" };

function recorder({ failAudit = false } = {}) {
  const calls = []; let committed = false; let rolledBack = false; let row;
  const connection = {
    async beginTransaction() {}, async commit() { committed = true; },
    async rollback() { rolledBack = true; }, release() {},
    async execute(sql, args = []) {
      calls.push({ sql, args });
      if (sql.startsWith("INSERT INTO app_content")) {
        if (row?.entity_type === args[0] && row?.id === args[1]) throw Object.assign(new Error("Duplicate row"), { code: "ER_DUP_ENTRY" });
        row = { entity_type: args[0], id: args[1], payload: args[2], version: 1, created_at: "2026-09-07 12:00:00", updated_at: "2026-09-07 12:00:00" };
      }
      if (sql.startsWith("UPDATE app_content SET payload") && row) row = { ...row, payload: args[0], version: row.version + 1 };
      if (sql.startsWith("SELECT * FROM app_content")) return [[row].filter((item) => item && item.entity_type === args[0] && (!args[1] || item.id === args[1]))];
      if (sql.startsWith("INSERT INTO audit_logs") && failAudit) throw new Error("simulated audit failure");
      return [{ affectedRows: 1 }];
    },
  };
  return { calls, get committed() { return committed; }, get rolledBack() { return rolledBack; }, execute: connection.execute, async getConnection() { return connection; } };
}

test("dashboard and icon validation matches picker defaults and rejects unknown or duplicate cards", () => {
  assert.equal(DASHBOARD_LAYOUT_ID, CLIENT_DASHBOARD_LAYOUT_ID); assert.equal(WEBSITE_ICONS_ID, CLIENT_WEBSITE_ICONS_ID);
  assert.deepEqual(WEBSITE_ICON_NAMES, ICON_NAMES);
  assert.deepEqual(cleanPublicPayload("DashboardLayout", DEFAULT_DASHBOARD_LAYOUT), DEFAULT_DASHBOARD_LAYOUT);
  assert.deepEqual(cleanPublicPayload("WebsiteIcons", DEFAULT_WEBSITE_ICONS), DEFAULT_WEBSITE_ICONS);
  const validateOrder = (card_order) => cleanPublicPayload("DashboardLayout", { ...DEFAULT_DASHBOARD_LAYOUT, card_order });
  assert.deepEqual(validateOrder(["AdminIcons", "AdminAbout"]).card_order, ["AdminIcons", "AdminAbout"]);
  for (const card_order of [null, "AdminAbout", ["AdminUnknown"], [1], [{}]]) assert.throws(() => validateOrder(card_order), /known dashboard card names/);
  assert.throws(() => validateOrder(["AdminAbout", "AdminAbout"]), /duplicate cards/);
});

test("website icons accept only supported names, public slot keys and safe image URLs", () => {
  const validate = (icons) => cleanPublicPayload("WebsiteIcons", { ...DEFAULT_WEBSITE_ICONS, icons });
  for (const icon_name of ICON_NAMES) assert.equal(validate({ "values.budget": { icon_name, icon_url: "" } }).icons["values.budget"].icon_name, icon_name);
  assert.deepEqual(validate({ "about.mission": { icon_name: "", icon_url: "" } }).icons["about.mission"], { icon_name: "", icon_url: "" });
  assert.equal(validate({ "dashboard.AdminIcons": { icon_name: "Image", icon_url: "/uploads/site/icon-1.webp" } }).icons["dashboard.AdminIcons"].icon_url, "/uploads/site/icon-1.webp");
  for (const icon_name of ["PiggyBank", "Pig", "UntrustedComponent", "constructor", {}, null]) assert.throws(() => validate({ "values.budget": { icon_name, icon_url: "" } }), /supported website icon/);
  for (const key of ["unknown.slot", "about.", "stats.bad key", "about." + "x".repeat(115)]) assert.throws(() => validate({ [key]: { icon_name: "Star", icon_url: "" } }), /slot key/);
  for (const icon_url of ["javascript:alert(1)", "data:image/png;base64,AA==", "//example.test/x.png", "/uploads/../secret.png", "https://user:password@example.test/icon.png", "https://example.test/a b.png"]) assert.throws(() => validate({ "values.budget": { icon_name: "Image", icon_url } }), /valid http\/https/);
  assert.throws(() => validate({ "about.mission": { icon_name: "Star" } }), /URL must be text/);
  assert.throws(() => validate({ "about.mission": { icon_name: "Star", icon_url: "", email: "private@example.test" } }), /only icon_name and icon_url/);
  const many = Object.fromEntries(Array.from({ length: 120 }, (_, index) => [`stats.item-${index}`, { icon_name: "Star", icon_url: "" }]));
  assert.equal(Object.keys(validate(many).icons).length, 120);
  assert.throws(() => validate({ ...many, "stats.extra": { icon_name: "Star", icon_url: "" } }), /at most 120/);
  assert.throws(() => validate([]), /must be an object/);
});

test("appearance settings are singleton records with mandatory versions and accurate transactional audits", async () => {
  for (const [entity, defaults, id, field, value] of [
    ["DashboardLayout", DEFAULT_DASHBOARD_LAYOUT, DASHBOARD_LAYOUT_ID, "card_order", ["AdminIcons", "AdminAbout"]],
    ["WebsiteIcons", DEFAULT_WEBSITE_ICONS, WEBSITE_ICONS_ID, "icons", { "values.budget": { icon_name: "Wallet", icon_url: "" }, "about.mission": { icon_name: "Heart", icon_url: "" } }],
  ]) {
    const database = recorder(); const repository = createContentRepository({ database });
    const created = await repository.createContent(entity, defaults, actor);
    assert.equal(created.id, id);
    await assert.rejects(repository.createContent(entity, defaults, actor), (error) => error.status === 409);
    await assert.rejects(repository.deleteContent(entity, id, actor), (error) => error.status === 405);
    for (const version of [undefined, null, 0, "1", 1.1, {}]) await assert.rejects(repository.updateContent(entity, id, { ...defaults, version }, actor), (error) => error.status === 400);
    const saved = await repository.updateContent(entity, id, { ...created, [field]: value }, actor);
    assert.equal(saved.version, 2); assert.deepEqual(saved[field], value);
    assert.deepEqual((await repository.listContent(entity))[0], saved);
    await assert.rejects(repository.updateContent(entity, id, { ...created, title: "Stale title" }, actor), (error) => error.status === 409);
    let events = database.calls.filter((call) => call.sql.startsWith("INSERT INTO audit_logs"));
    assert.deepEqual(JSON.parse(events[1].args[5]).changed_fields, [field]);
    assert.equal(events[1].args[1], actor.userId); assert.match(events[1].sql, /UTC_TIMESTAMP/);
    const sameValue = entity === "WebsiteIcons" ? Object.fromEntries(Object.entries(value).reverse()) : [...value];
    const unchanged = await repository.updateContent(entity, id, { ...saved, [field]: sameValue }, actor);
    events = database.calls.filter((call) => call.sql.startsWith("INSERT INTO audit_logs"));
    assert.deepEqual(JSON.parse(events[2].args[5]).changed_fields, []);
    const reset = await repository.updateContent(entity, id, { ...unchanged, [field]: defaults[field] }, actor);
    assert.deepEqual(reset[field], defaults[field]);
    const failingDatabase = recorder({ failAudit: true });
    await assert.rejects(createContentRepository({ database: failingDatabase }).createContent(entity, defaults, actor), /audit failure/);
    assert.equal(failingDatabase.rolledBack, true); assert.equal(failingDatabase.committed, false);
  }
});

test("About page preserves ordered public profiles, edits and removals with dated audit history", async () => {
  assert.equal(ABOUT_PAGE_ID, CLIENT_ABOUT_PAGE_ID);
  assert.deepEqual(cleanPublicPayload("AboutPage", DEFAULT_ABOUT), DEFAULT_ABOUT);
  const database = recorder(); const repository = createContentRepository({ database });
  const created = await repository.createContent("AboutPage", DEFAULT_ABOUT, actor);
  assert.equal(created.id, ABOUT_PAGE_ID);
  assert.deepEqual(created.team_members, DEFAULT_ABOUT.team_members);
  assert.deepEqual(created.approach_steps, DEFAULT_ABOUT.approach_steps);
  const team = [...created.team_members].reverse(); team[0] = { ...team[0], name: "Approved public profile", image: "/uploads/team-1.webp" };
  const saved = await repository.updateContent("AboutPage", created.id, { version: created.version, mission_text: "A new public mission", vision_text: "A new public vision", team_members: team }, actor);
  assert.equal(saved.version, 2);
  assert.equal(saved.mission_text, "A new public mission"); assert.equal(saved.vision_text, "A new public vision");
  assert.deepEqual(saved.team_members, team); assert.deepEqual(saved.approach_steps, created.approach_steps);
  assert.deepEqual((await repository.listContent("AboutPage"))[0], saved);
  await assert.rejects(repository.updateContent("AboutPage", created.id, { version: 1, title: "Stale overwrite" }, actor), (error) => error.status === 409);
  const empty = await repository.updateContent("AboutPage", saved.id, { version: saved.version, team_members: [], approach_steps: [] }, actor);
  assert.deepEqual(empty.team_members, []); assert.deepEqual(empty.approach_steps, []);
  const events = database.calls.filter((call) => call.sql.startsWith("INSERT INTO audit_logs"));
  assert.equal(events.length, 3); assert.equal(events[1].args[1], actor.userId);
  assert.match(events[1].sql, /UTC_TIMESTAMP/); assert.equal(events[1].args[3], "AboutPage");
  assert.deepEqual(JSON.parse(events[1].args[5]).changed_fields, ["mission_text", "team_members", "vision_text"]);
  assert.ok(!JSON.stringify(events).includes("Approved public profile"));
});

test("About page uses one fixed identity, cannot be deleted, and rejects duplicate creates", async () => {
  const repository = createContentRepository({ database: recorder() });
  await repository.createContent("AboutPage", DEFAULT_ABOUT, actor);
  await assert.rejects(repository.createContent("AboutPage", DEFAULT_ABOUT, actor), (error) => error.status === 409);
  await assert.rejects(repository.deleteContent("AboutPage", ABOUT_PAGE_ID, actor), (error) => error.status === 405);
  await assert.rejects(repository.updateContent("AboutPage", ABOUT_PAGE_ID, DEFAULT_ABOUT), (error) => error.status === 401);
});

test("About full-form saves audit only genuinely changed fields, including ordered arrays", async () => {
  const database = recorder(); const repository = createContentRepository({ database });
  const created = await repository.createContent("AboutPage", DEFAULT_ABOUT, actor);
  const saved = await repository.updateContent("AboutPage", created.id, { ...created, mission_text: "Only the public mission changed" }, actor);
  let events = database.calls.filter((call) => call.sql.startsWith("INSERT INTO audit_logs"));
  assert.deepEqual(JSON.parse(events[1].args[5]).changed_fields, ["mission_text"]);
  const reordered = await repository.updateContent("AboutPage", saved.id, { ...saved, team_members: [...saved.team_members].reverse() }, actor);
  events = database.calls.filter((call) => call.sql.startsWith("INSERT INTO audit_logs"));
  assert.deepEqual(JSON.parse(events[2].args[5]).changed_fields, ["team_members"]);
  await repository.updateContent("AboutPage", reordered.id, { ...reordered }, actor);
  events = database.calls.filter((call) => call.sql.startsWith("INSERT INTO audit_logs"));
  assert.deepEqual(JSON.parse(events[3].args[5]).changed_fields, []);
});

test("About validation rejects private fields, malformed profiles and unsafe images", () => {
  const validate = (payload) => cleanPublicPayload("AboutPage", { ...DEFAULT_ABOUT, ...payload });
  const member = DEFAULT_ABOUT.team_members[0]; const step = DEFAULT_ABOUT.approach_steps[0];
  for (const image of ["javascript:alert(1)", "data:image/png;base64,AA==", "//other.example/team.jpg", "/uploads/../secret.jpg", "https://user:pass@example.test/photo.jpg", "https:\\example.test\\photo.jpg", "https://example.test/with space.jpg"]) {
    assert.throws(() => validate({ hero_image: image }), /valid http\/https/);
    assert.throws(() => validate({ team_members: [{ ...member, image }] }), /valid http\/https/);
  }
  assert.throws(() => validate({ team_members: [{ ...member, email: "private@example.test" }] }), /public presentation fields/);
  assert.throws(() => validate({ team_members: [{ ...member, password: "private" }] }), /Private fields/);
  assert.throws(() => validate({ team_members: [member, member] }), /unique valid item IDs/);
  assert.throws(() => validate({ team_members: [{ ...member, name: " " }] }), /name is required/);
  assert.throws(() => validate({ team_members: Array(51).fill(member) }), /at most 50/);
  assert.throws(() => validate({ team_members: null }), /at most 50/);
  assert.throws(() => validate({ approach_steps: [{ ...step, icon: "UntrustedComponent" }] }), /Unsupported approach icon/);
  assert.throws(() => validate({ approach_steps: [{ ...step, description: {} }] }), /description is required/);
  assert.throws(() => validate({ mission_text: "x".repeat(10001) }), /Invalid About/);
});

test("all recovered catalogue detail sections pass the public field allowlist", () => {
  for (const source of LIVE_SERVICES) assert.deepEqual(cleanPublicPayload("Service", source).sub_services, source.sub_services);
  for (const source of LIVE_CONCEPTS) assert.deepEqual(cleanPublicPayload("PicYourConcept", source).sub_services, source.sub_services);
  const partial = cleanPublicPayload("Project", { title: "Updated" }, { gallery_images: ["https://example.invalid/a.jpg"] });
  assert.equal(partial.gallery_images.length, 1);
});

test("public content preserves richer payloads and logs actor, time and field names only", async () => {
  const database = recorder(); const repository = createContentRepository({ database });
  const source = { title: "Synthetic service", features: ["Planning"], sub_services: [{ title: "Kitchen", description: "Synthetic idea", features: ["Lighting"] }] };
  const saved = await repository.createContent("Service", source, actor);
  assert.deepEqual(saved.sub_services, source.sub_services); assert.equal(saved.created_date, "2026-09-07T12:00:00Z");
  assert.equal(database.committed, true);
  const event = database.calls.find((call) => call.sql.startsWith("INSERT INTO audit_logs"));
  assert.equal(event.args[1], actor.userId); assert.match(event.sql, /UTC_TIMESTAMP/);
  assert.deepEqual(JSON.parse(event.args[5]).changed_fields, ["features", "sub_services", "title"]);
  assert.ok(!JSON.stringify(event.args).includes("Synthetic idea"));
});

test("audit failure rolls back the transaction and database errors cannot become mock saves", async () => {
  const database = recorder({ failAudit: true });
  await assert.rejects(createContentRepository({ database }).createContent("Stat", { label: "Synthetic metric", value: "8" }, actor), /audit failure/);
  assert.equal(database.committed, false); assert.equal(database.rolledBack, true);
  const offline = Object.assign(new Error("offline"), { code: "ECONNREFUSED" });
  await assert.rejects(createContentRepository({ database: { async getConnection() { throw offline; } } }).createContent("Stat", { label: "Unavailable" }, actor), /offline/);
  assert.equal(shouldUseLocalFallback(offline), false);
});

test("confidential consultation fields reach storage only as encrypted ciphertext", async () => {
  const database = recorder(); const repository = createContentRepository({ database });
  const input = { full_name: "Synthetic QA Person", email: "synthetic@example.invalid", phone: "+15550001111", location: "Private test address", budget: "Private test budget", message: "Private test message", preferred_date: "2027-01-01", project_type: "residential", status: "completed", assigned_to_user_id: actor.userId };
  const created = await repository.createContent("Consultation", input, {});
  assert.equal(created.status, "pending"); assert.equal(created.assigned_to_user_id, null);
  const native = database.calls.find((call) => call.sql.startsWith("INSERT INTO consultation_requests"));
  assert.equal(decryptText(native.args[2], `Consultation:${created.id}:email`), input.email);
  assert.equal(native.args[4], lookupHash(input.email));
  const details = database.calls.find((call) => call.sql.startsWith("INSERT INTO app_private_details"));
  const decrypted = JSON.parse(decryptText(details.args[1], `Consultation:${created.id}:details`));
  assert.equal(decrypted.message, input.message); assert.equal(decrypted.preferred_date, input.preferred_date);
  assert.equal(decrypted.project_type, input.project_type); assert.equal(native.args[6], null);
  const stored = database.calls.flatMap((call) => call.args).map((v) => Buffer.isBuffer(v) ? v.toString() : String(v)).join(" ");
  for (const secret of [input.full_name, input.email, input.phone, input.location, input.budget, input.message, input.preferred_date, input.project_type]) assert.ok(!stored.includes(secret));
});

test("public allowlists reject private nested fields and unsafe social URLs", () => {
  assert.throws(() => cleanPublicPayload("Service", { title: "Test", sub_services: [{ title: "Idea", email: "private@example.invalid" }] }), /public presentation fields/);
  assert.throws(() => cleanPublicPayload("Service", { title: "Test", sub_services: [{ title: "Idea", password: "fake" }] }), /Private fields/);
  assert.throws(() => cleanPublicPayload("Service", { title: "Test", description: { email: "private@example.invalid" } }), /must be text/);
  assert.throws(() => cleanPublicPayload("Service", { title: "Test", sub_services: [{ title: "Idea", id: { email: "private@example.invalid" } }] }), /Invalid sub-service id/);
  assert.equal(cleanPublicPayload("Project", { title: "Test", confidential_email: "private@example.invalid" }).confidential_email, undefined);
  assert.throws(() => cleanPublicPayload("ContactInfo", { social_links: { instagram: "javascript:alert(1)" } }), /http or https/);
  assert.equal(cleanPublicPayload("ContactInfo", { social_links: { bluesky: "https://bsky.app/profile/example" } }).social_links.bluesky, "https://bsky.app/profile/example");
});

test("authentication, strict QA database names and verified TLS are enforced", async () => {
  await assert.rejects(createContentRepository({ database: recorder() }).createContent("Project", { title: "No actor" }), (e) => e.status === 401);
  const env = { ...process.env };
  assert.throws(() => buildPoolOptions({ ...env, DB_NAME: "other_qa" }), /dinterio_d16_qa/);
  assert.throws(() => buildPoolOptions({ ...env, NODE_ENV: "production" }), /Production/);
  assert.throws(() => buildPoolOptions({ ...env, DB_HOST: "database.example.invalid", DB_SSL: "false" }), /verified TLS/);
  const config = buildPoolOptions({ ...env, DB_HOST: "database.example.invalid" });
  assert.equal(config.ssl.rejectUnauthorized, true); assert.equal(config.timezone, "Z");
});

test("QA environment loader treats shell-special values only as data", () => {
  const directory = mkdtempSync(join(tmpdir(), "d16-env-test-"));
  try {
    const marker = join(directory, "must-not-exist"); const fixture = join(directory, "qa.env");
    const value = `$(touch ${marker}); literal & backticks`;
    writeFileSync(fixture, `DB_PASSWORD="${value}"\nNODE_ENV=qa\n`);
    const child = spawnSync(process.execPath, ["database/run-qa-env.mjs", fixture, process.execPath, "-e", "if (process.env.DB_PASSWORD !== process.env.EXPECTED_TEST_VALUE) process.exit(2)"], { cwd: new URL("..", import.meta.url), env: { ...process.env, EXPECTED_TEST_VALUE: value }, encoding: "utf8" });
    assert.equal(child.status, 0, child.stderr); assert.equal(existsSync(marker), false);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
