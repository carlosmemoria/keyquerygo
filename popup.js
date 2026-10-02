chrome.storage.local.get("rules", (d) => {
  for (const r of d.rules || []) {
    const p = document.createElement("p");
    p.textContent =
      r.name + " · " + [...r.modifiers, r.trigger.toUpperCase()].join(" + ");
    document.querySelector("#shortcuts").append(p);
  }
});
document.querySelector("#settings").onclick = () =>
  chrome.runtime.openOptionsPage();
