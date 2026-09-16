(() => {
  "use strict";
  const locale = document.body?.dataset.locale === "en" ? "en" : "tr";
  const labels = locale === "en"
    ? { columns: "Columns", compact: "Compact rows", reset: "Reset", visible: "Visible columns" }
    : { columns: "Sütunlar", compact: "Kompakt satır", reset: "Varsayılan", visible: "Görünen sütunlar" };
  const safeRead = key => {
    try { return JSON.parse(localStorage.getItem(key) || "{}") || {}; } catch { return {}; }
  };
  const safeWrite = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  };
  function cellsAt(table, index) {
    return [
      table.querySelector(`colgroup col:nth-child(${index + 1})`),
      ...table.querySelectorAll(`tr > :nth-child(${index + 1})`)
    ].filter(Boolean);
  }
  function setColumn(table, index, visible) {
    cellsAt(table, index).forEach(cell => cell.classList.toggle("is-column-hidden-v3817", !visible));
  }
  function mobileLabels(table, headers) {
    table.querySelectorAll("tbody tr").forEach(row => {
      [...row.children].forEach((cell, index) => {
        if (cell.hasAttribute("colspan")) return;
        cell.dataset.columnLabel = headers[index] || "";
      });
    });
  }
  function setup(table) {
    const id = String(table.dataset.tablePreferences || "").trim();
    if (!id || !table.tHead?.rows?.[0]) return;
    const headers = [...table.tHead.rows[0].cells].map(cell => cell.textContent.replace(/\s+/g, " ").trim());
    mobileLabels(table, headers);
    const key = `crm-table-preferences-v3817:${document.body?.dataset.userId || "guest"}:${id}`;
    const state = safeRead(key);
    const configurable = headers.map((text, index) => ({ text, index })).filter(item =>
      item.index > 0 && item.index < headers.length - 1 && item.text
    );
    configurable.forEach(item => setColumn(table, item.index, state.hidden?.includes(item.index) !== true));
    table.classList.toggle("is-compact-v3817", Boolean(state.compact));
    const section = table.closest(".list-table-card");
    if (!section || section.previousElementSibling?.dataset.tablePreferenceBar === id) return;
    const bar = document.createElement("div");
    bar.className = "table-preference-bar-v3817";
    bar.dataset.tablePreferenceBar = id;
    const details = document.createElement("details");
    details.className = "table-column-menu-v3817";
    const summary = document.createElement("summary");
    summary.className = "btn btn--soft btn--sm";
    summary.textContent = labels.columns;
    details.append(summary);
    const menu = document.createElement("div");
    menu.className = "table-column-menu-v3817__panel";
    const title = document.createElement("strong");
    title.textContent = labels.visible;
    menu.append(title);
    configurable.forEach(item => {
      const row = document.createElement("label");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = state.hidden?.includes(item.index) !== true;
      input.addEventListener("change", () => {
        setColumn(table, item.index, input.checked);
        const hidden = configurable.filter(entry => !menu.querySelector(`[data-column-index="${entry.index}"]`)?.checked).map(entry => entry.index);
        safeWrite(key, { ...safeRead(key), hidden });
      });
      input.dataset.columnIndex = String(item.index);
      row.append(input, document.createTextNode(item.text));
      menu.append(row);
    });
    const compact = document.createElement("input");
    const reset = document.createElement("button");
    reset.type = "button";
    reset.className = "btn btn--sm";
    reset.textContent = labels.reset;
    reset.addEventListener("click", () => {
      configurable.forEach(item => {
        const input = menu.querySelector(`[data-column-index="${item.index}"]`);
        if (input) input.checked = true;
        setColumn(table, item.index, true);
      });
      table.classList.remove("is-compact-v3817");
      compact.checked = false;
      safeWrite(key, {});
    });
    menu.append(reset);
    details.append(menu);
    const compactLabel = document.createElement("label");
    compactLabel.className = "table-density-toggle-v3817";
    compact.type = "checkbox";
    compact.checked = Boolean(state.compact);
    compact.addEventListener("change", () => {
      table.classList.toggle("is-compact-v3817", compact.checked);
      safeWrite(key, { ...safeRead(key), compact: compact.checked });
    });
    compactLabel.append(compact, document.createTextNode(labels.compact));
    bar.append(details, compactLabel);
    section.parentNode.insertBefore(bar, section);
  }
  const run = () => document.querySelectorAll("table[data-table-preferences]").forEach(setup);
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", run, { once: true }) : run();
})();
