import json, re, collections, sys
import xlsxwriter

OUT = sys.argv[1]
R = json.load(open('site/rows.json'))
N = json.load(open('site/newdesc.json'))
VR = json.load(open('site/variant_rows.json'))
C = json.load(open('site/category.json'))
P = {p['pid']: p for p in json.load(open('site/product.json'))}

wb = xlsxwriter.Workbook(OUT)
H = wb.add_format({'bold': True, 'bg_color': '#343D47', 'font_color': 'white', 'text_wrap': True, 'valign': 'top', 'border': 1})
W = wb.add_format({'text_wrap': True, 'valign': 'top'})
T = wb.add_format({'valign': 'top'})
RED = wb.add_format({'bg_color': '#FDE2E6'})
YEL = wb.add_format({'bg_color': '#FFF4CC'})
GRN = wb.add_format({'bg_color': '#E3F5E9'})
B = wb.add_format({'bold': True, 'font_size': 14})
B2 = wb.add_format({'bold': True})

def sheet(name, cols, rows, widths=None, wrap=()):
    ws = wb.add_worksheet(name)
    for i, c in enumerate(cols):
        ws.write(0, i, c, H)
        ws.set_column(i, i, (widths or {}).get(c, 18), W if c in wrap else T)
    for r, row in enumerate(rows, 1):
        for i, c in enumerate(cols):
            v = row.get(c, '')
            if isinstance(v, str) and len(v) > 32000: v = v[:32000]
            ws.write(r, i, v)
    ws.freeze_panes(1, 2)
    ws.autofilter(0, 0, len(rows), len(cols) - 1)
    ws.set_row(0, 32)
    return ws

# --- Özet
ws = wb.add_worksheet('Özet')
ws.set_column(0, 0, 4); ws.set_column(1, 1, 120)
lines = [
    ('ArtLab Market – SEO, ürün adı/kodu, açıklama ve varyant çalışması', B),
    (f'Tarama: {len(P)} ürün, {len(C)} kategori, {len(VR)} varyant alt ürünü (79 ana üründe).', None),
    ('', None),
    ('SAYFALAR', B2),
    ('Ürün SEO – her ürün için önerilen ürün adı (H1), SEO başlığı (≤60), meta açıklama (≤155), görsel alt metni, sorunlar ve öncelik.', None),
    ('Ürün Kodu Kontrol – stok kodu ile ürün adındaki model kodu uyuşmayan veya standart dışı kodlar. Elle doğrulanmalı.', None),
    ('Yeni Açıklamalar – tüm ürünlerin tek tip şablona çevrilmiş açıklama HTML\'i (Teknik Özellikler tablosu, Öne Çıkan Özellikler, Kullanım Alanları, Paket İçeriği).', None),
    ('Varyant → Ayrı Ürün – varyantlardan çıkarılıp bağımsız ürün yapılacak 367 ürün: yeni ad, yeni stok kodu, SEO başlık, meta, URL, fiyat, stok, görseller (ana ürünle aynı), açıklama.', None),
    ('Kategoriler – kategori SEO başlığı, meta açıklama, H1 ve düzeltilecek URL/ad hataları.', None),
    ('', None),
    ('RENKLER', B2),
    ('Kırmızı satır = yüksek öncelik (açıklama yok/çok kısa veya Google ürün şeması yok). Sarı = kontrol edilmeli. Yeşil = hazır.', None),
    ('', None),
    ('ÖNEMLİ', B2),
    ('Ürün adları ve stok kodları değişmeden önce "Ürün Kodu Kontrol" sayfasındaki satırlar üretici kataloğundan doğrulanmalı.', None),
    ('Varyantlar ayrı ürüne çevrildikten sonra eski ana ürün URL\'leri 301 ile ilgili kategoriye veya en çok satan alt ürüne yönlendirilmeli (IdeaSoft: SEO > 301 Yönlendirmeleri).', None),
    ('Açıklama tasarımı için tema/urun-aciklama.css dosyası IdeaSoft Tema Düzenleyici\'ye bir kez eklenmelidir; açıklamalarda satır içi stil yoktur.', None),
]
for i, (t, f) in enumerate(lines):
    ws.write(i + 1, 1, t, f) if f else ws.write(i + 1, 1, t)

# --- Ürün SEO
cols = ['ID', 'Stok Kodu', 'URL', 'Kategori', 'Marka', 'Fiyat', 'Mevcut Ürün Adı', 'Önerilen Ürün Adı',
        'Mevcut SEO Başlık', 'Önerilen SEO Başlık', 'Başlık Uzunluğu', 'Mevcut Meta Açıklama', 'Önerilen Meta Açıklama',
        'Meta Uzunluğu', 'Görsel Alt Metni (önerilen)', 'Açıklama Kelime Sayısı', 'Yeni Açıklama Durumu', 'Sorunlar', 'Öncelik']
rows = []
for r in R:
    d = dict(r)
    d['Başlık Uzunluğu'] = len(r['Önerilen SEO Başlık']); d['Meta Uzunluğu'] = len(r['Önerilen Meta Açıklama'])
    st = N[str(r['ID'])]['status']
    d['Yeni Açıklama Durumu'] = 'Tam' if not st else '; '.join(st)
    rows.append(d)
ws = sheet('Ürün SEO', cols, rows, {'URL': 40, 'Mevcut Ürün Adı': 45, 'Önerilen Ürün Adı': 50, 'Mevcut SEO Başlık': 40,
           'Önerilen SEO Başlık': 45, 'Mevcut Meta Açıklama': 50, 'Önerilen Meta Açıklama': 60, 'Sorunlar': 60,
           'Yeni Açıklama Durumu': 40, 'Görsel Alt Metni (önerilen)': 40, 'ID': 7, 'Öncelik': 9},
           wrap={'Önerilen Meta Açıklama', 'Sorunlar', 'Mevcut Meta Açıklama'})
ci = cols.index('Öncelik')
ws.conditional_format(1, 0, len(rows), len(cols) - 1, {'type': 'formula', 'criteria': f'=${chr(65+ci)}2="Yüksek"', 'format': RED})
ws.conditional_format(1, 0, len(rows), len(cols) - 1, {'type': 'formula', 'criteria': f'=${chr(65+ci)}2="Orta"', 'format': YEL})

# --- Ürün Kodu Kontrol
krows = []
for r in R:
    iss = [i for i in r['Sorunlar'].split('; ') if 'kod' in i.lower()]
    if iss:
        krows.append({'ID': r['ID'], 'Stok Kodu': r['Stok Kodu'], 'Mevcut Ürün Adı': r['Mevcut Ürün Adı'],
                      'Önerilen Ürün Adı': r['Önerilen Ürün Adı'], 'URL': r['URL'], 'Tespit': '; '.join(iss),
                      'Durum': 'Doğrulanmalı' if ('Adda' in ' '.join(iss) or 'standart' in ' '.join(iss)) else 'Bilgi',
                      'Doğru Kod (siz doldurun)': ''})
krows.sort(key=lambda x: (x['Durum'] != 'Doğrulanmalı', x['ID']))
ws = sheet('Ürün Kodu Kontrol', ['ID', 'Stok Kodu', 'Mevcut Ürün Adı', 'Önerilen Ürün Adı', 'Tespit', 'Durum', 'Doğru Kod (siz doldurun)', 'URL'],
           krows, {'Mevcut Ürün Adı': 50, 'Önerilen Ürün Adı': 55, 'Tespit': 70, 'URL': 40, 'Doğru Kod (siz doldurun)': 22}, wrap={'Tespit'})
ws.conditional_format(1, 0, len(krows), 7, {'type': 'formula', 'criteria': '=$F2="Doğrulanmalı"', 'format': YEL})

# --- Yeni Açıklamalar
drows = []
for r in R:
    n = N[str(r['ID'])]
    drows.append({'ID': r['ID'], 'Stok Kodu': r['Stok Kodu'], 'Ürün Adı': r['Önerilen Ürün Adı'], 'URL': r['URL'],
                  'Durum': 'Tam' if not n['status'] else '; '.join(n['status']),
                  'Teknik Satır Sayısı': n['spec_rows'], 'Dış Site Görselleri (kaldırıldı)': '\n'.join(n['ext_images']),
                  'Açıklama HTML': n['html']})
ws = sheet('Yeni Açıklamalar', ['ID', 'Stok Kodu', 'Ürün Adı', 'Durum', 'Teknik Satır Sayısı', 'URL', 'Dış Site Görselleri (kaldırıldı)', 'Açıklama HTML'],
           drows, {'Ürün Adı': 50, 'Durum': 45, 'URL': 40, 'Dış Site Görselleri (kaldırıldı)': 40, 'Açıklama HTML': 90}, wrap={'Durum'})
ws.conditional_format(1, 0, len(drows), 7, {'type': 'formula', 'criteria': '=$D2="Tam"', 'format': GRN})

# --- Varyant → Ayrı Ürün
vcols = ['Ana Ürün ID', 'Ana Ürün Adı', 'Varyant Grubu', 'Varyant Değeri', 'Mevcut Alt Ürün ID', 'Mevcut Alt Ürün Stok Kodu',
         'Yeni Ürün Adı', 'Yeni Stok Kodu', 'Stok Kodu Notu', 'SEO Başlık', 'Meta Açıklama', 'Önerilen URL', 'Marka', 'Kategori',
         'Fiyat TL (KDV hariç)', 'KDV %', 'Stok Adedi'] + [f'Görsel {i}' for i in range(1, 9)] + ['Ana Ürün URL', 'Mevcut Alt Ürün URL', 'Açıklama HTML']
ws = sheet('Varyant → Ayrı Ürün', vcols, VR, {'Ana Ürün Adı': 40, 'Yeni Ürün Adı': 55, 'Yeni Stok Kodu': 22, 'Stok Kodu Notu': 45,
           'SEO Başlık': 45, 'Meta Açıklama': 60, 'Önerilen URL': 45, 'Açıklama HTML': 80}, wrap={'Stok Kodu Notu'})
ki = vcols.index('Yeni Stok Kodu')
ws.conditional_format(1, 0, len(VR), len(vcols) - 1, {'type': 'formula', 'criteria': f'=${chr(65+ki)}2=""', 'format': YEL})

# --- Kategoriler
FIXN = {'Esd Çalişma Tezgahları': 'ESD Çalışma Tezgahları', 'Sarf Malzemeler': 'Laboratuvar Sarf Malzemeleri', 'TÜPLER': 'Deney Tüpleri',
        'PİPETLER': 'Cam Pipetler', 'MEZÜRLER': 'Mezürler', 'DESİKATÖRLER': 'Desikatörler', 'HUNİLER': 'Huniler', 'BÜRETLER': 'Büretler',
        'BEHERLER': 'Beherler', 'BALONLAR': 'Cam Balonlar', 'ERLENMAYER': 'Erlenmayerler', 'SOXHLET': 'Soxhlet Ekstraksiyon Ekipmanları',
        'Tezgah Ve Çalışma Masası': 'Laboratuvar Tezgahı ve Çalışma Masası', 'Merck': 'Merck Kimyasalları', 'Termometre': 'Termometreler',
        'Vorteks': 'Vorteks Karıştırıcılar', 'Su Banyoları': 'Laboratuvar Su Banyoları', 'Etüv': 'Etüv (Kurutma Fırını)',
        'Otoklav': 'Otoklav (Buhar Sterilizatörü)', 'Mikroskop': 'Laboratuvar Mikroskopları', 'Santrifüj': 'Laboratuvar Santrifüjleri',
        'İnkübatör': 'Laboratuvar İnkübatörleri', 'Kül Fırını': 'Kül Fırını (Muffle Fırın)'}
SLUG = {'laboratuvar-saf-malzemeler': 'laboratuvar-sarf-malzemeler', 'soksilet': 'soxhlet'}
brands_by_leaf = collections.defaultdict(collections.Counter)
for r in R:
    leaf = r['Kategori'].split(' > ')[-1] if r['Kategori'] else ''
    if r['Marka']: brands_by_leaf[leaf][r['Marka']] += 1
crows = []
for c in C:
    cur = c['title'].rsplit(' | ', 1)[0]
    h1 = FIXN.get(cur, cur if not cur.isupper() else cur.capitalize())
    t = f'{h1} Fiyatları ve Modelleri | ArtLab Market'
    if len(t) > 60: t = f'{h1} Modelleri | ArtLab Market'
    if len(t) > 60: t = f'{h1} | ArtLab Market'
    br = [b for b, _ in brands_by_leaf.get(cur, collections.Counter()).most_common(3)]
    md = f'{h1} modelleri ArtLab Market\'te' + (f': {", ".join(br)} ve daha fazlası.' if br else '.') + ' Orijinal ürün, kurulum, teknik destek ve hızlı fiyat teklifi.'
    if len(md) > 155: md = f'{h1} modelleri ArtLab Market\'te. Orijinal ürün, kurulum, teknik destek ve hızlı fiyat teklifi.'
    slug = c['url'].rstrip('/').split('/')[-1]
    notes = []
    if not c['h1']: notes.append('Sayfada H1 yok – tema düzeltmesi')
    if not c['desc']: notes.append('Meta açıklama boş')
    if slug in SLUG: notes.append(f'URL yazım hatası → /kategori/{SLUG[slug]} (301 ile)')
    if cur != h1: notes.append('Kategori adı düzeltildi')
    notes.append('Kategori sayfasında açıklama metni yok (150-300 kelime eklenmeli)')
    crows.append({'URL': c['url'], 'Mevcut Başlık': c['title'], 'Önerilen SEO Başlık': t, 'Mevcut Meta': c['desc'],
                  'Önerilen Meta Açıklama': md, 'Önerilen H1 / Kategori Adı': h1, 'Notlar': '; '.join(notes)})
sheet('Kategoriler', ['URL', 'Önerilen H1 / Kategori Adı', 'Mevcut Başlık', 'Önerilen SEO Başlık', 'Mevcut Meta', 'Önerilen Meta Açıklama', 'Notlar'],
      crows, {'URL': 45, 'Mevcut Başlık': 35, 'Önerilen SEO Başlık': 45, 'Mevcut Meta': 50, 'Önerilen Meta Açıklama': 60, 'Notlar': 60,
              'Önerilen H1 / Kategori Adı': 35}, wrap={'Notlar', 'Önerilen Meta Açıklama', 'Mevcut Meta'})
wb.close()
print('ok', len(rows), len(krows), len(drows), len(VR), len(crows))
