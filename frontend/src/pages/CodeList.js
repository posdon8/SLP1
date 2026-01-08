import React, { useState, useEffect } from "react";

const API_URL = "http://localhost:5000/api";

export default function CodeList() {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({
    search: "",
    difficulty: "",
    category: "",
  });
  const [selectedExerciseId, setSelectedExerciseId] = useState(null);

  const TOKEN = localStorage.getItem("token");

  useEffect(() => {
    if (TOKEN && !selectedExerciseId) {
      fetchExercises();
    }
  }, [filter, TOKEN, selectedExerciseId]);

  const fetchExercises = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.search) params.append("search", filter.search);
      if (filter.difficulty) params.append("difficulty", filter.difficulty);
      if (filter.category) params.append("category", filter.category);

      const response = await fetch(`${API_URL}/exercises?${params}`, {
        headers: { Authorization: `Bearer ${TOKEN}` },
      });

      const data = await response.json();
      if (data.success) {
        setExercises(data.data);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const difficultyColors = {
    easy: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    hard: "bg-red-100 text-red-800",
  };

  const difficultyLabels = {
    easy: "Dễ",
    medium: "Trung bình",
    hard: "Khó",
  };

  if (selectedExerciseId) {
    return (
      <ExerciseDetailView
        exerciseId={selectedExerciseId}
        onBack={() => setSelectedExerciseId(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          💻 Bài tập lập trình
        </h1>

        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="🔍 Tìm kiếm bài tập..."
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />

            <select
              value={filter.difficulty}
              onChange={(e) => setFilter({ ...filter, difficulty: e.target.value })}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Tất cả độ khó</option>
              <option value="easy">Dễ</option>
              <option value="medium">Trung bình</option>
              <option value="hard">Khó</option>
            </select>

            <select
              value={filter.category}
              onChange={(e) => setFilter({ ...filter, category: e.target.value })}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Tất cả danh mục</option>
              <option value="Array">Array</option>
              <option value="String">String</option>
              <option value="Math">Math</option>
              <option value="Algorithm">Algorithm</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Đang tải...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exercises.map((exercise) => (
              <div
                key={exercise._id}
                onClick={() => setSelectedExerciseId(exercise._id)}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer p-6"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 flex-1">
                    {exercise.title}
                  </h3>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      difficultyColors[exercise.difficulty]
                    }`}
                  >
                    {difficultyLabels[exercise.difficulty]}
                  </span>
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {exercise.description}
                </p>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>📊 {exercise.submissionCount || 0} lượt nộp</span>
                  <span>
                    ✅ {exercise.acceptanceRate || 0}% AC
                  </span>
                </div>

                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                  <div className="flex gap-2">
                    {exercise.allowedLanguages.slice(0, 3).map((lang) => (
                      <span
                        key={lang}
                        className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                      >
                        {lang}
                      </span>
                    ))}
                    {exercise.allowedLanguages.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                        +{exercise.allowedLanguages.length - 3}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {exercise.totalPoints} điểm
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && exercises.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500 text-lg">Không có bài tập nào</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ExerciseDetailView({ exerciseId, onBack }) {
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
    if (exercise && language && exercise.starterCode) {
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
        if (data.data.allowedLanguages && data.data.allowedLanguages.length > 0) {
          setLanguage(data.data.allowedLanguages[0]);
        }
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
      alert("⏱️ Timeout");
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
        <button onClick={onBack} className="mb-4 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
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
          <button
            onClick={onBack}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            ← Quay lại
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">{exercise.title}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="border-b flex mb-4">
              <button
                onClick={() => setActiveTab("description")}
                className={`px-4 py-2 font-medium ${
                  activeTab === "description"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-600"
                }`}
              >
                Đề bài
              </button>
              <button
                onClick={() => setActiveTab("testcases")}
                className={`px-4 py-2 font-medium ${
                  activeTab === "testcases"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-600"
                }`}
              >
                Test Cases
              </button>
            </div>

            {activeTab === "description" && (
              <div>
                <p className="whitespace-pre-wrap text-gray-700 mb-4">
                  {exercise.description}
                </p>
                <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
                  <p className="mb-1">⏱️ Time Limit: {exercise.timeLimit}ms</p>
                  <p className="mb-1">💾 Memory Limit: {exercise.memoryLimit}MB</p>
                  <p className="mb-1">🎯 Total Points: {exercise.totalPoints}</p>
                  <p>📝 Test Cases: {exercise.testCases?.length || 0}</p>
                </div>
              </div>
            )}

            {activeTab === "testcases" && (
              <div className="space-y-3">
                {exercise.testCases && exercise.testCases.map((tc, i) => (
                  <div key={i} className="border rounded-lg p-3">
                    <h4 className="font-semibold mb-2">Test Case #{i + 1}</h4>
                    <div className="text-sm">
                      <p className="text-gray-600 mb-1">Input:</p>
                      <pre className="bg-gray-50 p-2 rounded mb-2 font-mono text-xs overflow-x-auto">
                        {tc.input}
                      </pre>
                      <p className="text-gray-600 mb-1">Expected Output:</p>
                      <pre className="bg-gray-50 p-2 rounded font-mono text-xs overflow-x-auto">
                        {tc.expectedOutput}
                      </pre>
                      {tc.isHidden && (
                        <span className="text-xs text-yellow-600 mt-2 block">
                          🔒 Hidden test case
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex gap-4 mb-4">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {exercise.allowedLanguages && exercise.allowedLanguages.map((lang) => (
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

            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-96 font-mono text-sm border rounded-lg p-4 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              spellCheck={false}
              placeholder="Nhập code của bạn..."
            />
          </div>
        </div>

        {showResult && result && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
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
              {result.testResults && result.testResults.map((tr, i) => (
                <div
                  key={i}
                  className={`border rounded-lg p-4 ${
                    tr.status === "Accepted"
                      ? "border-green-300 bg-green-50"
                      : "border-red-300 bg-red-50"
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold">Test Case #{i + 1}</h4>
                    <span
                      className={`px-3 py-1 rounded text-sm font-medium ${
                        tr.status === "Accepted"
                          ? "bg-green-200 text-green-800"
                          : "bg-red-200 text-red-800"
                      }`}
                    >
                      {tr.status}
                    </span>
                  </div>

                  <div className="text-sm grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-gray-600 mb-1">Input:</p>
                      <pre className="bg-white p-2 rounded font-mono text-xs overflow-x-auto">
                        {tr.input}
                      </pre>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Expected:</p>
                      <pre className="bg-white p-2 rounded font-mono text-xs overflow-x-auto">
                        {tr.expectedOutput}
                      </pre>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-600 mb-1">Your Output:</p>
                      <pre className="bg-white p-2 rounded font-mono text-xs overflow-x-auto">
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