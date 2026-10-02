(() => {
  let rules = [],
    overlay = null,
    prior = null;
  const matcher = new KQG.Matcher();
  chrome.storage.local.get("rules", (d) => {
    rules = d.rules || KQG.defaults;
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.rules) {
      rules = changes.rules.newValue || [];
      matcher.reset();
    }
  });
  function editable(e) {
    return (
      e
        .composedPath()
        .some(
          (n) =>
            n instanceof Element &&
            (n.matches("input,textarea,select") ||
              n.isContentEditable ||
              n.getAttribute("role") === "textbox"),
        ) || document.designMode === "on"
    );
  }
  function close() {
    overlay?.remove();
    overlay = null;
    matcher.reset();
    prior?.focus?.();
  }
  function open(rule) {
    if (overlay) return;
    prior = document.activeElement;
    const host = document.createElement("div");
    overlay = host;
    host.style.cssText = "position:fixed;inset:0;z-index:2147483647";
    const shadow = host.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = `:host{all:initial}.backdrop{position:fixed;inset:0;background:#080d1acc;display:flex;align-items:flex-start;justify-content:center;padding:18vh 20px;font:16px system-ui;color:#eef2ff}.card{width:min(580px,90vw);background:#141d30;border:1px solid #354466;border-radius:20px;padding:26px;box-shadow:0 28px 90px #0008}h2{margin:0 0 18px;font-size:23px}input{box-sizing:border-box;width:100%;padding:16px;border:1px solid #5e7db4;background:#0b1220;color:white;border-radius:10px;font:18px system-ui}button{background:#a5f3c7;color:#102018;border:0;border-radius:9px;padding:11px 18px;cursor:pointer;font:600 15px system-ui}.actions{display:flex;justify-content:space-between;align-items:center;margin-top:17px}p{font-size:13px;color:#b1bed5}.error{color:#ffb4b4}`;
    shadow.append(style);
    const back = document.createElement("div");
    back.className = "backdrop";
    const card = document.createElement("form");
    card.className = "card";
    const title = document.createElement("h2");
    title.textContent = "Pesquisar · " + rule.name;
    const input = document.createElement("input");
    input.type = "search";
    input.placeholder = "O que você quer encontrar?";
    input.setAttribute("aria-label", "Termo de pesquisa");
    input.maxLength = 2000;
    const actions = document.createElement("div");
    actions.className = "actions";
    const hint = document.createElement("p");
    hint.textContent = "Enter pesquisa · Esc fecha";
    const button = document.createElement("button");
    button.textContent = "Pesquisar";
    const error = document.createElement("p");
    error.className = "error";
    error.setAttribute("role", "alert");
    actions.append(hint, button);
    card.append(title, input, actions, error);
    back.append(card);
    shadow.append(back);
    document.documentElement.append(host);
    back.addEventListener("click", (e) => {
      if (e.target === back) close();
    });
    card.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!input.value.trim()) return;
      button.disabled = true;
      try {
        const result = await chrome.runtime.sendMessage({
          type: "search",
          id: rule.id,
          query: input.value,
        });
        if (result?.ok) close();
        else error.textContent = result?.error || "Não foi possível pesquisar.";
      } catch {
        error.textContent = "Recarregue a página após atualizar a extensão.";
      }
      button.disabled = false;
    });
    host.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
      if (e.key === "Tab") {
        e.preventDefault();
        (shadow.activeElement === input ? button : input).focus();
      }
    });
    input.focus();
  }
  document.addEventListener(
    "keydown",
    (e) => {
      if (overlay) return;
      const rule = matcher.feed(e, rules, editable(e));
      if (rule) {
        e.preventDefault();
        e.stopPropagation();
        open(rule);
      }
    },
    true,
  );
  window.addEventListener("blur", () => matcher.reset());
})();
