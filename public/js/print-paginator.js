(() => {
  "use strict";

  const pagesRoot = document.getElementById("print-pages");
  const source = document.getElementById("print-source");
  const overflowTolerance = 1;
  const footerSafetyGap = 12;

  function waitForPrintImages(root = document, timeoutMs = 5000) {
    const images = [...root.querySelectorAll("img")];
    if (!images.length) return Promise.resolve();
    const waits = images.map((image) => {
      if (image.complete) return Promise.resolve();
      return new Promise((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          image.removeEventListener("load", finish);
          image.removeEventListener("error", finish);
          resolve();
        };
        image.addEventListener("load", finish, { once: true });
        image.addEventListener("error", finish, { once: true });
        setTimeout(finish, timeoutMs);
      });
    });
    return Promise.allSettled(waits).then(() => undefined);
  }

  window.__printAssetsReady = waitForPrintImages(document);

  function paginateManualFinalBlocks() {
    const pages = [...document.querySelectorAll(".custom-template-a4")];
    if (!pages.length) return false;

    pages.forEach((page) => {
      const finalBlock = page.querySelector(":scope > .manual-final-block");
      if (!finalBlock) return;
      const footer = page.querySelector(":scope > .manual-footer");
      const pageRect = page.getBoundingClientRect();
      const footerTop = footer?.getBoundingClientRect().top || pageRect.bottom - footerSafetyGap;
      if (finalBlock.getBoundingClientRect().bottom <= footerTop - footerSafetyGap) return;

      // Özel HTML şablonunda koşullar+banka+imza tek parçadır. Fiyat/toplam
      // bölümü de mevcut A4'e sığmıyorsa bu üçlüyle aynı yeni A4'e taşınır.
      const manualTotals = page.querySelector(":scope > .manual-totals");
      const moveTotalsWithFinal = Boolean(
        manualTotals && manualTotals.getBoundingClientRect().bottom > footerTop - footerSafetyGap
      );
      const nextPage = document.createElement("article");
      nextPage.className = `${page.className} custom-template-a4--continuation`;
      let movedGroup = finalBlock;
      if (moveTotalsWithFinal) {
        const group = document.createElement("section");
        group.className = "manual-price-final-block--atomic";
        manualTotals.remove();
        finalBlock.remove();
        group.append(manualTotals, finalBlock);
        nextPage.appendChild(group);
        movedGroup = group;
      } else {
        finalBlock.remove();
        nextPage.appendChild(finalBlock);
      }
      if (footer) nextPage.appendChild(footer.cloneNode(true));
      page.insertAdjacentElement("afterend", nextPage);

      const nextFooter = nextPage.querySelector(":scope > .manual-footer");
      const nextFooterTop = nextFooter?.getBoundingClientRect().top || nextPage.getBoundingClientRect().bottom - footerSafetyGap;
      if (movedGroup.getBoundingClientRect().bottom > nextFooterTop - footerSafetyGap) {
        finalBlock.classList.add("manual-final-block--compact");
        if (moveTotalsWithFinal) movedGroup.classList.add("manual-price-final-block--compact");
      }
      const compactFooterTop = nextFooter?.getBoundingClientRect().top || nextPage.getBoundingClientRect().bottom - footerSafetyGap;
      if (movedGroup.getBoundingClientRect().bottom > compactFooterTop - footerSafetyGap) {
        const available = Math.max(1, compactFooterTop - movedGroup.getBoundingClientRect().top - footerSafetyGap);
        const actual = Math.max(1, movedGroup.getBoundingClientRect().height);
        const scale = Math.max(0.62, Math.min(0.98, available / actual));
        movedGroup.style.setProperty("--manual-price-final-fit-zoom", scale.toFixed(4));
        movedGroup.classList.add("manual-price-final-block--scaled");
      }
    });

    const finalPages = [...document.querySelectorAll(".custom-template-a4")];
    finalPages.forEach((page, index) => {
      const last = page.querySelector(".manual-footer span:last-child");
      if (last) last.textContent = `${last.textContent.trim().replace(/\s+\d+\s*\/\s*\d+$/, "")} ${index + 1} / ${finalPages.length}`;
    });
    return true;
  }

  if (!pagesRoot || !source) {
    const runManual = () => {
      Promise.resolve(window.__printAssetsReady).finally(() => {
        paginateManualFinalBlocks();
        window.__printPaginationReady = true;
        window.dispatchEvent(new CustomEvent("print-pagination-ready"));
      });
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", runManual, { once: true });
    else runManual();
    return;
  }

  const clone = (node) => (node ? node.cloneNode(true) : null);
  const isOverflowing = (body) => {
    if (body.scrollHeight > body.clientHeight + overflowTolerance) return true;

    // The footer is positioned outside .print-page-body. A block can therefore
    // fit the body's scroll box while still touching the footer in WebKit's
    // print layout. Check the real page geometry and keep a 3 mm safety gap.
    const page = body.closest(".print-page");
    const footer = page?.querySelector(".print-footer--page");
    if (!footer) return false;
    const children = [...body.children];
    if (!children.length) return false;
    const contentBottom = Math.max(...children.map((node) => node.getBoundingClientRect().bottom));
    return contentBottom > footer.getBoundingClientRect().top - footerSafetyGap;
  };

  const sourceFooter = source.querySelector(".print-footer");
  const sourceItems = source.querySelector(".items-section");
  const sourceTable = sourceItems?.querySelector(".print-items");
  const sourceRows = [...(sourceTable?.querySelectorAll("tbody > tr") || [])];
  const introBlocks = [
    source.querySelector(".document-title"),
    source.querySelector(".print-top-grid"),
    source.querySelector(".customer-card")
  ].filter(Boolean);
  const sourceFinalBlock = source.querySelector(".final-page-block");
  const sourceTotals = source.querySelector(".totals");

  const sourceSerial = source.querySelector('.meta-card .serial b')?.textContent?.trim() || '';
  const sourceSerialLabel = source.querySelector('.meta-card .serial span')?.textContent?.trim().replace(/:$/, '') || 'Seri No';

  let currentPage = null;
  let currentTbody = null;

  function createPage() {
    const page = document.createElement("article");
    page.className = "a4 print-page";
    const body = document.createElement("div");
    body.className = "print-page-body";
    page.appendChild(body);
    if (pagesRoot.children.length > 0 && sourceSerial) {
      const serial = document.createElement('div');
      serial.className = 'print-page-serial';
      serial.innerHTML = `<span>${sourceSerialLabel}:</span><b>${sourceSerial}</b>`;
      body.appendChild(serial);
    }
    if (sourceFooter) {
      const footer = clone(sourceFooter);
      footer.classList.add("print-footer--page");
      page.appendChild(footer);
    }
    pagesRoot.appendChild(page);
    currentPage = { page, body };
    currentTbody = null;
    return currentPage;
  }

  function addItemsTable() {
    if (!sourceItems || !sourceTable || !currentPage) return null;
    const section = sourceItems.cloneNode(false);
    const table = sourceTable.cloneNode(false);
    const head = clone(sourceTable.querySelector("thead"));
    const tbody = document.createElement("tbody");
    if (head) table.appendChild(head);
    table.appendChild(tbody);
    section.appendChild(table);
    currentPage.body.appendChild(section);
    currentTbody = tbody;
    return tbody;
  }

  function removeEmptyItemsTable() {
    if (!currentTbody || currentTbody.children.length) return;
    currentTbody.closest(".items-section")?.remove();
    currentTbody = null;
  }

  function continuationRow(row, text, continuation) {
    const copy = clone(row);
    const desc = copy.querySelector(".print-description");
    const small = desc?.querySelector("small");
    if (small) small.textContent = text;
    if (!continuation) return copy;

    copy.classList.add("print-row-continuation");
    const cells = copy.querySelectorAll("td");
    if (cells[0]) cells[0].innerHTML = "";
    if (cells[1]) {
      const code = cells[1].querySelector("b")?.textContent?.trim() || "";
      cells[1].innerHTML = "";
      const codeEl = document.createElement("b");
      codeEl.textContent = code;
      const contEl = document.createElement("small");
      contEl.className = "print-continuation-label";
      contEl.textContent = "DEVAMI";
      cells[1].append(codeEl, contEl);
    }
    const name = desc?.querySelector("b");
    if (name && !name.textContent.includes("DEVAMI")) name.textContent += " (DEVAMI)";
    for (let i = 3; i < cells.length; i += 1) cells[i].textContent = "-";
    return copy;
  }

  function fitTextChunk(row, words, continuation) {
    let low = 1;
    let high = words.length;
    let best = 0;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const candidate = continuationRow(row, words.slice(0, mid).join(" "), continuation);
      currentTbody.appendChild(candidate);
      const fits = !isOverflowing(currentPage.body);
      candidate.remove();
      if (fits) {
        best = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return best;
  }

  function addOversizedRow(row) {
    const full = row.querySelector(".print-description small")?.textContent?.trim() || "";
    const words = full.split(/\s+/).filter(Boolean);
    if (!words.length) {
      const forced = clone(row);
      forced.classList.add("print-row-forced");
      currentTbody.appendChild(forced);
      return;
    }

    let remaining = words;
    let continuation = false;
    while (remaining.length) {
      let count = fitTextChunk(row, remaining, continuation);
      if (!count) {
        removeEmptyItemsTable();
        createPage();
        addItemsTable();
        count = fitTextChunk(row, remaining, continuation);
      }
      if (!count) count = Math.min(remaining.length, 12);
      currentTbody.appendChild(continuationRow(row, remaining.slice(0, count).join(" "), continuation));
      remaining = remaining.slice(count);
      continuation = true;
      if (remaining.length) {
        createPage();
        addItemsTable();
      }
    }
  }

  function addProductRow(row) {
    if (!currentTbody) addItemsTable();
    const copy = clone(row);
    currentTbody.appendChild(copy);
    if (!isOverflowing(currentPage.body)) return;

    copy.remove();
    removeEmptyItemsTable();
    createPage();
    addItemsTable();
    const freshCopy = clone(row);
    currentTbody.appendChild(freshCopy);
    if (!isOverflowing(currentPage.body)) return;

    freshCopy.remove();
    addOversizedRow(row);
  }

  function markContinued(block) {
    const heading = block.querySelector("h2");
    if (heading && !heading.textContent.includes("DEVAMI")) heading.textContent += " - DEVAMI";
    return block;
  }

  function addSplitTermsCard(block) {
    const paragraphs = [...block.querySelectorAll(":scope > div > p")];
    if (!paragraphs.length) return false;
    let index = 0;
    let continuation = false;
    while (index < paragraphs.length) {
      const card = clone(block);
      const content = card.querySelector(":scope > div");
      if (!content) return false;
      content.innerHTML = "";
      if (continuation) markContinued(card);
      currentPage.body.appendChild(card);
      let added = 0;
      while (index < paragraphs.length) {
        const paragraph = clone(paragraphs[index]);
        content.appendChild(paragraph);
        if (isOverflowing(currentPage.body)) {
          paragraph.remove();
          break;
        }
        index += 1;
        added += 1;
      }
      if (!added) {
        card.remove();
        createPage();
        continuation = true;
        continue;
      }
      if (index < paragraphs.length) {
        createPage();
        continuation = true;
      }
    }
    return true;
  }

  function addSplitBankCard(block) {
    const sourceDl = block.querySelector("dl");
    const entries = sourceDl ? [...sourceDl.children] : [];
    if (!entries.length) return false;
    let index = 0;
    let continuation = false;
    while (index < entries.length) {
      const card = clone(block);
      const dl = card.querySelector("dl");
      if (!dl) return false;
      dl.innerHTML = "";
      if (continuation) markContinued(card);
      currentPage.body.appendChild(card);
      let addedPairs = 0;
      while (index < entries.length) {
        const first = clone(entries[index]);
        const second = entries[index + 1] ? clone(entries[index + 1]) : null;
        dl.appendChild(first);
        if (second) dl.appendChild(second);
        if (isOverflowing(currentPage.body)) {
          first.remove();
          second?.remove();
          break;
        }
        index += second ? 2 : 1;
        addedPairs += 1;
      }
      if (!addedPairs) {
        card.remove();
        createPage();
        continuation = true;
        continue;
      }
      if (index < entries.length) {
        createPage();
        continuation = true;
      }
    }
    return true;
  }

  function addTailBlock(block) {
    if (!block) return;
    const copy = clone(block);
    currentPage.body.appendChild(copy);
    if (!isOverflowing(currentPage.body)) return;

    copy.remove();
    createPage();
    const nextCopy = clone(block);
    currentPage.body.appendChild(nextCopy);
    if (!isOverflowing(currentPage.body)) return;

    nextCopy.remove();
    if (block.classList.contains("terms-card") && addSplitTermsCard(block)) return;
    if (block.classList.contains("bank-card") && addSplitBankCard(block)) return;

    const forced = clone(block);
    forced.classList.add("print-block-natural-flow");
    currentPage.body.appendChild(forced);
  }

  function tryPlaceTotalsUnderProducts(totals) {
    if (!totals) return true;
    const copy = clone(totals);
    copy.classList.add("totals--directly-after-products");
    currentPage.body.appendChild(copy);
    if (!isOverflowing(currentPage.body)) return true;
    copy.remove();
    return false;
  }

  function appendPriceAndFinalAtomic(totals, finalBlock) {
    if (!totals || !finalBlock) return false;
    createPage();
    const wrapper = document.createElement("section");
    wrapper.className = "price-final-page-block--atomic";
    const totalsCopy = clone(totals);
    totalsCopy.classList.add("totals--moved-with-final");
    const finalCopy = clone(finalBlock);
    finalCopy.classList.add("final-page-block--atomic", "final-page-block--with-price");
    wrapper.append(totalsCopy, finalCopy);
    currentPage.body.appendChild(wrapper);
    if (!isOverflowing(currentPage.body)) return true;

    // crmv1.25: Fiyat/toplam bölümü ürünlerin altında yer bulamazsa koşullar,
    // banka ve imza grubuyla AYNI A4'e taşınır. Dört blok asla ayrılmaz.
    wrapper.classList.add("price-final-page-block--atomic-compact");
    finalCopy.classList.add("final-page-block--atomic-compact");
    if (!isOverflowing(currentPage.body)) return true;

    const pageFooter = currentPage.page.querySelector(".print-footer--page");
    const bodyRect = currentPage.body.getBoundingClientRect();
    const footerTop = pageFooter?.getBoundingClientRect().top || bodyRect.bottom;
    const available = Math.max(1, footerTop - wrapper.getBoundingClientRect().top - footerSafetyGap);
    const actual = Math.max(1, wrapper.getBoundingClientRect().height);
    const scale = Math.max(0.62, Math.min(0.98, available / actual));
    wrapper.style.setProperty("--price-final-fit-zoom", scale.toFixed(4));
    wrapper.classList.add("price-final-page-block--atomic-scaled");
    return true;
  }

  function appendAtomicFinalBlock(finalBlock, { preferCurrent = true } = {}) {
    if (!finalBlock) return false;

    const appendCandidate = (extraClass = "") => {
      const candidate = clone(finalBlock);
      candidate.classList.add("final-page-block--atomic");
      if (extraClass) candidate.classList.add(extraClass);
      currentPage.body.appendChild(candidate);
      return candidate;
    };

    if (preferCurrent) {
      const currentCopy = appendCandidate("final-page-block--fitted-current");
      if (!isOverflowing(currentPage.body)) return true;
      currentCopy.remove();
    }

    // crmv1.25: TESLİMAT/ÖDEME/GARANTİ + BANKA + İMZA tek bir atomik
    // bloktur. Üç bölümden biri sığmıyorsa üçünü de yeni A4'e taşırız;
    // hiçbir durumda ayrı ayrı paginate/split etmeyiz.
    createPage();
    const fresh = appendCandidate("final-page-block--fresh-page");
    if (!isOverflowing(currentPage.body)) return true;

    // Olağan dışı uzun koşul metinlerinde de üçlü blok ayrılmasın. Önce
    // kontrollü kompakt düzeni uygula, gerekirse sadece bu blokta ölçekle.
    fresh.classList.add("final-page-block--atomic-compact");
    if (!isOverflowing(currentPage.body)) return true;

    const pageFooter = currentPage.page.querySelector(".print-footer--page");
    const bodyRect = currentPage.body.getBoundingClientRect();
    const footerTop = pageFooter?.getBoundingClientRect().top || bodyRect.bottom;
    const available = Math.max(1, footerTop - fresh.getBoundingClientRect().top - footerSafetyGap);
    const actual = Math.max(1, fresh.getBoundingClientRect().height);
    const scale = Math.max(0.72, Math.min(0.98, available / actual));
    fresh.style.setProperty("--final-page-fit-zoom", scale.toFixed(4));
    fresh.classList.add("final-page-block--atomic-scaled");
    return true;
  }

  function dedupePageSerials() {
    [...pagesRoot.querySelectorAll('.print-page')].forEach(page => {
      const terms = page.querySelector('.terms-card');
      const bank = page.querySelector('.bank-card');
      const pageSerial = page.querySelector('.print-page-serial');
      const bankSerial = bank?.querySelector('.bank-serial');
      bankSerial?.classList.remove('is-hidden');
      if (terms) {
        pageSerial?.remove();
        bankSerial?.classList.add('is-hidden');
      } else if (bank) {
        pageSerial?.remove();
      }
    });
  }

  function removeFooterOnlyPages() {
    const pages = [...pagesRoot.querySelectorAll(".print-page")];
    if (pages.length < 2) return;
    pages.forEach((page) => {
      const body = page.querySelector(".print-page-body");
      if (!body) return;
      const meaningful = [...body.children].filter((node) => {
        if (node.classList.contains("print-page-serial")) return false;
        if (node.matches(".items-section") && !node.querySelector("tbody > tr")) return false;
        return Boolean(node.textContent?.trim() || node.querySelector("img,table,input,svg"));
      });
      if (!meaningful.length) page.remove();
    });
  }

  function addFinalBlockPreferCurrent(finalBlock) {
    return appendAtomicFinalBlock(finalBlock, { preferCurrent: true });
  }

  function updatePageNumbers() {
    const pages = [...pagesRoot.querySelectorAll(".print-page")];
    pages.forEach((page, index) => {
      const label = page.querySelector(".print-footer-page");
      if (!label) return;
      const prefix = (label.dataset.prefix || label.textContent || "Sayfa").trim();
      label.dataset.prefix = prefix;
      label.textContent = `${prefix} ${index + 1} / ${pages.length}`;
    });
  }

  function paginate() {
    pagesRoot.innerHTML = "";
    currentPage = null;
    currentTbody = null;

    createPage();
    introBlocks.forEach((block) => currentPage.body.appendChild(clone(block)));
    if (sourceRows.length) {
      addItemsTable();
      sourceRows.forEach(addProductRow);
    }
    const totalsPlacedUnderProducts = sourceTotals ? tryPlaceTotalsUnderProducts(sourceTotals) : true;
    if (sourceFinalBlock) {
      removeEmptyItemsTable();
      if (sourceTotals && !totalsPlacedUnderProducts) {
        appendPriceAndFinalAtomic(sourceTotals, sourceFinalBlock);
      } else {
        // Fiyatlar ürün listesinin hemen altında kaldıysa son koşul+banka+imza
        // grubu kalan alana sığdığı yerde, sığmazsa bir sonraki A4'te tek parça kalır.
        addFinalBlockPreferCurrent(sourceFinalBlock);
      }
    } else if (sourceTotals && !totalsPlacedUnderProducts) {
      addTailBlock(sourceTotals);
    }
    removeFooterOnlyPages();
    dedupePageSerials();
    updatePageNumbers();
    document.documentElement.classList.add("print-pagination-ready");
    window.__printPaginationReady = true;
    window.dispatchEvent(new CustomEvent("print-pagination-ready"));
  }

  window.repaginatePrintDocument = paginate;
  function printWithDocumentTitle() {
    let hostDocument = null;
    let previousHostTitle = "";
    let restored = false;
    try {
      if (window.top && window.top !== window && window.top.document) {
        hostDocument = window.top.document;
        previousHostTitle = hostDocument.title;
        hostDocument.title = document.title;
      }
    } catch {}
    const restore = () => {
      if (restored) return;
      restored = true;
      try { if (hostDocument) hostDocument.title = previousHostTitle; } catch {}
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore, { once: true });
    window.print();
    setTimeout(restore, 120000);
  }

  window.printDocument = () => {
    const run = () => {
      if (!window.__printPaginationReady) paginate();
      setTimeout(printWithDocumentTitle, 80);
    };
    Promise.resolve(window.__printAssetsReady).then(run, run);
  };

  const start = () => {
    try {
      paginate();
    } catch (error) {
      console.error("Print pagination failed", error);
      pagesRoot.innerHTML = "";
      source.classList.add("print-source--fallback");
      window.__printPaginationReady = true;
      window.dispatchEvent(new CustomEvent("print-pagination-ready"));
    }
  };

  // Logo ve ürün görselleri yüklenmeden sayfaları kopyalamak özellikle iOS/Safari
  // yazdırma ön izlemesinde kırık görsel (?) üretebiliyor. Yerel görseller sunucu
  // tarafında data URI yapılır; kalan görseller için de kısa bir yüklenme beklemesi
  // uygulanır. Süre dolarsa belge yine açılır, hiçbir zaman sonsuz beklemez.
  const startWhenAssetsReady = () => Promise.resolve(window.__printAssetsReady).finally(start);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startWhenAssetsReady, { once: true });
  else startWhenAssetsReady();

  if (document.fonts?.ready) document.fonts.ready.then(() => {
    if (!window.__printPaginationReady) Promise.resolve(window.__printAssetsReady).finally(() => setTimeout(start, 0));
  }).catch(() => {});
})();

// crmv1.7 — public view analytics are browser-confirmed. A raw GET (mail scanner,
// preview bot or print/PDF request) never increments the customer's view count.
(()=>{
  if(!/^\/q\/[^/]+$/.test(location.pathname)||new URLSearchParams(location.search).get("print")==="1")return;
  let sent=false,timer=0;
  const bytes=new Uint8Array(18);crypto.getRandomValues(bytes);
  const pageViewId=Array.from(bytes,value=>value.toString(16).padStart(2,"0")).join("");
  const send=()=>{
    if(sent||document.visibilityState!=="visible")return;
    sent=true;
    fetch(`${location.pathname}/view`,{
      method:"POST",credentials:"omit",cache:"no-store",keepalive:true,
      headers:{"Content-Type":"application/json","X-Requested-With":"public-quote-view"},
      body:JSON.stringify({page_view_id:pageViewId})
    }).catch(()=>{sent=false});
  };
  const schedule=()=>{clearTimeout(timer);if(document.visibilityState==="visible")timer=setTimeout(send,1500)};
  document.addEventListener("visibilitychange",schedule,{passive:true});
  window.addEventListener("pageshow",schedule,{passive:true});
  if(document.readyState==="complete")schedule();else window.addEventListener("load",schedule,{once:true,passive:true});
})();

// Keep monetary values readable without changing line height after pagination.
// Totals have wide columns and are never resized. Only narrow product cells may
// be reduced slightly; a horizontal fit never creates a new line.
setTimeout(()=>{
  const selector='.print-pages td .print-money-v3819,.custom-template-a4 td .manual-money-v3819,.print-source--fallback td .print-money-v3819';
  const fitOne=el=>{
    const cell=el.closest('td')||el.parentElement;if(!cell||cell.clientWidth<4)return;
    el.classList.remove('print-money-wrap-v17');el.style.removeProperty('font-size');el.style.removeProperty('transform');el.style.removeProperty('transform-origin');
    let size=parseFloat(getComputedStyle(el).fontSize)||11.2;const available=Math.max(1,cell.clientWidth-3);
    while((el.scrollWidth>available||el.getBoundingClientRect().width>available)&&size>8.2){size=Math.max(8.2,size-.2);el.style.setProperty('font-size',`${size}px`,'important')}
    if(el.scrollWidth>available){const scale=Math.max(.88,available/el.scrollWidth);el.style.setProperty('transform',`scaleX(${scale})`,'important');el.style.setProperty('transform-origin','right center','important')}
  };
  const run=root=>(root||document).querySelectorAll(selector).forEach(fitOne);
  window.fitProformaMoneyV15=run;
  window.addEventListener('beforeprint',()=>run(document));
  window.addEventListener('print-pagination-ready',()=>run(document));
  if(window.__printPaginationReady)run(document);
  document.fonts?.ready?.then(()=>run(document)).catch(()=>{});
},0);
