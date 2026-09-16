import fs from 'fs';
import assert from 'assert';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const modal = read('public/js/template-modal.js');
const quoteService = read('src/services/quote.service.js');
const print = read('views/quotes/print.ejs');
const show = read('views/quotes/show.ejs');
const quoteForm = read('public/js/quote-form.js');
const custom = read('src/services/template-html.service.js');

assert(modal.includes('paletteStyleMap'), 'paletteStyleMap missing');
assert(modal.includes('syncPaletteInputsFromRenderedDesign'), 'baseline palette sync missing');
assert(modal.includes('target?.matches?.("[data-template-section-color]")'), 'section color event isolation missing');
assert(modal.includes('paletteEnabled.checked = true'), 'independent palette activation missing');
assert(!modal.includes('if (target?.matches?.("[data-template-section-color]") && paletteEnabled) paletteEnabled.checked = true;'), 'old palette activation path remains');
assert(quoteService.includes('meaningfulAddress'), 'meaningful address filter missing');
assert(quoteService.includes('firstAddress'), 'address fallback missing');
assert(quoteService.includes('currentCustomer.billing_address'), 'customer master fallback missing');
assert(print.includes('customerStreet=['), 'print customer street sanitization missing');
assert(show.includes('const customerStreet=['), 'quote detail customer street sanitization missing');
assert(quoteForm.includes('meaningfulCustomerAddress'), 'quote form address filter missing');
assert(/customerFieldValue=.*billing_address.*address1.*address2/s.test(quoteForm), 'customer picker legacy address fallback missing');
assert(custom.includes('x.address2'), 'custom template address2 fallback missing');

console.log('CRMV1.26_PALETTE_ADDRESS_TESTS=OK');
