const axios = require('axios');

const keyId = 'rzp_test_TRXG3Fu2Tk8Usg';
const keySecret = 'jTd6lMRQ0C9NgDQXHtyV6HC2';

async function run() {
  const auth = { username: keyId, password: keySecret };

  console.log("1. GET /v1/payments:");
  try {
    const res = await axios.get('https://api.razorpay.com/v1/payments', { auth });
    console.log("   Status:", res.status, "Count:", res.data.count);
  } catch (err) {
    console.log("   Err:", err.response ? err.response.data : err.message);
  }

  console.log("2. GET /v1/transfers:");
  try {
    const res = await axios.get('https://api.razorpay.com/v1/transfers', { auth });
    console.log("   Status:", res.status, "Count:", res.data.count);
  } catch (err) {
    console.log("   Err:", err.response ? err.response.data : err.message);
  }

  console.log("3. POST /v1/contacts:");
  try {
    const res = await axios.post('https://api.razorpay.com/v1/contacts', {
      name: "Partner User",
      email: "partner@example.com",
      contact: "9999999999",
      type: "employee"
    }, { auth });
    console.log("   Status:", res.status, "ID:", res.data.id);
  } catch (err) {
    console.log("   Err:", err.response ? err.response.data : err.message);
  }
}

run();
