// Test script để kiểm tra Judge0 và Piston API
const axios = require("axios");

// Test code đơn giản
const TEST_CODE = {
  python: `a, b = map(int, input().split())
print(a + b)`,
  
  javascript: `const input = require('fs').readFileSync(0, 'utf-8').trim();
const [a, b] = input.split(' ').map(Number);
console.log(a + b);`,
  
  cpp: `#include <iostream>
using namespace std;
int main() {
    int a, b;
    cin >> a >> b;
    cout << a + b << endl;
    return 0;
}`,
};

const TEST_INPUT = "5 7";
const EXPECTED_OUTPUT = "12";

// ========================================
// Test Judge0 CE Free
// ========================================
async function testJudge0() {
  console.log("\n🔵 Testing Judge0 CE Free...");
  console.log("=" .repeat(50));
  
  const instances = [
    "https://ce.judge0.com",
    "https://judge0.p.rapidapi.com",
  ];

  for (const endpoint of instances) {
    console.log(`\n📍 Trying: ${endpoint}`);
    
    try {
      // Submit
      const submitResponse = await axios.post(
        `${endpoint}/submissions`,
        {
          source_code: Buffer.from(TEST_CODE.python).toString("base64"),
          language_id: 71, // Python 3
          stdin: Buffer.from(TEST_INPUT).toString("base64"),
        },
        {
          params: { base64_encoded: "true", fields: "*" },
          timeout: 10000,
        }
      );

      const token = submitResponse.data.token;
      console.log(`   ✅ Submission created: ${token}`);

      // Poll result
      let attempts = 0;
      while (attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const resultResponse = await axios.get(
          `${endpoint}/submissions/${token}`,
          { params: { base64_encoded: "true", fields: "*" } }
        );

        const result = resultResponse.data;
        
        if (result.status.id > 2) {
          const output = result.stdout 
            ? Buffer.from(result.stdout, "base64").toString("utf-8").trim()
            : "";
          
          console.log(`   📊 Status: ${result.status.description}`);
          console.log(`   📤 Output: "${output}"`);
          console.log(`   ⏱️  Time: ${result.time}s`);
          console.log(`   💾 Memory: ${result.memory}KB`);
          
          if (output === EXPECTED_OUTPUT) {
            console.log(`   ✅ JUDGE0 WORKS! Using endpoint: ${endpoint}`);
            return { success: true, endpoint, api: "Judge0" };
          } else {
            console.log(`   ❌ Output mismatch`);
          }
          break;
        }
        
        attempts++;
      }
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
    }
  }

  return { success: false, api: "Judge0" };
}

// ========================================
// Test Piston API
// ========================================
async function testPiston() {
  console.log("\n🟢 Testing Piston API...");
  console.log("=".repeat(50));
  
  try {
    const response = await axios.post(
      "https://emkc.org/api/v2/piston/execute",
      {
        language: "python",
        version: "*",
        files: [{ name: "main.py", content: TEST_CODE.python }],
        stdin: TEST_INPUT,
      },
      { timeout: 15000 }
    );

    const result = response.data;
    const output = (result.run?.stdout || "").trim();

    console.log(`   📊 Status: ${result.run?.code === 0 ? "Success" : "Failed"}`);
    console.log(`   📤 Output: "${output}"`);
    console.log(`   ⏱️  Time: ${result.run?.time || 0}ms`);
    console.log(`   💾 Memory: ${result.run?.memory || 0} bytes`);

    if (output === EXPECTED_OUTPUT) {
      console.log(`   ✅ PISTON WORKS!`);
      return { success: true, endpoint: "https://emkc.org/api/v2/piston", api: "Piston" };
    } else {
      console.log(`   ❌ Output mismatch`);
    }
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
  }

  return { success: false, api: "Piston" };
}

// ========================================
// Main Test
// ========================================
async function main() {
  console.log("\n🚀 Testing Code Execution APIs");
  console.log("=" .repeat(50));
  console.log("Test Code: Sum of two numbers (a + b)");
  console.log(`Input: "${TEST_INPUT}"`);
  console.log(`Expected Output: "${EXPECTED_OUTPUT}"`);

  const results = [];

  // Test Judge0
  const judge0Result = await testJudge0();
  results.push(judge0Result);

  // Test Piston
  const pistonResult = await testPiston();
  results.push(pistonResult);

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("📊 SUMMARY");
  console.log("=".repeat(50));

  const working = results.filter(r => r.success);
  
  if (working.length === 0) {
    console.log("❌ Không có API nào hoạt động!");
    console.log("\n💡 Giải pháp:");
    console.log("   1. Kiểm tra kết nối internet");
    console.log("   2. Thử dùng VPN");
    console.log("   3. Xem xét self-host Judge0 với Docker");
  } else {
    console.log(`✅ Có ${working.length} API hoạt động:`);
    working.forEach(api => {
      console.log(`   - ${api.api}: ${api.endpoint}`);
    });
    
    console.log("\n📝 Khuyến nghị:");
    if (pistonResult.success) {
      console.log("   → Sử dụng PISTON API (đơn giản, ổn định)");
      console.log("   → Copy code từ: judgeService-piston.js");
    } else if (judge0Result.success) {
      console.log("   → Sử dụng JUDGE0 CE FREE");
      console.log("   → Copy code từ: judgeService.js (version đầu tiên)");
    }
  }

  console.log("\n" + "=".repeat(50));
}

// Run test
main().catch(console.error);