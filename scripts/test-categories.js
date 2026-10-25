const fs = require('fs');
const app = fs.readFileSync('app.js', 'utf8');

const match = app.match(/const PRODUCTS = (\[[\s\S]*?\]);/);
if (!match) {
  console.error('PRODUCTS not found');
  process.exit(1);
}
const PRODUCTS = JSON.parse(match[1]);
console.log('Total PRODUCTS:', PRODUCTS.length);
['all', 'horology', 'bullion', 'security', 'jewelry', 'lifestyle'].forEach(cat => {
  const matches = cat === 'all' ? PRODUCTS : PRODUCTS.filter(p => p.category === cat);
  console.log(`Category: '${cat}' -> ${matches.length} products`);
});
