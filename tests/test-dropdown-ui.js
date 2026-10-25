const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');
assert(html.includes('id="bfsiFormSelectDropdown"'), 'Dropdown must exist in index.html');
assert(html.includes('onchange="switchBfsiForm(this.value)"'), 'Dropdown must have onchange handler');
assert(html.includes('id="bfsiFormPromptHint"'), 'Prompt hint must exist');
assert(html.includes('class="bfsi-simple-card is-hidden" id="apply-loan"'), 'apply-loan should start hidden');
assert(html.includes('class="bfsi-simple-card is-hidden" id="open-savings"'), 'open-savings should start hidden');
assert(html.includes('class="bfsi-simple-card is-hidden" id="customer-login"'), 'customer-login should start hidden');

console.log('✓ Dropdown UI HTML validation passed 100%!');
