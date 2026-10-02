(function (root) {
  const defaults = [
    {
      id: "google",
      name: "Google",
      trigger: "go",
      modifiers: [],
      caseSensitive: false,
      url: "https://www.google.com/search?q={query}",
      enabled: true,
    },
    {
      id: "duckduckgo",
      name: "DuckDuckGo",
      trigger: "du",
      modifiers: [],
      caseSensitive: false,
      url: "https://duckduckgo.com/?q={query}",
      enabled: true,
    },
    {
      id: "yahoo",
      name: "Yahoo",
      trigger: "ya",
      modifiers: [],
      caseSensitive: false,
      url: "https://search.yahoo.com/search?p={query}",
      enabled: true,
    },
  ];
  function modifiers(e) {
    if (e.getModifierState?.("AltGraph"))
      return ["AltGr", ...(e.shiftKey ? ["Shift"] : [])];
    return [
      ["Ctrl", e.ctrlKey],
      ["Alt", e.altKey],
      ["Shift", e.shiftKey],
      ["Meta", e.metaKey],
    ]
      .filter((x) => x[1])
      .map((x) => x[0])
      .sort();
  }
  function signature(mods) {
    return [...mods].sort().join("+");
  }
  function url(template, query) {
    const value = template.replaceAll("{query}", encodeURIComponent(query));
    const u = new URL(value);
    if (!["https:", "http:"].includes(u.protocol))
      throw Error("Use an HTTP or HTTPS search URL.");
    return u.href;
  }
  function validate(rule, rules = [], bases = []) {
    const errors = [],
      warnings = [];
    if (!rule.name.trim()) errors.push("Informe um nome.");
    if (!/^[a-zA-Z0-9]{1,12}$/.test(rule.trigger))
      errors.push("Use de 1 a 12 letras ou números.");
    if (!rule.url.includes("{query}"))
      errors.push("A URL precisa conter {query}.");
    try {
      url(rule.url, "test");
    } catch {
      errors.push("URL inválida: use http ou https.");
    }
    for (const other of rules) {
      if (other.id === rule.id || !other.enabled) continue;
      if (signature(other.modifiers) !== signature(rule.modifiers)) continue;
      const a =
        rule.caseSensitive && other.caseSensitive
          ? rule.trigger
          : rule.trigger.toLowerCase();
      const b =
        rule.caseSensitive && other.caseSensitive
          ? other.trigger
          : other.trigger.toLowerCase();
      if (a.startsWith(b) || b.startsWith(a))
        errors.push("Gatilho duplicado ou prefixo de " + other.name + ".");
    }
    for (const [i, key] of [...rule.trigger].entries()) {
      for (const base of bases)
        for (const entry of base.entries) {
          if (
            entry.key.toLowerCase() === key.toLowerCase() &&
            signature(entry.modifiers) === signature(rule.modifiers)
          )
            warnings.push(
              "Etapa " +
                (i + 1) +
                ": " +
                entry.modifiers.join("+") +
                "+" +
                key.toUpperCase() +
                " — " +
                entry.action +
                " (" +
                base.name +
                ").",
            );
        }
    }
    if (rule.modifiers.includes("Meta"))
      warnings.push("Windows / Super pode ser interceptada pelo sistema.");
    if (rule.modifiers.includes("AltGr"))
      warnings.push("AltGr pode produzir símbolos; teste no seu layout.");
    return { errors, warnings: [...new Set(warnings)] };
  }
  class Matcher {
    constructor() {
      this.buffer = "";
      this.last = 0;
      this.mods = "";
    }
    reset() {
      this.buffer = "";
      this.last = 0;
      this.mods = "";
    }
    feed(e, rules, editable = false, now = Date.now()) {
      if (
        e.repeat ||
        e.isComposing ||
        e.key.length !== 1 ||
        !/^[a-zA-Z0-9]$/.test(e.key)
      ) {
        if (!["Control", "Shift", "Alt", "AltGraph", "Meta"].includes(e.key))
          this.reset();
        return null;
      }
      const mods = signature(modifiers(e));
      if (editable && !mods) {
        this.reset();
        return null;
      }
      if (now - this.last > 900 || mods !== this.mods) this.buffer = "";
      this.last = now;
      this.mods = mods;
      this.buffer = (this.buffer + e.key).slice(-12);
      const candidates = rules.filter(
        (r) => r.enabled && signature(r.modifiers) === mods,
      );
      for (const r of candidates) {
        const b = r.caseSensitive ? this.buffer : this.buffer.toLowerCase();
        const t = r.caseSensitive ? r.trigger : r.trigger.toLowerCase();
        if (b.endsWith(t)) {
          this.reset();
          return r;
        }
      }
      return null;
    }
  }
  const api = { defaults, modifiers, signature, url, validate, Matcher };
  root.KQG = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
