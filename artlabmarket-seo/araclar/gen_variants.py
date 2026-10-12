"""Varyant alt ürünlerini bağımsız ürün satırlarına dönüştürür."""
import json, re, sys, html as H

src = open('tools/gen_products.py').read().split('bodies = collections.Counter')[0]
sys.argv = ['x', 'site/product.json', '/dev/null']
exec(src)

V = json.load(open('site/variants.json'))
ROWS = {str(r['ID']): r for r in json.load(open('site/rows.json'))}
NEW = json.load(open('site/newdesc.json'))

UNIT = {'LT': 'Litre', 'ML': 'mL', 'µl': 'µL', 'MM': 'mm', 'CM': 'cm', 'C': '°C'}
LABEL = {'LT': 'Hacim', 'ML': 'Hacim', 'µl': 'Hacim Aralığı', 'MM': 'Ölçü', 'CM': 'Ölçü', 'Renk': 'Renk', 'C': 'Ölçüm Aralığı'}
TRMAP = str.maketrans('İıŞşĞğÜüÖöÇç', 'IiSsGgUuOoCc')

def fix_value(val, gtitle):
    v = re.sub(r'\s+', ' ', val).strip().replace('µl', 'µL').replace('μ', 'µ')
    v = re.sub(r'(?i)(\d)\s*ml\b', r'\1 mL', v); v = re.sub(r'(?i)(\d)\s*mm\b', r'\1 mm', v)
    v = re.sub(r'(?i)(\d)\s*µL\b', r'\1 µL', v)
    v = re.sub(r'(?i)\bçif kapaklı', 'çift kapaklı', v)
    v = {'Amelist': 'Ametist', 'Azure': 'Azur', 'Orenga/portakal': 'Turuncu', 'Lime Yeşil Limon': 'Lime Yeşil'}.get(v, v)
    if re.fullmatch(r'0*\d+', v): v = str(int(v))
    unit = UNIT.get(gtitle, '')
    if unit and re.search(r'\d$', v) and not re.search(r'[a-zA-Zµ°]\s*$', v):
        v = f'{v} {unit}'
    v = re.sub(r'(?i)^analog\s+', 'Analog ', v); v = re.sub(r'(?i)^dijital\s+', 'Dijital ', v)
    return v

def strip_codes(name):
    # ad sonundaki katalog numarası dizilerini ve sondaki tekil kodları temizle
    name = re.sub(r'(\s*[-/]?\s*\b\d{5,}\b)+\s*$', '', name)
    name = re.sub(r'\s+-\s*$', '', name)
    return name.strip()

SPEC_BY_GROUP = {
    'ML': r'(?:\d+\s*x\s*)?[\d.,]+\s*(?:-\s*[\d.,]+\s*)?(?:ml|mL)\b',
    'µl': r'[\d.,]+\s*(?:-\s*[\d.,]+\s*)?(?:µL|µl)\b',
    'LT': r'\b\d+\s*(?:lt|litre)\b\.?',
    'RPM / KG': r'[\d.,]+\s*(?:rpm|kg)\b',
}
def clean_base(base, gtitle, val, psku, pname_codes):
    b = re.sub(r'(?i)\bRS\s*232\b', 'RS232', base)
    b = re.sub(r'(\d\s?ml)([A-ZÇŞĞÜÖİ])', r'\1 \2', b)
    for c in [psku] + pname_codes:
        if c: b = re.sub(r'(?<![\w-])' + re.escape(c.strip()) + r'(?![\w-])', '', b)
    pat = SPEC_BY_GROUP.get(gtitle)
    if pat: b = re.sub(pat, '', b, flags=re.I)
    b = re.sub(r'(?i)\b(veya)\b(?=\s*($|[/-]))', '', b)
    b = re.sub(r'(?i)\banalog\s*/\s*dijital\b', '', b)
    b = re.sub(r'(?i)\bset\b\s*$', '', b) if gtitle.endswith('NCM') else b
    b = re.sub(r'(?<!\w)' + re.escape(val) + r'(?!\w)', '', b, flags=re.I)
    b = re.sub(r'(?i)\s*\(?özel renkler\)?', '', b) if gtitle == 'Renk' else b
    b = re.sub(r'(\s*[/,]\s*){2,}', ' / ', b)
    b = re.sub(r'\s[/,](?=[A-Za-zÇŞĞÜÖİçşğüöı])', ' ', b)
    b = re.sub(r'^\s*[/\-–,]\s*|\s*[/\-–,]\s*$', '', b)
    b = re.sub(r'\s[/\-–]\s(?=\D)', ' ', b) if gtitle in ('ML', 'µl') else b
    b = re.sub(r'\s*\(\s*\)', '', b)
    b = re.sub(r'\s+(Veya|ve|x)\s*$', '', b, flags=re.I)
    return re.sub(r'\s+', ' ', b).strip(' -/–,')

UNITS = {'ml', 'mL', 'µL', 'µl', 'mm', 'cm', 'x', 'X', 'veya', 've', 'adet', 'Litre', '°C'}
def tcase(v):
    v = re.sub(r'\(\s+', '(', v); v = re.sub(r'\s+\)', ')', v)
    return ' '.join(w if (re.search(r'\d', w) or w in UNITS or len(w) < 3 or not (w[:1].islower() or (w.isupper() and len(w) > 3))) else tr_title(w) for w in v.split(' '))

def merge_name(base, val, gtitle=''):
    if gtitle == 'Renk': return f'{base} {val}'
    words = base.split(' ')
    vw = {w.lower() for w in re.findall(r'\w+', val)}
    # varyantta tekrar eden kelimeleri ana addan çıkar (ör. "Otomatik Pipet")
    if len(vw) >= 3:
        words = [w for w in words if w.lower().strip('(),') not in vw or w == words[0]]
    i = next((k for k, w in enumerate(words) if k > 0 and (re.match(r'^[+\-–~]?\d', w) or w in ('/', '…'))), len(words))
    return re.sub(r'\s+', ' ', ' '.join(words[:i] + [val] + words[i:])).strip()

def new_sku(psku, val, gtitle, codes, sibling_nums):
    p = psku.strip()
    if len(codes) >= 2:
        return '', 'Ana üründe birden çok katalog no var (' + ', '.join(codes) + '): doğru kodu üretici listesinden eşleştirin'
    num = re.match(r'^\D*?(\d+)(?![.,]\d)', val)
    segs = re.split(r'([-. ])', p)
    if num and gtitle in ('ML', 'MM', 'LT', 'C') and sibling_nums:
        for i in range(len(segs) - 1, 0, -1):
            sg = segs[i]
            if sg.isdigit() and int(sg) in sibling_nums:
                w = max(len(sg), 3) if sg.startswith('0') else len(sg)
                segs[i] = str(int(num.group(1))).zfill(w)
                return ''.join(segs).translate(TRMAP).upper().replace(' ', '-'), 'Kod kalıbından türetildi – doğrulayın'
    base = p.translate(TRMAP).upper().replace(' ', '-')
    if gtitle == 'C':
        nums = re.findall(r'\d+', val)
        last = re.search(r'-(\d+)$', base)
        if last and last.group(1) in nums: base = base[:last.start()]
        suf = '-'.join(nums)
    elif '/' in val or re.search(r'\d+\s*[xX]\s*\d+', val):
        n = re.search(r'\d+', val); suf = n.group(0) if n else ''
    else:
        suf = val.translate(TRMAP).upper()
        suf = re.sub(r'\b(LITRE|ML|MM|CM|UL|µL|°C)\b', '', suf)
        suf = re.sub(r'[^A-Z0-9]+', '-', suf).strip('-')
        suf = {'OZEL-OLCU': 'OZEL'}.get(suf, suf)[:12].strip('-')
    return f'{base}-{suf}', 'Yeni kod önerisi (ana kod + varyant) – doğrulayın'

def slugify(s):
    s = s.translate(TRMAP).lower().replace('µ', 'u').replace('°c', 'c').replace('+', '')
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')[:90]

out = []
for v in V:
    pid = str(v['parent_id'])
    prow = ROWS.get(pid)
    if not prow: continue
    gtitle = v['groups'][0]['title']
    pname_codes = re.findall(r'\b\d{5,}\b', v['parent_name'] + ' ' + v['parent_sku'])
    codes = sorted(set(re.findall(r'\b\d{5,}\b', v['parent_name'] + ' ' + v['parent_sku'])))
    sib = set()
    for c in v['children']:
        m = re.match(r'^\D*?(\d+)(?![.,]\d)', c['variant_name'].strip())
        if m: sib.add(int(m.group(1)))
    raw_base = prow['Önerilen Ürün Adı']
    for c in sorted(v['children'], key=lambda c: c['product_id']):
        val = tcase(fix_value(c['variant_name'], gtitle))
        base = clean_base(raw_base, gtitle, val, v['parent_sku'], pname_codes)
        # "CLASS 1 / 120" gibi birleşik değerler
        if '/' in val and gtitle.startswith('CLASS'):
            a, b = [x.strip() for x in val.split('/', 1)]
            b = b if not re.fullmatch(r'\d+', b) else f'{b} cm'
            val = f'Class {"I" if a.endswith("1") else "II"} {b}'
            base = re.sub(r'(?i)\s*class\s*ii?\b', '', base)
        name = merge_name(base, val, gtitle)
        sku, sku_note = new_sku(v['parent_sku'], val, gtitle, codes, sib)
        if sku and sku.replace('-', '') not in name.translate(TRMAP).upper().replace('-', '').replace(' ', ''):
            name = f'{name} {sku}'
        pr = c.get('product_price') or {}
        brand = prow['Marka']
        tlabel, benefit = prow['_tip'], prow['_fayda']
        desc = NEW.get(pid, {}).get('html', '')
        label = LABEL.get(gtitle, 'Seçenek')
        spec_row = f'<tr><th>{H.escape(label)}</th><td>{H.escape(val)}</td></tr>'
        desc = re.sub(r'(<tr><th>Model / Ürün Kodu</th><td>)[^<]*(</td></tr>)', lambda m: m.group(1) + H.escape(sku or c['product_sku']) + m.group(2) + spec_row, desc, count=1)
        if spec_row not in desc:
            desc = desc.replace('<table class="al-pd-spec"><tbody>', '<table class="al-pd-spec"><tbody>' + spec_row, 1)
        out.append({
            'Ana Ürün ID': int(pid), 'Ana Ürün Adı': prow['Mevcut Ürün Adı'], 'Ana Ürün URL': v['parent_url'],
            'Varyant Grubu': gtitle, 'Varyant Değeri': c['variant_name'].strip(),
            'Mevcut Alt Ürün ID': c['product_id'], 'Mevcut Alt Ürün Stok Kodu': c['product_sku'],
            'Mevcut Alt Ürün URL': 'https://www.artlabmarket.com' + c['product_url'],
            'Yeni Ürün Adı': name, 'Yeni Stok Kodu': sku, 'Stok Kodu Notu': sku_note,
            'SEO Başlık': seo_title(name), 'Meta Açıklama': meta_desc(name, brand, tlabel, benefit, bool(pr.get('price')), c['product_id']),
            'Önerilen URL': slugify(name), 'Marka': brand, 'Kategori': prow['Kategori'],
            'Fiyat (KDV hariç)': round(pr.get('price', 0) / (pr.get('currency_rate') or 1), 2) if pr.get('price') else '',
            'Fiyat TL (KDV hariç)': round(pr.get('price', 0), 2) if pr.get('price') else 'Teklif',
            'KDV %': pr.get('tax', ''), 'Stok Adedi': c.get('product_stock_amount', ''),
            **{f'Görsel {i+1}': ('https:' + u if u.startswith('//') else u) for i, u in enumerate(c['images'][:8])},
            'Açıklama HTML': desc,
        })
json.dump(out, open('site/variant_rows.json', 'w'), ensure_ascii=False)
print(len(out), 'satır;', sum(1 for r in out if not r['Yeni Stok Kodu']), 'kod eşleştirilmeli')
