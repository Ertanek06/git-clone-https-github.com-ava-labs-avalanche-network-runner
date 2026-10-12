import json, re, sys, collections

P = json.load(open(sys.argv[1]))
OUT = sys.argv[2]

BRANDS = {
    'dlab': 'DLAB', 'dlap': 'DLAB', 'ohaus': 'OHAUS', 'mettler toledo': 'Mettler Toledo', 'ika': 'IKA',
    'milwaukee': 'Milwaukee', 'mi̇lwaukee': 'Milwaukee', 'velp': 'VELP', 'memmert': 'Memmert', 'binder': 'BINDER',
    'kern': 'KERN', 'radwag': 'Radwag', 'merck': 'Merck', 'biobase': 'Biobase', 'levenhuk': 'Levenhuk',
    'emsaş': 'Emsaş', 'arteva': 'Arteva', 'isolab': 'ISOLAB', 'brand': 'BRAND', 'hanna': 'Hanna', 'precisa': 'Precisa',
    'magus': 'MAGUS', 'optika': 'OPTIKA', 'tfa': 'TFA', 'mikrotest': 'Mikrotest', 'az': 'AZ',
}
ACR = {'PH': 'pH', 'RPM': 'rpm', 'ORP': 'ORP', 'TDS': 'TDS', 'LCD': 'LCD', 'UV': 'UV', 'CO2': 'CO2', 'PID': 'PID',
       'ESD': 'ESD', 'DIN': 'DIN', 'ISO': 'ISO', 'AS': 'AS', 'A': 'A', 'B': 'B', 'LED': 'LED', 'USB': 'USB', 'HD': 'HD',
       'VIS': 'VIS', 'UV-VIS': 'UV-VIS', 'II': 'II', 'I': 'I', 'III': 'III', 'LT': 'Litre', 'LT.': 'Litre', 'ML': 'mL',
       'GR': 'g', 'KG': 'kg', 'MM': 'mm', 'CM': 'cm', 'NM': 'nm', 'DK': 'dk', 'IP65': 'IP65', 'IP67': 'IP67'}
SMALL = {'VE': 've', 'İLE': 'ile', 'İÇİN': 'için', 'VEYA': 'veya', 'DE': 'de', 'DA': 'da'}
TYPO = {'Lamınar': 'Laminar', 'Sıeve': 'Sieve', 'Prp': 'Pro', 'Portatİif': 'Portatif', 'Dahi ': 'Dahil ', 'Tungsten Ve': 'Tungsten ve', 'karıştırıcı': 'Karıştırıcı'}

def tr_upper_ratio(s):
    letters = [c for c in s if c.isalpha()]
    return sum(c.isupper() for c in letters) / max(1, len(letters))

def tr_title(w):
    if not w: return w
    lw = w.replace('I', 'ı').replace('İ', 'i').lower()
    f = lw[0]
    f = 'İ' if f == 'i' else ('I' if f == 'ı' else f.upper())
    return f + lw[1:]

def clean_name(n):
    s = n.strip()
    for a, b in TYPO.items(): s = s.replace(a, b)
    s = s.replace('μ', 'µ').replace('⁰C', '°C').replace('⁰', '°')
    s = re.sub(r'µ[lL]\b', 'µL', s); s = re.sub(r'(\d)X(\d)', r'\1x\2', s)
    s = s.replace('ºC', '°C').replace('º C', '°C').replace('℃', '°C').replace('˚C', '°C').replace('µl', 'µL').replace('μL', 'µL')
    s = re.sub(r'\s*\.\.\.?\s*', ' … ', s)
    s = re.sub(r'\(\s+', '(', s); s = re.sub(r'\s+\)', ')', s)
    s = re.sub(r'\s+', ' ', s).strip()
    if s.count('(') > s.count(')'): s += ')'
    if tr_upper_ratio(s) > 0.8:
        out = []
        for w in s.split(' '):
            core = w.strip('(),')
            if core in ACR: nw = w.replace(core, ACR[core])
            elif core in SMALL: nw = w.replace(core, SMALL[core])
            elif re.search(r'\d', core) or len(core) <= 1: nw = w
            else: nw = w.replace(core, tr_title(core))
            out.append(nw)
        s = ' '.join(out)
    # brand normalisation at start
    first = s.split(' ')[0].lower()
    two = ' '.join(s.split(' ')[:2]).lower()
    if two in BRANDS: s = BRANDS[two] + s[len(two):]
    elif first in BRANDS: s = BRANDS[first] + s[len(first):]
    s = re.sub(r'\bPh\b', 'pH', s); s = re.sub(r'\bRpm\b', 'rpm', s)
    s = re.sub(r' Ve ', ' ve ', s); s = re.sub(r'\bIyon', 'İyon', s); s = re.sub(r'\bIsıt', 'Isıt', s)
    return s

TYPES = [  # keyword, type label, benefit
    ('dispens', 'dispenser', 'şişeden doğrudan hassas ve güvenli sıvı dağıtımı'),
    ('rotary evaporatör', 'rotary evaporatör', 'çözücülerin hızlı ve kontrollü buharlaştırılması'),
    ('mikroplaka okuyucu', 'ELISA mikroplaka okuyucu', 'ELISA testlerinde hızlı ve doğru absorbans okuma'),
    ('homojenizatör', 'homojenizatör', 'numunelerin hızlı ve homojen dağıtılması'),
    ('thermocycler', 'PCR termal döngüleyici', 'PCR uygulamalarında hassas sıcaklık döngüsü'),
    ('termal döngü', 'PCR termal döngüleyici', 'PCR uygulamalarında hassas sıcaklık döngüsü'),
    ('thermo mix', 'termo karıştırıcı', 'tüplerde eş zamanlı ısıtma ve karıştırma'),
    ('elektroforez', 'elektroforez güç kaynağı', 'jel elektroforezinde stabil güç'),
    ('aspirasyon', 'vakum aspirasyon sistemi', 'sıvı atıkların güvenli vakumla toplanması'),
    ('laminar', 'laminar flow kabini', 'partikülsüz ve steril çalışma alanı'),
    ('güvenlik kabini', 'mikrobiyolojik güvenlik kabini', 'kullanıcı, numune ve çevre koruması'),
    ('pcr çalışma', 'PCR çalışma kabini', 'kontaminasyonsuz PCR hazırlığı'),
    ('distile', 'su distile cihazı', 'laboratuvar için saf distile su üretimi'),
    ('saf su', 'ultra saf su sistemi', 'analizlere uygun ultra saf su üretimi'),
    ('sirkülatör', 'soğutmalı sirkülatör', 'harici cihazlar için stabil sıcaklık kontrolü'),
    ('orp', 'ORP ölçer', 'hızlı ve doğru ORP ölçümü'),
    ('tds', 'TDS ölçer', 'hızlı ve doğru TDS ölçümü'),
    ('tuzluluk', 'tuzluluk ölçer', 'hızlı ve doğru tuzluluk ölçümü'),
    ('büyüteç', 'büyüteç', 'detaylı ve net inceleme'),
    ('kronometre', 'kronometre', 'deneylerde hassas süre ölçümü'),
    ('saat -', 'laboratuvar saati', 'deneylerde hassas süre takibi'),
    ('krikosu', 'laboratuvar krikosu', 'düzeneklerde hassas yükseklik ayarı'),
    ('maşa', 'kroze maşası', 'sıcak kroze ve kapların güvenli taşınması'),
    ('kıskaç', 'kıskaç', 'düzeneklerin güvenli sabitlenmesi'),
    ('puar', 'puar', 'pipetlerle güvenli sıvı çekme'),
    ('bunsen', 'bunsen beki', 'laboratuvarda kontrollü alevle ısıtma'),
    ('soxhlet', 'soxhlet ekstraksiyon ekipmanı', 'katı numunelerden verimli ekstraksiyon'),
    ('elek sallama', 'elek sallama cihazı', 'tane boyutu analizinde doğru sonuç'),
    ('eleği', 'analiz eleği', 'tane boyutu analizinde doğru sonuç'),
    ('sieve', 'elek sallama cihazı', 'tane boyutu analizinde doğru sonuç'),
    ('nem ölç', 'nem ölçüm cihazı', 'tahıl ve numunelerde hızlı nem ölçümü'),
    ('rutubet', 'nem ölçüm cihazı', 'tahıl ve numunelerde hızlı nem ölçümü'),
    ('moisture', 'nem tayin cihazı', 'numunelerde hızlı ve doğru nem analizi'),
    ('yoğunluk', 'yoğunluk ölçer', 'sıvılarda hızlı ve doğru yoğunluk ölçümü'),
    ('havan', 'havan ve eli', 'numunelerin homojen öğütülmesi'),
    ('değirmen', 'öğütme değirmeni', 'numunelerin hızlı ve homojen öğütülmesi'),
    ('termohigrometre', 'termohigrometre', 'ortam sıcaklık ve nem takibi'),
    ('hematoloji', 'hematoloji analizörü', 'hızlı ve güvenilir kan sayımı'),
    ('parlama noktası', 'parlama noktası tayin cihazı', 'standartlara uygun parlama noktası tayini'),
    ('penetr', 'penetrasyon test cihazı', 'standartlara uygun penetrasyon testi'),
    ('azot protein', 'azot/protein analiz cihazı', 'Kjeldahl yöntemiyle azot ve protein tayini'),
    ('test cihaz', 'malzeme test cihazı', 'standartlara uygun malzeme testleri'),
    ('test presi', 'beton test presi', 'standartlara uygun basınç dayanım testleri'),
    ('beton', 'beton test ekipmanı', 'standartlara uygun beton testleri'),
    ('profometer', 'donatı tespit cihazı', 'betonda donatı çapı ve paspayı ölçümü'),
    ('elektrod', 'elektrot', 'hassas ve stabil ölçüm'),
    ('sallayıcı', 'sallayıcı', 'numunelerde düzenli ve nazik karıştırma'),
    ('analitik terazi', 'analitik terazi', '0,1 mg hassasiyetle güvenilir tartım'),
    ('hassas terazi', 'hassas terazi', 'laboratuvar ve üretimde hızlı, tekrarlanabilir tartım'),
    ('terazi', 'terazi', 'doğru ve tekrarlanabilir tartım'),
    ('nem tayin', 'nem tayin cihazı', 'numunelerde hızlı ve doğru nem analizi'),
    ('pipet', 'pipet', 'hassas ve tekrarlanabilir sıvı transferi'),
    ('manyetik karıştırıcı', 'manyetik karıştırıcı', 'homojen ve stabil karıştırma'),
    ('mekanik karıştırıcı', 'mekanik karıştırıcı', 'yüksek viskoziteli numunelerde güçlü karıştırma'),
    ('vorte', 'vorteks karıştırıcı', 'tüp ve küçük hacimlerde hızlı karıştırma'),
    ('çalkalayıcı', 'çalkalayıcı', 'kültür ve numunelerde düzenli çalkalama'),
    ('santrifüj', 'santrifüj', 'hızlı ve güvenli numune ayrıştırma'),
    ('soğutmalı inkübatör', 'soğutmalı inkübatör', 'düşük sıcaklıklarda stabil inkübasyon'),
    ('co² inkübatör', 'CO2 inkübatör', 'hücre kültürü için kontrollü CO2 ortamı'),
    ('co2 inkübatör', 'CO2 inkübatör', 'hücre kültürü için kontrollü CO2 ortamı'),
    ('inkübatör', 'inkübatör', 'mikrobiyoloji ve kültür çalışmalarında stabil sıcaklık'),
    ('etüv', 'etüv', 'kurutma ve sterilizasyonda homojen ısı dağılımı'),
    ('kül fırın', 'kül fırını', 'yüksek sıcaklıkta yakma ve kül tayini'),
    ('fırın', 'laboratuvar fırını', 'yüksek sıcaklık uygulamalarında hassas kontrol'),
    ('otoklav', 'otoklav', 'güvenli ve etkin buhar sterilizasyonu'),
    ('klimatik', 'klimatik test kabini', 'sıcaklık ve nem testlerinde standartlara uygun ortam'),
    ('iklimlendirme', 'iklimlendirme test kabini', 'sıcaklık ve nem testlerinde kontrollü ortam'),
    ('çeker ocak', 'çeker ocak', 'zararlı buhar ve gazlara karşı güvenli çalışma'),
    ('biyogüvenlik', 'biyogüvenlik kabini', 'kullanıcı, numune ve çevre koruması'),
    ('derin dondurucu', 'derin dondurucu', 'numunelerin güvenli uzun süreli saklanması'),
    ('aşı', 'aşı ve ilaç saklama dolabı', 'aşı ve ilaçlarda kesintisiz soğuk zincir'),
    ('yangına dayanıklı', 'yangına dayanıklı dolap', 'yanıcı kimyasallar için sertifikalı koruma'),
    ('kimyasal saklama', 'kimyasal saklama dolabı', 'kimyasalların güvenli ve düzenli depolanması'),
    ('spektrofotometre', 'spektrofotometre', 'hassas absorbans ve konsantrasyon ölçümü'),
    ('fotometre', 'fotometre', 'hızlı ve hassas fotometrik analiz'),
    ('mikrosko', 'mikroskop', 'net ve detaylı görüntüleme'),
    ('teleskop', 'teleskop', 'net ve parlak gözlem'),
    ('kan saklama', 'kan saklama dolabı', 'kan ürünlerinin güvenli soğuk saklanması'),
    ('ph metre', 'pH metre', 'hızlı ve doğru pH ölçümü'),
    ('ph / iyon', 'pH / iyon ölçer', 'hassas pH ve iyon ölçümü'),
    ('iletkenlik', 'iletkenlik ölçer', 'iletkenlik ve TDS ölçümünde yüksek doğruluk'),
    ('oksijen', 'çözünmüş oksijen ölçer', 'çözünmüş oksijen ölçümünde yüksek doğruluk'),
    ('refraktometre', 'refraktometre', 'Brix ve kırılma indisi ölçümü'),
    ('termometre', 'termometre', 'hızlı ve güvenilir sıcaklık ölçümü'),
    ('ultrasonik', 'ultrasonik banyo', 'hassas parçaların etkin temizliği'),
    ('su banyo', 'su banyosu', 'numunelerin homojen ısıtılması'),
    ('ısıtıcı tabla', 'ısıtıcı tabla', 'güvenli ve homojen ısıtma'),
    ('hot plate', 'ısıtıcı tabla', 'güvenli ve homojen ısıtma'),
    ('kuru blok', 'kuru blok ısıtıcı', 'tüplerde hassas sıcaklık kontrolü'),
    ('jar test', 'jar test cihazı', 'su arıtmada koagülasyon ve flokülasyon testleri'),
    ('bitki büyütme', 'bitki büyütme kabini', 'ışık, sıcaklık ve nem kontrollü yetiştirme'),
    ('tezgah', 'laboratuvar tezgahı', 'dayanıklı ve ergonomik çalışma alanı'),
    ('masa', 'laboratuvar masası', 'dayanıklı ve ergonomik çalışma alanı'),
    ('desikatör', 'desikatör', 'numunelerin nemden korunarak saklanması'),
    ('erlen', 'erlenmayer', 'karıştırma, titrasyon ve kültür çalışmaları'),
    ('beher', 'beher', 'genel laboratuvar ölçüm ve karıştırma işlemleri'),
    ('mezür', 'mezür', 'hassas hacim ölçümü'),
    ('büret', 'büret', 'hassas titrasyon'),
    ('balon', 'balon', 'çözelti hazırlama ve ısıtma'),
    ('huni', 'huni', 'güvenli sıvı aktarımı ve ayırma'),
    ('tüp', 'tüp', 'numune hazırlama ve saklama'),
    ('cam', 'laboratuvar cam malzemesi', 'kimyasal dayanımlı laboratuvar kullanımı'),
    ('solution', 'kimyasal çözelti', 'analiz ve mikroskopi uygulamaları'),
]
CHEM_HINT = re.compile(r'\b(acid|solution|sodium|potassium|merck|chloride|sulfate|reagent|indicator|buffer)\b', re.I)

def detect_type(name, crumbs):
    ln = name.replace('İ', 'i').replace('I', 'ı').lower()
    ln = ln.replace('ph', 'ph').replace('co²', 'co2')
    for k, t, b in TYPES:
        if k in ln: return t, b
    if re.search(r'\bpH\b', name): return 'pH ölçer', 'hızlı ve doğru pH ölçümü'
    if CHEM_HINT.search(name) or 'Kimyasal' in crumbs: return 'kimyasal', 'analiz ve araştırmalar için yüksek saflık'
    leaf = crumbs[-1] if crumbs else ''
    return 'laboratuvar ekipmanı', 'laboratuvar uygulamalarında güvenilir performans'

def brand_of(p, name):
    for l in p['ld']:
        if isinstance(l, dict) and l.get('@type') == 'Product' and l.get('brand'):
            b = l['brand'].get('name', '')
            return BRANDS.get(b.lower(), b)
    f = name.split(' ')[0]
    return BRANDS.get(f.lower(), '')

def strip_parens(x):
    prev = None
    while prev != x:
        prev = x; x = re.sub(r'\s*\([^()]*\)', '', x)
    x = re.sub(r'\s*[()]', '', x)
    x = re.sub(r'\s*\|.*$', '', x)
    return re.sub(r'\s+', ' ', x).strip(' -–,/')

FILLER = {'Ayarlanabilir', 'Otoklavlanabilir', 'Profesyonel', 'Ekonomik', 'Ultra', 'Portatif', 'Masa', 'Tipi',
          'Dijital', 'Gelişmiş', 'Yüksek', 'Performanslı', 'Kompakt', 'Seti', 'Set', 'Ekranlı', '-'}

MODEL = re.compile(r'^(?=.*\d)(?=.*[A-Za-z])[A-Za-z0-9.\-/]{3,}$')

def seo_title(name):
    core = strip_parens(name)
    for suf in (' | ArtLab Market', ' | ArtLab'):
        if len(core) + len(suf) <= 60: return core + suf
    lean = ' '.join(w for w in core.split(' ') if w not in FILLER)
    for suf in (' | ArtLab', ''):
        if len(lean) + len(suf) <= 60: return lean + suf
    core = lean
    words = core.split(' ')
    model = next((w for w in reversed(words) if MODEL.match(w) and not re.match(r'^[\d.,/+-]+$', w)), '')
    body = [w for w in words if w != model] if model else words
    suf = ' | ArtLab'
    while body:
        cand = ' '.join(body).strip(' -–,/…') + ((' ' + model) if model else '')
        if len(cand) + len(suf) <= 60 and not body[-1].lower() in ('ve', 'ile', '/', '-', '–', '…', '+'):
            return cand + suf
        body = body[:-1]
    return core[:57].rsplit(' ', 1)[0]

def meta_desc(name, brand, tlabel, benefit, has_price, pid):
    short = strip_parens(name)
    if len(short) > 75: short = seo_title(name).rsplit(' | ', 1)[0]
    cta = ['Hemen fiyat teklifi alın.', 'Uzman ekibimizden teklif isteyin.', 'Aynı gün teklif alın.'][int(pid) % 3]
    trust = []
    if brand: trust.append(f'Orijinal {brand}')
    trust += ['faturalı satış', 'kurulum ve teknik destek']
    trust[0] = trust[0][0].upper() + trust[0][1:]
    lead = f'{short}: {benefit}.'
    opts = [
        f'{lead} {", ".join(trust)} ArtLab Market\'te. {cta}',
        f'{lead} {", ".join(trust[:2])} ve teknik destek. {cta}',
        f'{lead} Teknik destek ve hızlı teslimat. {cta}',
        f'{lead} {cta}',
    ]
    for o in opts:
        o = o.replace('..', '.')
        if len(o) <= 155: return o
    # name too long: shorten lead
    s2 = seo_title(name).rsplit(' | ', 1)[0]
    o = f'{s2}: {benefit}. {cta}'
    return o if len(o) <= 155 else o[:152].rsplit(' ', 1)[0] + '…'

def prod_ld(p):
    return next((l for l in p['ld'] if isinstance(l, dict) and l.get('@type') == 'Product'), {})

bodies = collections.Counter(p['bodytext'][:400] for p in P if p['bodytext'])
titles = collections.Counter(p['title'] for p in P)
rows = []
for p in P:
    raw = p['h1'][0] if p['h1'] else p['title'].rsplit(' | ', 1)[0]
    name = clean_name(raw)
    crumbs = [c for c in p['crumbs'] if c and c != 'Anasayfa']
    brand = brand_of(p, name)
    tlabel, benefit = detect_type(name, crumbs)
    sku = p['sku'].strip()
    nsku = re.sub(r'[^A-Z0-9]', '', sku.upper().replace('İ', 'I'))
    nname = re.sub(r'[^A-Z0-9]', '', name.upper().replace('İ', 'I'))
    sku_ok = bool(re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9.\-/]{2,24}', sku)) and not re.search(r'[a-zçğışöü]{4,}', sku) and '_' not in sku
    code_note = ''
    if nsku and nsku not in nname:
        UNIT = re.compile(r'^[\d.,]+(?:x[\d.,]+)*(?:mm|cm|ml|mL|lt|l|g|gr|kg|µL|rpm|°C|nm|W|V|Hz|li|lik|luk)?$', re.I)
        near = [w for w in re.findall(r'(?<![\w-])[A-Z0-9][A-Za-z0-9.\-/]{2,}(?![\w-])', name)
                if re.search(r'\d', w) and re.search(r'[A-Z]', w) and not UNIT.match(w) and not re.match(r'^C\.I\.', w)
                and sum(c.isupper() for c in w if c.isalpha()) >= sum(c.isalpha() for c in w) * 0.6]
        if near and sku_ok:
            code_note = f'Adda farklı kod var ({", ".join(near[:2])}) – stok kodu {sku}: hangisi doğru kontrol edin'
        elif sku_ok:
            name = f'{name} {sku}'
            code_note = 'Model kodu ürün adına eklendi'
    words = len(p['bodytext'].split())
    ld = prod_ld(p)
    issues = []
    if not ld: issues.append('Product şeması yok')
    elif 'availability' not in ld.get('offers', {}): issues.append('Şemada stok durumu yok')
    if not brand: issues.append('Marka atanmamış')
    if words < 50: issues.append('Açıklama çok kısa (<50 kelime)')
    elif words < 150: issues.append('Açıklama kısa (<150 kelime)')
    if p['bodytext'] and bodies[p['bodytext'][:400]] > 1: issues.append(f'Açıklama {bodies[p["bodytext"][:400]]} üründe aynı')
    if titles[p['title']] > 1: issues.append('Başlık başka ürünle aynı')
    if len(p['title']) > 60: issues.append('SEO başlığı 60 karakterden uzun')
    if 'degc' in p['url']: issues.append('URL\'de "degc" var')
    if not crumbs: issues.append('Ana kategori atanmamış')
    if code_note: issues.append(code_note)
    if not sku_ok: issues.append('Stok kodu standart dışı (boşluk/Türkçe karakter/alt çizgi)')
    if name != raw.strip() and not code_note.startswith('Model'): issues.append('Ürün adı düzeltildi')
    prio = 'Yüksek' if (words < 50 or not ld) else ('Orta' if words < 150 or len(issues) >= 3 else 'Düşük')
    rows.append({
        'ID': int(p['pid']), 'Stok Kodu': p['sku'], 'URL': p['url'], 'Kategori': ' > '.join(crumbs),
        'Marka': brand, 'Fiyat': p['price_text'], 'Mevcut Ürün Adı': raw.strip(), 'Önerilen Ürün Adı': name,
        'Mevcut SEO Başlık': p['title'], 'Önerilen SEO Başlık': seo_title(name),
        'Mevcut Meta Açıklama': p['desc'],
        'Önerilen Meta Açıklama': meta_desc(name, brand, tlabel, benefit, bool(p['price_text']), p['pid']),
        'Görsel Alt Metni (önerilen)': strip_parens(name),
        'Açıklama Kelime Sayısı': words, 'Sorunlar': '; '.join(issues), 'Öncelik': prio, '_tip': tlabel, '_fayda': benefit,
    })
rows.sort(key=lambda r: ({'Yüksek': 0, 'Orta': 1, 'Düşük': 2}[r['Öncelik']], r['Kategori'], r['ID']))
json.dump(rows, open(OUT, 'w'), ensure_ascii=False, indent=0)
print(len(rows), collections.Counter(r['Öncelik'] for r in rows))
print('title>60', sum(len(r['Önerilen SEO Başlık']) > 60 for r in rows), 'meta>155', sum(len(r['Önerilen Meta Açıklama']) > 155 for r in rows))
