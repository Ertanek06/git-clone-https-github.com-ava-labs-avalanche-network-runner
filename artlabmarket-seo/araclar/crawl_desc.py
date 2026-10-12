import json,re,subprocess,sys
from concurrent.futures import ThreadPoolExecutor
P=json.load(open('site/product.json'))
def one(p):
    for _ in range(3):
        r=subprocess.run(['curl','-sSL','--max-time','40',p['url']],capture_output=True); h=r.stdout.decode('utf-8','ignore')
        i=h.find('<div class="product-detail">')
        if i>0: break
    if i<0: return p['pid'],''
    j=h.find('<div class="product-detail-tab-row">',i)
    s=h[i+len('<div class="product-detail">'):j]
    s=re.sub(r'</div>\s*</div>\s*</div>\s*$','',s.strip())
    return p['pid'],s
with ThreadPoolExecutor(4) as ex: res=dict(ex.map(one,P))
json.dump(res,open('site/deschtml.json','w'),ensure_ascii=False)
print('done',len(res),sum(1 for v in res.values() if not v))
