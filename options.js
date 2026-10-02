const $ = (s) => document.querySelector(s);
let rules = [],
  editing = null,
  mods = [],
  capturing = false,
  bases = [],
  platform = "none";
const browserBase = fetch("data/chrome.json").then((r) => r.json());
const systemBases = {
  windows: fetch("data/windows.json").then((r) => r.json()),
  gnome: fetch("data/gnome.json").then((r) => r.json()),
};
function rule() {
  return {
    id: editing || crypto.randomUUID(),
    name: $("#name").value.trim(),
    url: $("#url").value.trim(),
    trigger: $("#trigger").value,
    modifiers: [...mods],
    caseSensitive: $("#case").checked,
    enabled: $("#enabled").checked,
  };
}
function feedback() {
  const result = KQG.validate(rule(), rules, bases);
  $("#feedback").className = result.errors.length
    ? "error"
    : result.warnings.length
      ? "warning"
      : "good";
  $("#feedback").textContent = result.errors.length
    ? result.errors.join("\n")
    : result.warnings.length
      ? "Atenção — conflito conhecido:\n" + result.warnings.join("\n")
      : "Nenhum conflito encontrado na base selecionada.";
  return result;
}
function keyboard() {
  const box = $("#keyboard");
  box.replaceChildren();
  for (const row of ["1234567890", "QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"]) {
    const line = document.createElement("div");
    line.className = "keyrow";
    for (const key of row) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "key";
      b.textContent = key;
      b.onclick = () => {
        $("#trigger").value = ($("#trigger").value + key.toLowerCase()).slice(
          0,
          12,
        );
        feedback();
      };
      line.append(b);
    }
    box.append(line);
  }
  const line = document.createElement("div");
  line.className = "keyrow";
  for (const [key, label] of [
    ["Ctrl", "Ctrl"],
    ["Shift", "Shift"],
    ["Alt", "Alt"],
    ["AltGr", "AltGr"],
    ["Meta", "Win / Super"],
  ]) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "key mod" + (mods.includes(key) ? " active" : "");
    b.textContent = label;
    b.setAttribute("aria-pressed", String(mods.includes(key)));
    b.onclick = () => {
      mods = mods.includes(key)
        ? mods.filter((m) => m !== key)
        : [...mods, key];
      if (key === "AltGr")
        mods = mods.filter((m) => !["Ctrl", "Alt"].includes(m));
      if (["Ctrl", "Alt"].includes(key))
        mods = mods.filter((m) => m !== "AltGr");
      keyboard();
      feedback();
    };
    line.append(b);
  }
  box.append(line);
}
function reset() {
  editing = null;
  mods = [];
  capturing = false;
  $("#capture").textContent = "● Capturar no teclado";
  $("#editor").reset();
  $("#editor-title").textContent = "Novo destino";
  keyboard();
  $("#feedback").textContent = "";
}
function edit(r) {
  reset();
  editing = r.id;
  mods = [...r.modifiers];
  $("#name").value = r.name;
  $("#url").value = r.url;
  $("#trigger").value = r.trigger;
  $("#case").checked = r.caseSensitive;
  $("#enabled").checked = r.enabled;
  $("#editor-title").textContent = "Editar " + r.name;
  keyboard();
  feedback();
}
async function persist() {
  await chrome.storage.local.set({ rules, platform });
  render();
}
function render() {
  $("#rules").replaceChildren();
  for (const r of rules) {
    const item = document.createElement("div");
    item.className = "destination" + (r.enabled ? "" : " off");
    const detail = document.createElement("div");
    detail.className = "detail";
    const title = document.createElement("strong");
    title.textContent = r.name;
    const trigger = document.createElement("code");
    trigger.textContent = [...r.modifiers, r.trigger].join(" + ");
    detail.append(title, trigger);
    const editButton = document.createElement("button");
    editButton.className = "secondary";
    editButton.textContent = "Editar";
    editButton.onclick = () => edit(r);
    const remove = document.createElement("button");
    remove.className = "secondary";
    remove.textContent = "×";
    remove.setAttribute("aria-label", "Excluir " + r.name);
    remove.onclick = async () => {
      if (confirm("Excluir " + r.name + "?")) {
        rules = rules.filter((x) => x.id !== r.id);
        await persist();
        if (editing === r.id) reset();
      }
    };
    item.append(detail, editButton, remove);
    $("#rules").append(item);
  }
}
async function updateBases() {
  bases = [await browserBase];
  if (systemBases[platform]) bases.push(await systemBases[platform]);
  feedback();
}
$("#editor").addEventListener("input", () => feedback());
$("#editor").onsubmit = async (e) => {
  e.preventDefault();
  const r = rule(),
    result = feedback();
  if (result.errors.length) return;
  if (
    result.warnings.length &&
    !confirm("Há conflitos conhecidos. Salvar mesmo assim?")
  )
    return;
  rules = rules.filter((x) => x.id !== r.id);
  rules.push(r);
  await persist();
  reset();
  $("#feedback").className = "good";
  $("#feedback").textContent =
    "Destino salvo. Os gatilhos foram atualizados nas páginas abertas.";
};
$("#new").onclick = reset;
$("#clear").onclick = () => {
  mods = [];
  $("#trigger").value = "";
  keyboard();
  feedback();
};
$("#capture").onclick = () => {
  capturing = !capturing;
  $("#capture").textContent = capturing
    ? "Capturando… Esc encerra"
    : "● Capturar no teclado";
  if (capturing) {
    $("#trigger").value = "";
    mods = [];
    keyboard();
  }
};
document.addEventListener(
  "keydown",
  (e) => {
    if (!capturing) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.key === "Escape") {
      capturing = false;
      $("#capture").textContent = "● Capturar no teclado";
      return;
    }
    if (e.repeat || e.isComposing) return;
    mods = KQG.modifiers(e);
    if (/^[a-zA-Z0-9]$/.test(e.key))
      $("#trigger").value = ($("#trigger").value + e.key).slice(0, 12);
    keyboard();
    feedback();
  },
  true,
);
$("#platform").onchange = async () => {
  platform = $("#platform").value;
  await updateBases();
  await persist();
};
$("#test").onclick = () => {
  try {
    if (!$("#url").value.includes("{query}")) throw Error("Inclua {query}.");
    const query = prompt("Termo para testar a URL:", "KeyQueryGo");
    if (query?.trim())
      chrome.tabs.create({ url: KQG.url($("#url").value, query) });
  } catch (e) {
    $("#feedback").className = "error";
    $("#feedback").textContent = e.message;
  }
};
$("#export").onclick = () => {
  const blob = new Blob(
    [JSON.stringify({ version: 1, rules, platform }, null, 2)],
    { type: "application/json" },
  );
  const u = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = u;
  a.download = "keyquerygo-settings.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
};
$("#import").onclick = () => $("#file").click();
$("#file").onchange = async () => {
  try {
    const f = $("#file").files[0];
    if (!f) return;
    if (f.size > 100000) throw Error("Arquivo maior que 100 KB.");
    const d = JSON.parse(await f.text());
    if (d.version !== 1 || !Array.isArray(d.rules) || d.rules.length > 100)
      throw Error("Formato inválido.");
    const clean = [];
    for (const r of d.rules) {
      if (
        typeof r.name !== "string" ||
        typeof r.trigger !== "string" ||
        typeof r.url !== "string" ||
        !Array.isArray(r.modifiers) ||
        r.modifiers.some(
          (m) => !["Ctrl", "Alt", "Shift", "AltGr", "Meta"].includes(m),
        )
      )
        throw Error("Destino inválido.");
      const v = {
        id: crypto.randomUUID(),
        name: r.name,
        trigger: r.trigger,
        url: r.url,
        modifiers: [...new Set(r.modifiers)],
        caseSensitive: !!r.caseSensitive,
        enabled: r.enabled !== false,
      };
      if (KQG.validate(v, clean, bases).errors.length)
        throw Error("Gatilhos inválidos ou em conflito.");
      clean.push(v);
    }
    if (
      !confirm(
        "Substituir os destinos atuais pelos " + clean.length + " importados?",
      )
    )
      return;
    rules = clean;
    await persist();
    reset();
    $("#feedback").textContent = "Importação concluída.";
  } catch (e) {
    $("#feedback").className = "error";
    $("#feedback").textContent = e.message;
  } finally {
    $("#file").value = "";
  }
};
(async () => {
  const data = await chrome.storage.local.get(["rules", "platform"]);
  rules = data.rules || structuredClone(KQG.defaults);
  platform = data.platform || "none";
  $("#platform").value = platform;
  await updateBases();
  await persist();
  reset();
})();
