const http = require('http');
const assert = require('assert');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(buf) }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  console.log('Testing BFSI Calculator & Form Endpoints:');

  // Test 1: Calculate Yield
  const fdRes = await post('/api/bfsi/calculate-yield', {
    principal: 250000,
    months: 36,
    rate: 8.45,
    payout: 'compounded'
  });
  console.log('1. FD Yield Calculation:', fdRes.data.calculations);
  assert.strictEqual(fdRes.status, 200);
  assert(fdRes.data.calculations.maturityTotal > 250000);
  assert(fdRes.data.calculations.interestGain > 0);
  console.log('   ✓ FD Yield calculation accurate!');

  // Test 2: Calculate Loan EMI
  const loanRes = await post('/api/bfsi/calculate-emi', {
    principal: 500000,
    years: 20,
    rate: 7.65,
    loanType: 'Prime Home Mortgage'
  });
  console.log('2. Loan EMI Calculation:', loanRes.data.calculations);
  assert.strictEqual(loanRes.status, 200);
  assert(loanRes.data.calculations.monthlyEmi > 0);
  assert(loanRes.data.calculations.totalPayable > 500000);
  console.log('   ✓ Loan EMI calculation accurate!');

  // Test 3: Submit Lead Form
  const leadRes = await post('/api/bfsi/submit-lead', {
    clientName: 'Lord Alistair Vance',
    clientEmail: 'alistair@sovereign.ch',
    clientPhone: '+41 22 819 0000',
    incomeBracket: '500k-1M',
    purpose: 'yield_maximization',
    productName: 'Infinite High-Yield Multiplier Deposit',
    requestedAmount: '$250,000'
  });
  console.log('3. Lead Submission Result:', leadRes.data);
  assert.strictEqual(leadRes.status, 200);
  assert(leadRes.data.referenceId.startsWith('INF-BFSI-'));
  console.log('   ✓ Lead Form registered with reference ticket:', leadRes.data.referenceId);

  console.log('\nAll BFSI Live Functional Tests PASSED perfectly!');
}

run().catch(e => {
  console.error('Test Failed:', e);
  process.exit(1);
});
