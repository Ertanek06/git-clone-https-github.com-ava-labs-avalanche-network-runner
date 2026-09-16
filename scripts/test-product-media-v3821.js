import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const css=read('public/css/product-media-v3821.css');
const js=read('public/js/product-media-v3821.js');
const layout=read('views/layout.ejs');
const quote=read('public/js/quote-form.js');
const assetBuild=read('scripts/build-assets.js');
const checks=[
  /\.line-edit-modal \.line-edit-preview[\s\S]*height:340px!important/,
  /width:auto!important/,
  /height:auto!important/,
  /max-height:100%!important/,
  /object-fit:contain!important/,
  /window\.CRM_PRODUCT_IMAGE_FIT = fit/,
  /attributeFilter:\['src'\]/,
  /assetBundle\.styles/.test(layout)&&/product-media-v3821\.css/.test(assetBuild),
  /assetBundle\.js/.test(layout)&&/product-media-v3821\.js/.test(assetBuild),
  /CRM_PRODUCT_IMAGE_FIT/.test(quote)
];
for(const check of checks){if(check instanceof RegExp?!check.test(css+js):!check)throw new Error('PRODUCT_MEDIA_V3821_CONTRACT_FAILED')}
console.log('product media v3821 contracts 10/10 OK');
