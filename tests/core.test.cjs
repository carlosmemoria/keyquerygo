const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  core = require("../core.js"),
  base = require("../data/chrome.json");
const event = (key, mods = {}) => ({
  key,
  ...mods,
  getModifierState: () => false,
});
test("simple sequence ignores case", () => {
  const m = new core.Matcher();
  m.feed(event("G"), core.defaults, false, 1000);
  assert.equal(m.feed(event("O"), core.defaults, false, 1100).id, "google");
});
test("inputs do not launch plain sequences", () => {
  const m = new core.Matcher();
  m.feed(event("g"), core.defaults, true, 1000);
  assert.equal(m.feed(event("o"), core.defaults, true, 1100), null);
});
test("timeout resets sequence", () => {
  const m = new core.Matcher();
  m.feed(event("g"), core.defaults, false, 1000);
  assert.equal(m.feed(event("o"), core.defaults, false, 2000), null);
});
test("both Ctrl stages warn", () => {
  const v = core.validate(
    { ...core.defaults[0], modifiers: ["Ctrl"] },
    [],
    [base],
  );
  assert.ok(v.warnings.some((x) => x.includes("Ctrl+G")));
  assert.ok(v.warnings.some((x) => x.includes("Ctrl+O")));
});
test("prefix collision rejected", () => {
  assert.ok(
    core.validate({ ...core.defaults[0], id: "x", trigger: "g" }, core.defaults)
      .errors.length,
  );
});
test("safe URL encoding", () => {
  assert.equal(
    core.url("https://example.com/?q={query}", "a&b"),
    "https://example.com/?q=a%26b",
  );
  assert.throws(() => core.url("javascript:{query}", "x"));
});
test("AltGr differs from Ctrl Alt", () => {
  assert.deepEqual(
    core.modifiers({
      ctrlKey: true,
      altKey: true,
      getModifierState: () => true,
    }),
    ["AltGr"],
  );
});
test("modifier works inside input", () => {
  const m = new core.Matcher(),
    r = [{ ...core.defaults[0], modifiers: ["Alt"] }];
  m.feed(event("g", { altKey: true }), r, true, 1000);
  assert.equal(
    m.feed(event("o", { altKey: true }), r, true, 1100).id,
    "google",
  );
});
test("case sensitive matching", () => {
  const m = new core.Matcher(),
    r = [{ ...core.defaults[0], trigger: "GO", caseSensitive: true }];
  m.feed(event("g"), r, false, 1000);
  assert.equal(m.feed(event("o"), r, false, 1100), null);
  m.feed(event("G"), r, false, 1200);
  assert.equal(m.feed(event("O"), r, false, 1300).id, "google");
});
