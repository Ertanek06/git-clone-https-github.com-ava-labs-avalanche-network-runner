import json, re, subprocess, html, os, tempfile
from concurrent.futures import ThreadPoolExecutor

P = json.load(open('site/product.json'))
BASE = 'https://www.artlabmarket.com'

def sh(args):
    return subprocess.run(args, capture_output=True).stdout.decode('utf-8', 'ignore')

def groups_of(h):
    gs = []
    for m in re.finditer(r'<div class="variant-group-title">(.*?)</div>\s*<select[^>]*data-group-id="(\d+)"[^>]*data-group-index="(\d+)"[^>]*>(.*?)</select>', h, re.S):
        opts = [(v, html.unescape(re.sub(r'\s+', ' ', t)).strip()) for v, t in re.findall(r'<option value="(\d+)"[^>]*>(.*?)</option>', m.group(4), re.S) if v != '0']
        gs.append({'title': html.unescape(m.group(1)).strip(), 'id': m.group(2), 'options': opts})
    return gs

def one(p):
    cj = tempfile.mktemp()
    h = sh(['curl', '-sSL', '-c', cj, '-b', cj, '--max-time', '40', p['url']])
    if 'variant-select' not in h:
        os.path.exists(cj) and os.remove(cj); return None
    gs = groups_of(h)
    parent = p['pid']
    children = {}
    def post(sel, gid, nxt):
        data = f'selected_option_group_id={gid}&parent_product_id={parent}' + ''.join(f'&selected_options%5B%5D={s}' for s in sel)
        if nxt: data += f'&next_option_group_id={nxt}'
        out = sh(['curl', '-sS', '-c', cj, '-b', cj, '-X', 'POST', BASE + '/product/related-options', '-H', 'X-Requested-With: XMLHttpRequest',
                  '-H', 'Referer: ' + p['url'], '--max-time', '40', '--data', data])
        try: return json.loads(out)['data']['options']
        except Exception: return []
    def walk(level, sel):
        g = gs[level]
        nxt = gs[level + 1]['id'] if level + 1 < len(gs) else None
        opts = g['options'] if level == 0 else allowed[level]
        for oid, _ in opts:
            res = post(sel + [oid], g['id'], nxt)
            if nxt:
                allowed[level + 1] = [(str(r['option_id']), r['option_title']) for r in res]
                walk(level + 1, sel + [oid])
            else:
                for r in res:
                    r = {k: v for k, v in r.items()}
                    imgs = r.pop('product_images', {}) or {}
                    r['images'] = [v.split('?')[0] for k, v in sorted(imgs.items()) if re.match(r'image\d+_original_path', k) and v]
                    r['primary_from_parent'] = imgs.get('primaryImageFromMainProduct')
                    children[r['product_id']] = r
    allowed = {}
    if gs: walk(0, [])
    os.path.exists(cj) and os.remove(cj)
    return {'parent_id': parent, 'parent_url': p['url'], 'parent_name': p['h1'][0] if p['h1'] else '', 'parent_sku': p['sku'],
            'groups': [{'title': g['title'], 'id': g['id'], 'n': len(g['options'])} for g in gs], 'children': list(children.values())}

with ThreadPoolExecutor(4) as ex:
    res = [r for r in ex.map(one, P) if r]
json.dump(res, open('site/variants.json', 'w'), ensure_ascii=False)
print('parents', len(res), 'children', sum(len(r['children']) for r in res))
