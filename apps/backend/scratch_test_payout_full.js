const axios = require('axios');

const keyId = 'rzp_test_TRXG3Fu2Tk8Usg';
const keySecret = 'jTd6lMRQ0C9NgDQXHtyV6HC2';
const auth = { username: keyId, password: keySecret };

async function testFullPayout() {
  console.log("=== Testing Full Razorpay Payout Flow ===");

  try {
    // 1. Create Contact
    console.log("1. Creating Contact...");
    const contactRes = await axios.post('https://api.razorpay.com/v1/contacts', {
      name: "Partner Test User",
      email: "partner@example.com",
      contact: "9999999999",
      type: "employee"
    }, { auth });
    const contactId = contactRes.data.id;
    console.log("   Contact ID:", contactId);

    // 2. Create Fund Account (UPI)
    console.log("2. Creating Fund Account (UPI)...");
    const fundRes = await axios.post('https://api.razorpay.com/v1/fund_accounts', {
      contact_id: contactId,
      account_type: "vpa",
      vpa: { address: "8986769738@axis" }
    }, { auth });
    const fundAccountId = fundRes.data.id;
    console.log("   Fund Account ID:", fundAccountId);

    // 3. Create Payout
    console.log("3. Creating Payout...");
    const payoutRes = await axios.post('https://api.razorpay.com/v1/payouts', {
      account_number: "2333300200000001",
      fund_account_id: fundAccountId,
      amount: 1000, // 10 INR = 1000 paise
      currency: "INR",
      mode: "UPI",
      purpose: "payout",
      queue_if_low_balance: true
    }, { auth });
    console.log("   Payout ID:", payoutRes.data.id);
    console.log("   Payout Status:", payoutRes.data.status);
    console.log("=== FULL PAYOUT SUCCESS! ===");
  } catch (err) {
    console.error("Payout Error:", err.response ? err.response.data : err.message);
  }
}

testFullPayout();
