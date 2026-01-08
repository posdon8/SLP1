import React, { useState, useEffect } from "react";

const API_URL = "http://localhost:5000/api";

export default function CodeDetail({ exerciseId, onBack }) {
  const [exercise, setExercise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("python");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [activeTab, setActiveTab] = useState("description");

  const TOKEN = localStorage.getItem("token");

  useEffect(() => {
    fetchExercise();
  }, [exerciseId]);

  useEffect(() => {
    if (exercise && language) {
      setCode(exercise.starterCode[language] || "");
    }
  }, [language, exercise]);

  const fetchExercise = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/exercises/${exerciseId}`, {
        headers: { Authorization: `Bearer ${TOKEN}` },
      });

      const data = await response.json();
      if (data.success) {
        setExercise(data.data);
        setLanguage(data.data.allowedLanguages[0]);
      } else {
        alert("❌ " + data.message);
      }
    } catch (error) {
      console.error("Fetch error:", error);
      alert("❌ Lỗi kết nối server");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!code.trim()) {
      alert("⚠️ Vui lòng nhập code!");
      return;
    }

    setSubmitting(true);
    setShowResult(false);

    try {
      const response = await fetch(`${API_URL}/exercises/${exerciseId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TOKEN}`,
        },
        body: JSON.stringify({ code, language }),
      });

      const data = await response.json();
      if (data.success) {
        pollSubmissionResult(data.data._id);
      } else {
        alert("❌ " + data.message);
        setSubmitting(false);
      }
    } catch (error) {
      console.error("Submit error:", error);
      alert("❌ Lỗi kết nối server");
      setSubmitting(false);
    }
  };

  const pollSubmissionResult = async (submissionId, attempts = 0) => {
    if (attempts > 30) {
      alert("⏱️ Timeout: Không thể lấy kết quả");
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/submissions/${submissionId}`, {
        headers: { Authorization: `Bearer ${TOKEN}` },
      });

      const data = await response.json();
      if (data.success) {
        const submission = data.data;

        if (submission.status === "Judging" || submission.status === "Pending") {
          setTimeout(() => pollSubmissionResult(submissionId, attempts + 1), 1000);
        } else {
          setResult(submission);
          setShowResult(true);
          setSubmitting(false);
        }
      }
    } catch (error) {
      console.error("Poll error:", error);
      setTimeout(() => pollSubmissionResult(submissionId, attempts + 1), 1000);
    }
  };

  const statusColors = {
    Accepted: "bg-green-100 text-green-800",
    Partial: "bg-yellow-100 text-yellow-800",
    "Wrong Answer": "bg-red-100 text-red-800",
    "Runtime Error": "bg-red-100 text-red-800",
    "Time Limit Exceeded": "bg-orange-100 text-orange-800",
    "Compilation Error": "bg-red-100 text-red-800",
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <button onClick={onBack} className="mb-4 px-4 py-2 bg-gray-200 rounded-lg">
          ← Quay lại
        </button>
        <p>Không tìm thấy bài tập</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              ← Quay lại
            </button>
            <h1 className="text-2xl font-bold text-gray-900">{exercise.title}</h1>
            <div className="w-24"></div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow">
            <div className="border-b flex">
              <button
                onClick={() => setActiveTab("description")}
                className={`px-6 py-3 font-medium ${
                  activeTab === "description"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-600"
                }`}
              >
                Đề bài
              </button>
              <button
                onClick={() => setActiveTab("testcases")}
                className={`px-6 py-3 font-medium ${
                  activeTab === "testcases"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-600"
                }`}
              >
                Test Cases
              </button>
            </div>

            <div className="p-6 max-h-[600px] overflow-y-auto">
              {activeTab === "description" && (
                <div>
                  <div className="mb-4">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      {exercise.difficulty === "easy" && "Dễ"}
                      {exercise.difficulty === "medium" && "Trung bình"}
                      {exercise.difficulty === "hard" && "Khó"}
                    </span>
                    <span className="ml-2 text-gray-600 text-sm">
                      {exercise.category}
                    </span>
                  </div>

                  <div className="prose prose-sm max-w-none">
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {exercise.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-6 border-t">
                    <h3 className="font-semibold mb-2">Thông tin:</h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>⏱️ Time Limit: {exercise.timeLimit}ms</li>
                      <li>💾 Memory Limit: {exercise.memoryLimit}MB</li>
                      <li>🎯 Tổng điểm: {exercise.totalPoints}</li>
                      <li>📝 Test cases: {exercise.testCases.length}</li>
                    </ul>
                  </div>
                </div>
              )}

              {activeTab === "testcases" && (
                <div className="space-y-4">
                  {exercise.testCases.map((tc, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-2">Test Case #{index + 1}</h4>
                      <div className="mb-2">
                        <p className="text-sm text-gray-600 mb-1">Input:</p>
                        <pre className="bg-gray-50 p-2 rounded text-sm overflow-x-auto font-mono">
                          {tc.input}
                        </pre>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Expected Output:</p>
                        <pre className="bg-gray-50 p-2 rounded text-sm overflow-x-auto font-mono">
                          {tc.expectedOutput}
                        </pre>
                      </div>
                      {tc.isHidden && (
                        <span className="text-xs text-yellow-600 mt-2 block">
                          🔒 Hidden test case
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="border-b p-4 flex items-center justify-between">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {exercise.allowedLanguages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang === "python" && "Python"}
                    {lang === "javascript" && "JavaScript"}
                    {lang === "cpp" && "C++"}
                    {lang === "java" && "Java"}
                  </option>
                ))}
              </select>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
              >
                {submitting ? "⏳ Đang chấm..." : "▶️ Nộp bài"}
              </button>
            </div>

            <div className="p-4">
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full h-[500px] font-mono text-sm border rounded-lg p-4 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                spellCheck={false}
                placeholder="Nhập code của bạn..."
              />
            </div>
          </div>
        </div>

        {showResult && result && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Kết quả chấm bài</h2>
              <span
                className={`px-4 py-2 rounded-full font-semibold ${
                  statusColors[result.status] || "bg-gray-100 text-gray-800"
                }`}
              >
                {result.status}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">
                  {result.score}/{result.maxScore}
                </p>
                <p className="text-sm text-gray-600">Điểm</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {result.passedTests}/{result.totalTests}
                </p>
                <p className="text-sm text-gray-600">Tests Pass</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">
                  {result.totalExecutionTime.toFixed(2)}ms
                </p>
                <p className="text-sm text-gray-600">Thời gian</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">
                  {result.maxMemoryUsed.toFixed(2)}MB
                </p>
                <p className="text-sm text-gray-600">Bộ nhớ</p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold mb-2">Chi tiết từng test case:</h3>
              {result.testResults.map((tr, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${
                    tr.status === "Accepted" ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">Test #{index + 1}</h4>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        tr.status === "Accepted"
                          ? "bg-green-200 text-green-800"
                          : "bg-red-200 text-red-800"
                      }`}
                    >
                      {tr.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 mb-1">Input:</p>
                      <pre className="bg-white p-2 rounded overflow-x-auto font-mono text-xs">
                        {tr.input}
                      </pre>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Expected:</p>
                      <pre className="bg-white p-2 rounded overflow-x-auto font-mono text-xs">
                        {tr.expectedOutput}
                      </pre>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-600 mb-1">Your Output:</p>
                      <pre className="bg-white p-2 rounded overflow-x-auto font-mono text-xs">
                        {tr.actualOutput || tr.error || "(empty)"}
                      </pre>
                    </div>
                  </div>

                  {tr.error && (
                    <div className="mt-2">
                      <p className="text-red-600 text-sm">{tr.error}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}