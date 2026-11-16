/**
 * npm run billing:sync-plans
 * Creates the plans from src/config/plans.js in Razorpay (test or live, whichever keys are in .env) and stores
 * their ids. Safe to run again: a plan that already exists with the same price is left alone.
 */
import dns from 'node:dns';
import mongoose from 'mongoose';
import config from '../src/config/config.js';
import { isConfigured } from '../src/services/razorpay.client.js';
import { syncPlans } from '../src/services/billing.service.js';

if (process.env.DNS_SERVERS) dns.setServers(process.env.DNS_SERVERS.split(',').map((s) => s.trim()));

if (!isConfigured()) {
  console.error('Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env first (test keys start with rzp_test_).');
  process.exit(1);
}
const mode = config.razorpay.keyId.startsWith('rzp_test_') ? 'TEST' : 'LIVE';

await mongoose.connect(config.mongoose.url);
try {
  const results = await syncPlans();
  console.log(`Razorpay ${mode} mode`);
  for (const r of results)
    console.log(`  ${r.code.padEnd(8)} ${r.razorpayPlanId}  ${r.created ? 'created' : 'already there'}`);
} finally {
  await mongoose.disconnect();
}
