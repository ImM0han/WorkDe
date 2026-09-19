import { calculateBilling } from './controllers/jobController';

interface TestCase {
  name: string;
  rateType: 'HOURLY' | 'DAILY';
  rate: number;
  minutesWorked: number;
  expectedAmount: number;
  expectedHours: number;
}

const testCases: TestCase[] = [
  {
    name: 'Hourly job ₹200/hr, worked 35 minutes -> charge ₹200 (1hr minimum)',
    rateType: 'HOURLY',
    rate: 200,
    minutesWorked: 35,
    expectedAmount: 200,
    expectedHours: 1
  },
  {
    name: 'Hourly job ₹200/hr, worked 2.5 hours -> charge ₹500',
    rateType: 'HOURLY',
    rate: 200,
    minutesWorked: 150, // 2.5 hours
    expectedAmount: 500,
    expectedHours: 2.5
  },
  {
    name: 'Daily job ₹800/day, worked 2 hours -> charge ₹400 (half-day minimum)',
    rateType: 'DAILY',
    rate: 800,
    minutesWorked: 120, // 2 hours
    expectedAmount: 400,
    expectedHours: 4 // 4 hours / 8 hours = 0.5 day
  },
  {
    name: 'Daily job ₹800/day, worked 5 hours -> charge ₹500 (5/8 * 800)',
    rateType: 'DAILY',
    rate: 800,
    minutesWorked: 300, // 5 hours
    expectedAmount: 500,
    expectedHours: 5
  },
  {
    name: 'Daily job ₹800/day, worked 9 hours -> charge ₹800 (full day cap)',
    rateType: 'DAILY',
    rate: 800,
    minutesWorked: 540, // 9 hours
    expectedAmount: 800,
    expectedHours: 8
  }
];

function runTests() {
  console.log('Running Work Billing Calculator Tests...\n');
  let passedCount = 0;

  for (const tc of testCases) {
    const startedAt = new Date();
    const completedAt = new Date(startedAt.getTime() + tc.minutesWorked * 60 * 1000);

    const result = calculateBilling(startedAt, completedAt, tc.rate, tc.rateType);

    const amountPassed = Math.abs(result.billableAmount - tc.expectedAmount) < 0.01;
    const hoursPassed = Math.abs(result.billableHours - tc.expectedHours) < 0.01;

    if (amountPassed && hoursPassed) {
      console.log(`[PASS] ${tc.name}`);
      console.log(`       Got Hours: ${result.billableHours}, Got Amount: ₹${result.billableAmount}\n`);
      passedCount++;
    } else {
      console.log(`[FAIL] ${tc.name}`);
      console.log(`       Expected Hours: ${tc.expectedHours}, Got: ${result.billableHours}`);
      console.log(`       Expected Amount: ₹${tc.expectedAmount}, Got: ₹${result.billableAmount}\n`);
    }
  }

  console.log(`Result: ${passedCount}/${testCases.length} tests passed.`);
  if (passedCount !== testCases.length) {
    process.exit(1);
  }
}

runTests();
