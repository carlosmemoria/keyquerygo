const fs = require("node:fs"),
  cp = require("node:child_process");
for (const f of [
  "core.js",
  "content.js",
  "options.js",
  "background.js",
  "popup.js",
])
  cp.execFileSync(process.execPath, ["--check", f]);
const m = JSON.parse(fs.readFileSync("manifest.json"));
for (const f of [
  m.background.service_worker,
  m.action.default_popup,
  m.options_ui.page,
  ...m.content_scripts.flatMap((s) => s.js),
])
  if (!fs.existsSync(f)) throw Error("Missing " + f);
for (const f of ["chrome", "windows", "gnome"])
  JSON.parse(fs.readFileSync("data/" + f + ".json"));
console.log("Syntax, manifest and JSON passed.");
