const axios = require("axios");

// ✅ Judge0 CE Free Instance - KHÔNG CẦN API KEY
const JUDGE0_API = "https://judge0-ce.p.rapidapi.com"; // Sao lưu
const JUDGE0_CE_FREE = "https://ce.judge0.com"; // Instance chính thức miễn phí

// Tự động thử các instance backup nếu main fail
const JUDGE0_INSTANCES = [
  "https://ce.judge0.com",
  "https://judge0.p.rapidapi.com", // Backup (có rate limit)
];

const LANGUAGE_IDS = {
  javascript: 63, // Node.js 12.14.0
  python: 71,     // Python 3.8.1
  cpp: 54,        // C++ (GCC 9.2.0)
  java: 62,       // Java (OpenJDK 13.0.1)
  c: 50,          // C (GCC 9.2.0)
  go: 60,         // Go 1.13.5
  rust: 73,       // Rust 1.40.0
  php: 68,        // PHP 7.4.1
};

/**
 * Thử submit tới các Judge0 instances
 */
async function trySubmit(endpoint, payload, headers) {
  try {
    const response = await axios.post(`${endpoint}/submissions`, payload, {
      headers,
      params: {
        base64_encoded: "true",
        fields: "*",
      },
      timeout: 10000, // 10s timeout
    });
    return { success: true, data: response.data, endpoint };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || error.message,
      endpoint 
    };
  }
}

/**
 * Submit code với auto-retry
 */
async function executeCode(code, language, input, timeLimit = 5, memoryLimit = 256000) {
  try {
    const languageId = LANGUAGE_IDS[language];
    if (!languageId) {
      throw new Error(`Unsupported language: ${language}`);
    }

    const payload = {
      source_code: Buffer.from(code).toString("base64"),
      language_id: languageId,
      stdin: Buffer.from(input || "").toString("base64"),
      cpu_time_limit: timeLimit,
      memory_limit: memoryLimit,
    };

    const headers = {
      "Content-Type": "application/json",
    };

    console.log(`🔄 Submitting ${language} code...`);

    // Thử submit tới từng instance
    let submissionResult = null;
    let workingEndpoint = null;

    for (const endpoint of JUDGE0_INSTANCES) {
      console.log(`   Trying: ${endpoint}`);
      const result = await trySubmit(endpoint, payload, headers);
      
      if (result.success) {
        submissionResult = result.data;
        workingEndpoint = result.endpoint;
        console.log(`✅ Submission created via ${endpoint}`);
        break;
      } else {
        console.log(`❌ ${endpoint} failed: ${result.error}`);
      }
    }

    if (!submissionResult) {
      throw new Error("All Judge0 instances failed. Please try again later.");
    }

    const token = submissionResult.token;

    // Poll for result từ endpoint đã thành công
    let result;
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 500));

      try {
        const resultResponse = await axios.get(
          `${workingEndpoint}/submissions/${token}`,
          {
            headers,
            params: {
              base64_encoded: "true",
              fields: "*",
            },
            timeout: 10000,
          }
        );

        result = resultResponse.data;

        // Status 1-2: In Queue, Processing
        if (result.status.id > 2) {
          console.log(`✅ Execution complete: ${result.status.description}`);
          break;
        }
      } catch (pollError) {
        console.warn(`⚠️ Poll attempt ${attempts + 1} failed, retrying...`);
      }

      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new Error("Execution timeout - Judge0 took too long");
    }

    // Parse result
    return {
      status: getStatusString(result.status.id),
      stdout: result.stdout ? Buffer.from(result.stdout, "base64").toString("utf-8") : "",
      stderr: result.stderr ? Buffer.from(result.stderr, "base64").toString("utf-8") : "",
      compile_output: result.compile_output ? Buffer.from(result.compile_output, "base64").toString("utf-8") : "",
      time: parseFloat(result.time || 0),
      memory: parseInt(result.memory || 0),
      statusId: result.status.id,
    };
  } catch (error) {
    console.error("❌ Judge0 error:", error.message);
    throw new Error(`Execution failed: ${error.message}`);
  }
}

function getStatusString(statusId) {
  const statusMap = {
    1: "In Queue",
    2: "Processing",
    3: "Accepted",
    4: "Wrong Answer",
    5: "Time Limit Exceeded",
    6: "Compilation Error",
    7: "Runtime Error (SIGSEGV)",
    8: "Runtime Error (SIGXFSZ)",
    9: "Runtime Error (SIGFPE)",
    10: "Runtime Error (SIGABRT)",
    11: "Runtime Error (NZEC)",
    12: "Runtime Error (Other)",
    13: "Internal Error",
    14: "Exec Format Error",
  };
  return statusMap[statusId] || "Unknown";
}

/**
 * Judge submission với tất cả test cases
 */
function normalizeJudgeStatus(status) {
  if (!status) return "Runtime Error";

  if (status === "Accepted") return "Accepted";
  if (status === "Wrong Answer") return "Wrong Answer";
  if (status === "Time Limit Exceeded") return "Time Limit Exceeded";
  if (status === "Compilation Error") return "Compilation Error";

  if (status.startsWith("Runtime Error")) {
    return "Runtime Error";
  }

  return "Runtime Error";
}

async function judgeSubmission(code, language, testCases, timeLimit = 5, memoryLimit = 256000) {
  const results = [];
  let totalScore = 0;
  let maxScore = 0;
  let passedTests = 0;
  let overallStatus = "Accepted";
  let totalTime = 0;
  let maxMemory = 0;

  console.log(`🎯 Judging ${testCases.length} test cases...`);

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    maxScore += testCase.points || 1;

    console.log(`📝 Test case ${i + 1}/${testCases.length}...`);

    try {
      const result = await executeCode(code, language, testCase.input, timeLimit, memoryLimit);

      const actualOutput = result.stdout.trim();
      const expectedOutput = testCase.expectedOutput.trim();

      let rawStatus = result.status;
      let status = normalizeJudgeStatus(rawStatus);

      let points = 0;

      // Check compilation error
      if (status === "Compilation Error") {
        overallStatus = "Compilation Error";
        results.push({
          testCaseIndex: i,
          status: "Compilation Error",
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput: result.compile_output,
          error: result.compile_output,
          points: 0,
        });
        continue;
      }

      // Check runtime errors
      if (status === "Runtime Error" || status === "Time Limit Exceeded") {

        if (overallStatus === "Accepted") {
          overallStatus = status;
        }
        results.push({
          testCaseIndex: i,
          status,
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput: result.stderr || result.stdout || "",
          errorDetail: rawStatus,
          executionTime: result.time * 1000,
          memory: result.memory / 1024,
          points: 0,
        });
        continue;
      }

      // Check output match
      if (status === "Accepted" && actualOutput === expectedOutput) {
        status = "Accepted";
        points = testCase.points || 1;
        passedTests++;
        totalScore += points;
      } else if (status === "Accepted") {
        status = "Wrong Answer";
        overallStatus = "Wrong Answer";
      }

      totalTime += result.time * 1000;
      maxMemory = Math.max(maxMemory, result.memory / 1024);

      results.push({
        testCaseIndex: i,
        status,
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: actualOutput || result.stderr || "",
        executionTime: result.time * 1000,
        memory: result.memory / 1024,
        error: result.stderr || null,
        points,
      });

    } catch (error) {
      console.error(`❌ Test case ${i + 1} error:`, error.message);
      overallStatus = "Runtime Error";
      results.push({
        testCaseIndex: i,
        status: "Runtime Error",
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: "",
        error: error.message,
        points: 0,
      });
    }

    // Delay giữa các test để tránh rate limit
    if (i < testCases.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  // Determine final status
  if (passedTests === testCases.length) {
    overallStatus = "Accepted";
  } else if (passedTests > 0) {
    overallStatus = "Partial";
  }

  console.log(`✅ Judging complete: ${passedTests}/${testCases.length} passed`);

  return {
    status: overallStatus,
    testResults: results,
    score: totalScore,
    maxScore,
    passedTests,
    totalTests: testCases.length,
    totalExecutionTime: totalTime,
    maxMemoryUsed: maxMemory,
  };
}

module.exports = {
  executeCode,
  judgeSubmission,
};