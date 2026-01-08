const crypto = require("crypto");
const qs = require("qs");

// ============================================
// Config
// ============================================

const BACKEND_URL = "http://localhost:5000";
const ORDER_ID = "694de2a8342862c0a03b6f4c"; // Your payment ID
// ✅ NEW - Use YOUR secret from .env
const VNPAY_SECRET = "CUJYDQJAU7F3S7XSX5ITV2QW8ENGDOB0";

// ============================================
// Generate Signature (Same as Backend)
// ============================================

const vnpData = {
  vnp_Amount: "1221321300",           // Your course price * 100
  vnp_BankCode: "NCB",
  vnp_Command: "pay",
  vnp_CreateDate: "20251226011936",
  vnp_CurrCode: "VND",
  vnp_IpAddr: "127.0.0.1",
  vnp_Locale: "vn",
  vnp_OrderInfo: "Khoa hoc",
  vnp_OrderType: "other",
  vnp_ResponseCode: "00",             // 00 = Success
  vnp_TmnCode: "TESTMERCHANT",
  vnp_TxnRef: ORDER_ID,               // MUST match your payment
  vnp_TransactionNo: "14063443",
  vnp_Version: "2.1.0"
};

console.log("\n📋 Step 1: Sort data alphabetically");
const sorted = Object.keys(vnpData)
  .sort()
  .reduce((result, key) => {
    result[key] = vnpData[key];
    return result;
  }, {});
console.log("✅ Sorted");

console.log("\n📋 Step 2: Create query string");
const queryString = qs.stringify(sorted, { encode: false });
console.log("Query String (first 100 chars):", queryString.substring(0, 100) + "...");

console.log("\n📋 Step 3: Generate HMAC SHA512 signature");
const hmac = crypto.createHmac("sha512", VNPAY_SECRET);
const signature = hmac.update(Buffer.from(queryString, "utf-8")).digest("hex");
console.log("✅ Signature:", signature);

// ============================================
// Create Payload
// ============================================

const payload = { ...vnpData, vnp_SecureHash: signature };

console.log("\n📤 Payload to send:");
console.log(JSON.stringify(payload, null, 2));

// ============================================
// Test IPN via Fetch
// ============================================

async function testIPN() {
  console.log(`\n🚀 Testing IPN endpoint: POST ${BACKEND_URL}/api/payment/vnpay-ipn`);

  try {
    const response = await fetch(`${BACKEND_URL}/api/payment/vnpay-ipn`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log("\n✅ SUCCESS!");
      console.log("Response:", JSON.stringify(data, null, 2));
    } else {
      console.log("\n❌ Error response:");
      console.log("Status:", response.status);
      console.log("Data:", JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error("\n❌ Connection Error:");
    console.error("Message:", error.message);
    console.error("\n💡 Make sure backend is running: npm start");
  }
}

// Run test
testIPN();