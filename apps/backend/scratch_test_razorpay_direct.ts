import axios from 'axios';

const keyId = 'rzp_test_TRXG3Fu2Tk8Usg';
const keySecret = 'jTd6lMRQ0C9NgDQXHtyV6HC2';

async function testRazorpayEndpoints() {
  console.log("=== Testing Razorpay API Endpoints ===");

  // 1. Check basic Razorpay auth via /v1/payments
  try {
    const res = await axios.get('https://api.razorpay.com/v1/payments', {
      auth: { username: keyId, password: keySecret }
    });
    console.log("[GET /v1/payments SUCCESS]: Found", res.data.items?.length, "payments");
  } catch (err: any) {
    console.error("[GET /v1/payments ERROR]:", err.response?.status, err.response?.data || err.message);
  }

  // 2. Check Razorpay contacts endpoint
  try {
    const res = await axios.post('https://api.razorpay.com/v1/contacts', {
      name: "Test Partner",
      email: "test@example.com",
      contact: "9999999999",
      type: "employee"
    }, {
      auth: { username: keyId, password: keySecret }
    });
    console.log("[POST /v1/contacts SUCCESS]: Contact ID:", res.data.id);
  } catch (err: any) {
    console.error("[POST /v1/contacts ERROR]:", err.response?.status, err.response?.data || err.message);
  }

  // 3. Check Razorpay Transfers endpoint (Route)
  try {
    const res = await axios.get('https://api.razorpay.com/v1/transfers', {
      auth: { username: keyId, password: keySecret }
    });
    console.log("[GET /v1/transfers SUCCESS]: Found", res.data.items?.length, "transfers");
  } catch (err: any) {
    console.error("[GET /v1/transfers ERROR]:", err.response?.status, err.response?.data || err.message);
  }
}

testRazorpayEndpoints();
