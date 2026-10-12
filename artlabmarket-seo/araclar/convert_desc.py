"""Mevcut ürün açıklamalarını tek tip ArtLab şablonuna dönüştürür (satır bazlı ayrıştırma)."""
import json, re, sys, html as H, collections
from bs4 import BeautifulSoup, Comment, NavigableString, Tag

RAW = json.load(open(sys.argv[1]))
ROWS = {str(r['ID']): r for r in json.load(open(sys.argv[2]))}
OUT = sys.argv[3]
OWN = ('artlabmarket.com',)

NOTE = ('<div class="al-pd-note"><strong>ArtLab Market güvencesiyle:</strong> orijinal ürün, faturalı satış, '
        'kurulum ve teknik destek. Fiyat ve teslim süresi için <a href="/Teklif-Formu,DFO-1.html">teklif formunu</a> '
        'doldurun veya <a href="tel:+905323440685">0532 344 06 85</a> numarasından bize ulaşın.</div>')

BULLET = re.compile(r'^\s*(?:[●•·▪■◆►▶✓✔☑√\-–*]|\d{1,2}[.)])\s*')
USES = re.compile(r'kullanım alan|uygulama alan|uygulamalar|kullanım yer|nerelerde', re.I)
PACK = re.compile(r'paket içeri|kutu içeri|teslimat kapsam|standart aksesuar|set içeri|teslim edilen|birlikte verilen', re.I)
FEAT = re.compile(r'özellik|avantaj|öne çıkan|fayda|neden', re.I)
SPEC = re.compile(r'teknik (özellik|veri|bilgi|detay)|spesifikasyon|technical', re.I)
SPEC_HDR = re.compile(r'^(özellik|özellikler|açıklama|parametre|teknik özellik(ler)?|değer|specification|value|model)$', re.I)
KV = re.compile(r'^([^:]{2,45}?)\s*:\s*(.{1,220})$')
BLOCK = {'p', 'div', 'li', 'ul', 'ol', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'tr', 'section', 'article', 'blockquote', 'table'}

def clean(t):
    t = H.unescape(t).replace('\xa0', ' ').replace('​', '').replace('﻿', '')
    t = t.replace('μ', 'µ').replace('（', '(').replace('）', ')')
    t = re.sub(r'\s+', ' ', t).strip()
    t = re.sub(r'\s+([,.;:!?%])', r'\1', t)
    return t.strip(' \t')

def esc(t): return H.escape(t, quote=False)

def norm_key(k):
    k = clean(k).rstrip(':').strip()
    if k.isupper() and len(k) > 4: k = k[0] + k[1:].lower()
    return k

def lines_of(node):
    """Bir düğümün metnini blok/br sınırlarından satırlara ayırır."""
    out, buf = [], []
    def flush():
        s = clean(''.join(buf)); buf.clear()
        if s: out.append(s)
    def walk(n):
        for c in n.children:
            if isinstance(c, Comment): continue
            if isinstance(c, NavigableString): buf.append(str(c)); continue
            if not isinstance(c, Tag): continue
            if c.name == 'br': flush(); continue
            if c.name in ('h1', 'h2', 'h3', 'h4', 'h5', 'h6'):
                flush(); t = clean(c.get_text(' '))
                if t: out.append('##' + t)
                continue
            if c.name == 'li':
                flush(); t = clean(c.get_text(' '))
                if t: out.append('•' + t)
                continue
            if c.name in ('ul', 'ol'): flush(); walk(c); flush(); out.append('§'); continue
            if c.name in BLOCK: flush(); walk(c); flush()
            else: walk(c)
    walk(node); flush()
    return out

def table_kind(tb):
    trs = tb.find_all('tr')
    cells = [tr.find_all(['td', 'th'], recursive=False) for tr in trs]
    cells = [c for c in cells if any(clean(x.get_text(' ')) for x in c)]
    if not cells: return 'empty', cells
    n = [len(c) for c in cells]
    if max(n) == 1: return 'layout', cells
    spans = any(x.get('rowspan') or (x.get('colspan') and x.get('colspan') != '1') for c in cells for x in c)
    two = sum(1 for k in n if k == 2)
    if not spans and two >= len(n) * 0.7: return 'kv', cells
    return 'grid', cells

def grid_html(cells):
    caption, rows = '', cells
    if rows and len(rows[0]) == 1: caption, rows = clean(rows[0][0].get_text(' ')), rows[1:]
    h = ['<div class="al-pd-scroll"><table class="al-pd-spec al-pd-grid">']
    if caption: h.append(f'<caption>{esc(caption)}</caption>')
    h.append('<tbody>')
    for i, r in enumerate(rows):
        h.append('<tr>')
        for c in r:
            attrs = ''.join(f' {a}="{int(c.get(a))}"' for a in ('colspan', 'rowspan') if c.get(a) and str(c.get(a)).isdigit() and int(c.get(a)) > 1)
            tag = 'th' if i == 0 or c.name == 'th' else 'td'
            h.append(f'<{tag}{attrs}>{esc(clean(c.get_text(" ")))}</{tag}>')
        h.append('</tr>')
    h.append('</tbody></table></div>')
    return ''.join(h)

def convert(pid, raw, row):
    name = row['Önerilen Ürün Adı']
    soup = BeautifulSoup(raw or '', 'lxml')
    for t in soup(['script', 'style', 'iframe', 'noscript', 'button', 'form', 'input', 'colgroup']): t.decompose()
    for c in soup.find_all(string=lambda s: isinstance(s, Comment)): c.extract()

    specs, grids, images, ext_images = [], [], [], []
    seen = set()
    def add_spec(k, v):
        k, v = norm_key(k), clean(v)
        if not k or not v or (SPEC_HDR.match(k) and SPEC_HDR.match(v)) or k.lower() in seen: return
        if len(k) > 60: return
        seen.add(k.lower()); specs.append((k, v))

    for img in soup.find_all('img'):
        src = img.get('src') or img.get('data-src') or ''
        if src:
            (images if any(d in src for d in OWN) or src.startswith('/') else ext_images).append(src)
        img.decompose()

    # tablolar: iç içe en içten başla
    for tb in reversed(soup.find_all('table')):
        if tb.find('table'): continue
        kind, cells = table_kind(tb)
        if kind == 'kv':
            for c in cells:
                if len(c) >= 2: add_spec(c[0].get_text(' '), ' / '.join(clean(x.get_text(' ')) for x in c[1:] if clean(x.get_text(' '))))
            tb.decompose()
        elif kind == 'grid':
            grids.append(grid_html(cells)); tb.decompose()
        elif kind == 'layout':
            div = soup.new_tag('div')
            for c in cells:
                inner = soup.new_tag('div'); inner.extend(list(c[0].contents)); div.append(inner)
            tb.replace_with(div)
        else:
            tb.decompose()
    for tb in soup.find_all('table'):  # kalan dış tablolar (yalnızca yerleşim)
        div = soup.new_tag('div')
        for td in tb.find_all(['td', 'th']):
            inner = soup.new_tag('div'); inner.extend(list(td.contents)); div.append(inner)
        tb.replace_with(div)

    lines = lines_of(soup.body or soup)
    lead, feats, uses, pack = [], [], [], []
    ctx = None
    pending_combo = []
    nl, ol = name.lower(), row['Mevcut Ürün Adı'].lower()
    combo = None
    for ln in lines:
        if ln == '§':
            if combo is not None and combo[-1]: combo.append([])
            continue
        is_h = ln.startswith('##')
        is_li = ln.startswith('•')
        t = ln.lstrip('#•').strip()
        if not t: continue
        low = t.lower()
        if low in (nl, ol) or (len(t) > 15 and (low in nl or nl in low) and len(t) < len(nl) + 25 and not KV.match(t)): continue
        if not is_h and re.fullmatch(r'(genel özellikler|avantajlar|kullanım alanları|[\s,&]|ve)+', low): continue
        heading_like = is_h or (not is_li and len(t) <= 60 and not BULLET.match(t) and (t.endswith(':') or (FEAT.search(low) or USES.search(low) or PACK.search(low) or SPEC.search(low))) and not KV.match(t.rstrip(':') + ': x' if False else t) )
        if heading_like and len(t) <= 70:
            combo = None
            if PACK.search(low): ctx = 'pack'
            elif FEAT.search(low) and USES.search(low): ctx = 'combo'; combo = [[]]
            elif USES.search(low): ctx = 'uses'
            elif SPEC.search(low): ctx = 'spec'
            elif FEAT.search(low): ctx = 'feat'
            else: ctx = None
            continue
        m = KV.match(BULLET.sub('', t))
        if m and ctx != 'combo' and (ctx in (None, 'spec') or not is_li) and len(m.group(1).split()) <= 6 and ctx not in ('uses', 'pack'):
            add_spec(m.group(1), m.group(2)); continue
        bullet = is_li or bool(BULLET.match(t))
        item = BULLET.sub('', t).strip()
        if not item: continue
        if ctx == 'combo' and bullet: combo[-1].append(item); continue
        if ctx == 'uses': uses.append(item); continue
        if ctx == 'pack': pack.append(item); continue
        if bullet or (ctx == 'feat' and len(item) < 200) or (len(item) < 110 and not item.endswith('.') and ctx != 'spec' and lead):
            feats.append(item); continue
        if len(item) > 30: lead.append(item)
        elif ctx == 'feat': feats.append(item)

    if combo:
        groups = [g for g in combo if g]
        if len(groups) >= 2: uses.extend(groups[-1]); [feats.extend(g) for g in groups[:-1]]
        elif groups: feats.extend(groups[0])
    # kısa, noktasız "özet" satırları aslında madde işaretidir
    if lead and all(len(x) < 100 and not x.rstrip().endswith('.') for x in lead):
        feats = lead + feats; lead = []

    def uniq(xs, lim=None):
        out, s = [], set()
        for x in xs:
            x = x.strip(' ;,')
            k = re.sub(r'\W+', '', x.lower())
            if k in s or len(x) < 3: continue
            s.add(k); out.append(x[0].upper() + x[1:])
        return out[:lim] if lim else out
    lead, feats, uses, pack = uniq(lead, 4), uniq(feats, 16), uniq(uses, 14), uniq(pack, 14)

    base = []
    if row['Marka'] and 'marka' not in seen: base.append(('Marka', row['Marka']))
    if not any(k.lower() in ('model', 'model no', 'model numarası', 'ürün kodu', 'katalog no', 'kod') for k, _ in specs):
        base.append(('Model / Ürün Kodu', row['Stok Kodu']))
    allspecs = base + specs

    status = []
    if not lead:
        lead = [f'{name}; {row["_fayda"]} için tasarlanmış {row["Marka"] + " " if row["Marka"] and not name.startswith(row["Marka"]) else ""}{row["_tip"]} modelidir. Teknik özellikler, kullanım alanları ve fiyat teklifi için aşağıdaki bilgileri inceleyin.']
        status.append('Özet metni yok (otomatik cümle eklendi)')
    if len(specs) < 3 and not grids: status.append('Teknik özellik tablosu eksik')
    if not feats: status.append('Öne çıkan özellik listesi yok')
    if ext_images: status.append(f'Başka siteden {len(ext_images)} görsel çekiyordu (kaldırıldı)')

    out = ['<div class="al-pd">', f'<p class="al-pd-lead">{esc(lead[0])}</p>']
    out += [f'<p>{esc(p)}</p>' for p in lead[1:]]
    out.append('<h2 class="al-pd-h">Teknik Özellikler</h2>')
    out.append('<table class="al-pd-spec"><tbody>' + ''.join(f'<tr><th>{esc(k)}</th><td>{esc(v)}</td></tr>' for k, v in allspecs) + '</tbody></table>')
    out += grids
    if feats: out.append('<h2 class="al-pd-h">Öne Çıkan Özellikler</h2><ul class="al-pd-list">' + ''.join(f'<li>{esc(x)}</li>' for x in feats) + '</ul>')
    if uses: out.append('<h2 class="al-pd-h">Kullanım Alanları</h2><ul class="al-pd-list">' + ''.join(f'<li>{esc(x)}</li>' for x in uses) + '</ul>')
    if pack: out.append('<h2 class="al-pd-h">Paket İçeriği</h2><ul class="al-pd-list">' + ''.join(f'<li>{esc(x)}</li>' for x in pack) + '</ul>')
    out.append(NOTE)
    out.append('</div>')
    return '\n'.join(out), status, len(specs), ext_images

if __name__ == '__main__':
    res = {}
    for pid, raw in RAW.items():
        h, st, n, ext = convert(pid, raw, ROWS[pid])
        res[pid] = {'html': h, 'status': st, 'spec_rows': n, 'ext_images': ext}
    json.dump(res, open(OUT, 'w'), ensure_ascii=False)
    c = collections.Counter(s.split(' (')[0] if 'görsel' not in s else 'Dış görsel' for v in res.values() for s in v['status'])
    print(len(res), 'tam:', sum(not v['status'] for v in res.values()), dict(c))
