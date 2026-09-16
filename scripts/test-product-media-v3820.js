import fs from 'node:fs';
const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const css = read('public/css/product-media-v3820.css');
const layout = read('views/layout.ejs');
const productPreview = read('views/products/preview.ejs');
const customerPreview = read('views/customers/preview.ejs');
const assetBuild = read('scripts/build-assets.js');
const checks = [
  /\.line-edit-modal \.line-edit-preview[\s\S]*height:230px!important/,
  /object-fit:contain!important/,
  /\.quote-line-image[\s\S]*height:72px!important/,
  /\.quote-detail-thumb[\s\S]*height:92px!important/,
  /assetBundle\.styles/.test(layout) && /product-media-v3820\.css/.test(assetBuild),
  /product-media-v3820\.css/.test(productPreview),
  /product-media-v3820\.css/.test(customerPreview)
];
for (const check of checks) {
  if (check instanceof RegExp ? !check.test(css) : !check) throw new Error('PRODUCT_MEDIA_V3820_CONTRACT_FAILED');
}
console.log('product media v3820 contracts 7/7 OK');
