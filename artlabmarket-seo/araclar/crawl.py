import re,json,sys,os,html,time,subprocess
from concurrent.futures import ThreadPoolExecutor
D=sys.argv[1]; kind=sys.argv[2]
urls=[]
for f in sorted(os.listdir(D)):
    if f.startswith('sitemap_'+kind+'_'): urls+=re.findall(r'<loc>([^<]+)</loc>',open(os.path.join(D,f)).read())
urls=[html.unescape(u) for u in urls]
def txt(s): return re.sub(r'\s+',' ',html.unescape(re.sub(r'<[^>]+>',' ',s))).strip()
def get(u):
    for i in range(3):
        r=subprocess.run(['curl','-sSL','--max-time','40','-w','\n%{http_code}',u],capture_output=True)
        out=r.stdout.decode('utf-8','ignore'); code=out[-3:]
        if code=='200': return out[:-4],code
        time.sleep(2)
    return out[:-4],code
def one(u):
    h,code=get(u); r={'url':u,'code':code}
    head=h[:h.find('</head>')] if '</head>' in h else h
    m=re.search(r'<title>(.*?)</title>',head,re.S); r['title']=txt(m.group(1)) if m else ''
    m=re.search(r'<meta name=.description. content="(.*?)"',head,re.S); r['desc']=txt(m.group(1)) if m else ''
    m=re.search(r"rel='canonical' href='([^']*)'",head); r['canonical']=m.group(1) if m else ''
    m=re.search(r'<meta name="robots" content="([^"]*)"',head); r['robots']=m.group(1) if m else ''
    r['h1']=[txt(x) for x in re.findall(r'<h1[^>]*>(.*?)</h1>',h,re.S)]
    lds=[]
    for j in re.findall(r'<script[^>]*ld\+json[^>]*>(.*?)</script>',h,re.S):
        try: lds.append(json.loads(j))
        except Exception: pass
    r['ld']=lds
    # main description block
    m=re.search(r'class="product-detail-tab-content"(.*?)>\s*Yorumlar\s*<',h,re.S)
    r['bodytext']=txt(m.group(1)).replace('Ürün Bilgisi','',1).strip()[:8000] if m else ''
    imgs=re.findall(r'<img[^>]*>',h)
    r['prodimgs']=[(re.search(r'(?:data-src|src)="([^"]+)"',i).group(1) if re.search(r'(?:data-src|src)="([^"]+)"',i) else '', (re.search(r'alt="([^"]*)"',i) or [None,''])[1]) for i in imgs if '/myassets/products/' in i]
    r['size']=len(h)
    m=re.search(r'data-product-id="(\d+)"',h); r['pid']=m.group(1) if m else ''
    m=re.search(r'Stok Kodu</div>\s*<[^>]+>\s*([^<]+)<',h); r['sku']=txt(m.group(1)) if m else ''
    i=h.find('breadcrumbs">'); r['crumbs']=[txt(x) for x in re.findall(r'<a[^>]*>(.*?)</a>',h[i:i+4000],re.S)] if i>0 else []
    m=re.search(r'class="al-detail-ex">([^<]+)<',h); r['price_text']=txt(m.group(1)) if m else ''
    r['all_imgs']=sorted({x.split('?')[0] for x in re.findall(r'/idea/[^"\' ]*/myassets/products/[^"\' ?]+',h)})
    return r
with ThreadPoolExecutor(4) as ex: res=list(ex.map(one,urls))
json.dump(res,open(os.path.join(D,kind+'.json'),'w'),ensure_ascii=False)
print(kind,len(res),sum(x['code']!='200' for x in res))
