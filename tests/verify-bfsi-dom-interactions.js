const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Mock a lightweight browser DOM environment
function createMockDom(htmlContent) {
  const elements = new Map();
  const listeners = new Map();

  function parseElements(tagRegex, idAttr) {
    let match;
    while ((match = tagRegex.exec(htmlContent)) !== null) {
      const fullTag = match[0];
      const idMatch = fullTag.match(/id="([^"]+)"/);
      if (idMatch) {
        const id = idMatch[1];
        if (!elements.has(id)) {
          elements.set(id, {
            id,
            tagName: fullTag.split(/[\s>]/)[0].replace('<', '').toUpperCase(),
            value: (fullTag.match(/value="([^"]+)"/) || [])[1] || '',
            textContent: '',
            classList: {
              classes: new Set(),
              add(c) { this.classes.add(c); },
              remove(c) { this.classes.delete(c); },
              toggle(c, force) {
                if (force !== undefined) {
                  if (force) this.classes.add(c); else this.classes.delete(c);
                } else {
                  if (this.classes.has(c)) this.classes.delete(c); else this.classes.add(c);
                }
              },
              contains(c) { return this.classes.has(c); }
            },
            style: {},
            appendChild() {},
            remove() {},
            getAttribute(attr) {
              const m = fullTag.match(new RegExp(attr + '="([^"]+)"'));
              return m ? m[1] : null;
            },
            addEventListener(ev, fn) {
              if (!listeners.has(id + ':' + ev)) listeners.set(id + ':' + ev, []);
              listeners.get(id + ':' + ev).push(fn);
            },
            dispatchEvent(ev) {
              const fns = listeners.get(id + ':' + ev) || [];
              fns.forEach(fn => fn({ target: this }));
            }
          });
        }
      }
    }
  }

  parseElements(/<input[^>]+>/g);
  parseElements(/<button[^>]+>/g);
  parseElements(/<span[^>]+>/g);
  parseElements(/<div[^>]+>/g);
  parseElements(/<form[^>]+>/g);
  parseElements(/<strong[^>]+>/g);
  parseElements(/<h3[^>]+>/g);

  return {
    createElement(tag) {
      return {
        className: '',
        innerHTML: '',
        style: {},
        classList: { add() {}, remove() {} },
        appendChild() {},
        remove() {}
      };
    },
    addEventListener() {},
    getElementById(id) {
      return elements.get(id) || null;
    },
    querySelectorAll(selector) {
      return Array.from(elements.values());
    },
    querySelector(selector) {
      if (selector.includes('fdPayout')) {
        return { value: 'compounded' };
      }
      return null;
    }
  };
}

const bfsiHtml = fs.readFileSync(path.join(__dirname, '..', 'Matomo ecomm Web', 'bfsi.html'), 'utf8');
const mockDoc = createMockDom(bfsiHtml);

global.document = mockDoc;
global.window = {
  dataLayer: [],
  _mtm: [],
  _paq: [],
  addEventListener: () => {}
};

// Load app.js
require(path.join(__dirname, '..', 'Matomo ecomm Web', 'app.js'));

console.log('Testing BFSI DOM Engine Interactions:');

// 1. Initial Calculation Test
console.log('1. Testing initial calculateFd()');
assert.strictEqual(typeof window.calculateFd, 'function', 'window.calculateFd must be a function');
window.calculateFd();

const fdAmountVal = mockDoc.getElementById('fdAmountVal');
const fdMaturityTotal = mockDoc.getElementById('fdMaturityTotal');
const fdInterestGain = mockDoc.getElementById('fdInterestGain');
const fdMonthlyEquivalent = mockDoc.getElementById('fdMonthlyEquivalent');

console.log('   Initial Values:');
console.log('   Principal:', fdAmountVal.textContent);
console.log('   Maturity:', fdMaturityTotal.textContent);
console.log('   Interest Gain:', fdInterestGain.textContent);
console.log('   Monthly Eq:', fdMonthlyEquivalent.textContent);

assert.strictEqual(fdAmountVal.textContent, '$100,000');
assert(fdMaturityTotal.textContent.startsWith('$'));
assert(fdInterestGain.textContent.startsWith('+$'));
assert(fdMonthlyEquivalent.textContent.endsWith('/ mo'));
console.log('   ✓ Initial FD calculation & currency formatting passed!');

// 2. Slider Change Test: Change to $500,000
console.log('2. Testing slider change to $500,000');
const slider = mockDoc.getElementById('fdAmountRange');
slider.value = '500000';
window.calculateFd();

console.log('   Updated Values ($500,000):');
console.log('   Principal:', fdAmountVal.textContent);
console.log('   Maturity:', fdMaturityTotal.textContent);
console.log('   Interest Gain:', fdInterestGain.textContent);

assert.strictEqual(fdAmountVal.textContent, '$500,000');
assert.strictEqual(fdMaturityTotal.textContent, '$643,692');
assert.strictEqual(fdInterestGain.textContent, '+$143,692');
console.log('   ✓ Dynamic slider calculation passed accurately!');

// 3. Tenure Change Test: Switch to 12 Months (7.25%)
console.log('3. Testing tenure change to 12 Months (7.25%)');
window.setFdTenure(12, 7.25, { classList: { add() {} } });
assert.strictEqual(window.activeFdMonths, 12);
assert.strictEqual(window.activeFdRate, 7.25);
assert.strictEqual(mockDoc.getElementById('fdApyDisplay').textContent, '7.25% APY');
assert.strictEqual(fdAmountVal.textContent, '$500,000');
assert.strictEqual(fdMaturityTotal.textContent, '$537,479');
console.log('   ✓ Tenure change passed (Maturity = $537,479)!');

// 4. Modal Open & Demo Autofill Test
console.log('4. Testing BFSI modal open & demo details autofill');
window.openBfsiModal('Infinite High-Yield Multiplier Deposit', '$500,000');
const modal = mockDoc.getElementById('bfsiApplyModal');
assert(modal.classList.contains('active'), 'Modal must have active class');
assert.strictEqual(mockDoc.getElementById('bfsiModalProductTitle').textContent, 'Infinite High-Yield Multiplier Deposit');
assert.strictEqual(mockDoc.getElementById('bfsiAmountField').value, '$500,000');

window.fillBfsiDemo();
assert.strictEqual(mockDoc.getElementById('bfsiClientName').value, 'Lord Alistair Vance');
assert.strictEqual(mockDoc.getElementById('bfsiClientEmail').value, 'alistair.vance@sovereign-holdings.ch');
assert.strictEqual(mockDoc.getElementById('bfsiClientPhone').value, '+41 22 819 4500');
console.log('   ✓ Modal opened with product and demo data auto-filled!');

// 5. Modal Close Test
console.log('5. Testing modal close');
window.closeBfsiModal();
assert(!modal.classList.contains('active'), 'Modal active class should be removed');
console.log('   ✓ Modal close function verified!');

console.log('\nAll BFSI DOM Interactive Verification Tests PASSED 100%!');
