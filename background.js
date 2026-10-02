chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get("rules", (data) => {
    if (!data.rules) chrome.runtime.openOptionsPage();
  });
});
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (message.type !== "search") return;
  (async () => {
    try {
      const { rules = [] } = await chrome.storage.local.get("rules");
      const rule = rules.find((r) => r.id === message.id && r.enabled);
      if (
        !rule ||
        typeof message.query !== "string" ||
        !message.query.trim() ||
        message.query.length > 2000
      )
        throw Error("Pesquisa inválida.");
      const target = new URL(
        rule.url.replaceAll(
          "{query}",
          encodeURIComponent(message.query.trim()),
        ),
      );
      if (!["http:", "https:"].includes(target.protocol))
        throw Error("URL inválida.");
      await chrome.tabs.create({ url: target.href });
      reply({ ok: true });
    } catch (e) {
      reply({ ok: false, error: e.message });
    }
  })();
  return true;
});
