import React, { useState, useEffect } from "react";
import CodeExerciseForm from "./CodeExerciseForm";
import ExerciseSettingsModal from "./CodeSettingsModal";

const API_URL = "http://localhost:5000/api";

// ✅ Danh sách categories
const CATEGORIES = [
  "Array",
  "String",
  "Math",
  "Algorithm",
  "Dynamic Programming",
  "Tree",
  "Graph",
  "Sorting",
  "Searching",
  "Hash Table",
  "Stack",
  "Queue",
  "Linked List",
  "General",
];

export default function CodeTab({ courseId, course, isTeacher, token, isEditMode }) {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    search: "",
    difficulty: "",
    category: "",
  });
  const [selectedExerciseId, setSelectedExerciseId] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null);
  const [selectedSettingsExercise, setSelectedSettingsExercise] = useState(null);

  useEffect(() => {
    if (token && courseId && !selectedExerciseId && !isCreating) {
      fetchExercises();
    }
  }, [filter, token, selectedExerciseId, courseId, isCreating]);

  // ✅ Fetch exercises theo courseId
  const fetchExercises = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.search) params.append("search", filter.search);
      if (filter.difficulty) params.append("difficulty", filter.difficulty);
      if (filter.category) params.append("category", filter.category);

      const response = await fetch(
        `${API_URL}/exercises/course/${courseId}?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();
      if (data.success) {
        setExercises(data.data || []);
      } else {
        setExercises([]);
        console.error("Error:", data.message);
      }
    } catch (error) {
      console.error("Fetch error:", error);
      setExercises([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle save success
  const handleSaveSuccess = (newExercise) => {
    if (editingExercise) {
      // Update exercise
      setExercises((prev) =>
        prev.map((ex) => (ex._id === newExercise._id ? newExercise : ex))
      );
    } else {
      // Add new exercise
      setExercises((prev) => [newExercise, ...prev]);
    }
    setIsCreating(false);
    setEditingExercise(null);
  };

  // ✅ Handle delete exercise
  const handleDeleteExercise = async (exerciseId) => {
    if (!window.confirm("Bạn có chắc muốn xóa bài tập này?")) return;

    try {
      const res = await fetch(`${API_URL}/exercises/${exerciseId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setExercises((prev) => prev.filter((ex) => ex._id !== exerciseId));
        alert("✅ Xóa bài tập thành công!");
      } else {
        alert("❌ " + (data.message || "Không thể xóa bài tập"));
      }
    } catch (err) {
      console.error(err);
      alert("❌ Lỗi kết nối server");
    }
  };

  const difficultyColors = {
    easy: "#4caf50",
    medium: "#ff9800",
    hard: "#f44336",
  };

  const difficultyLabels = {
    easy: "Dễ",
    medium: "Trung bình",
    hard: "Khó",
  };

  // ✅ Nếu đang tạo/sửa, hiển thị form
  if (isCreating) {
    return (
      <div className="exercise-tab">
        <CodeExerciseForm
          courseId={courseId}
          token={token}
          editingExercise={editingExercise}
          onSaveSuccess={handleSaveSuccess}
          onCancel={() => {
            setIsCreating(false);
            setEditingExercise(null);
          }}
        />
      </div>
    );
  }

  // ✅ Nếu chọn exercise, hiển thị detail view
  if (selectedExerciseId) {
    return (
      <ExerciseDetailView
        exerciseId={selectedExerciseId}
        token={token}
        onBack={() => setSelectedExerciseId(null)}
      />
    );
  }

  return (
    <div className="exercise-tab">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 style={{ margin: 0 }}> Danh sách bài tập Code</h2>
        {isTeacher && isEditMode && course?.editable && (
          <button
            onClick={() => {
              setEditingExercise(null);
              setIsCreating(true);
            }}
            style={{
              padding: "10px 20px",
              backgroundColor: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "bold",
            }}
          >
            ➕ Tạo bài tập
          </button>
        )}
      </div>

      {/* ✅ Filter bar */}
      <div style={{
        backgroundColor: "white",
        borderRadius: "8px",
        padding: "16px",
        marginBottom: "20px",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "12px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
      }}>
        <input
          type="text"
          placeholder="🔍 Tìm kiếm bài tập..."
          value={filter.search}
          onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          style={{
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "14px"
          }}
        />

        <select
          value={filter.difficulty}
          onChange={(e) => setFilter({ ...filter, difficulty: e.target.value })}
          style={{
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "14px"
          }}
        >
          <option value="">Tất cả độ khó</option>
          <option value="easy">Dễ</option>
          <option value="medium">Trung bình</option>
          <option value="hard">Khó</option>
        </select>

        <select
          value={filter.category}
          onChange={(e) => {
            console.log("Filter category changed:", e.target.value);
            setFilter({ ...filter, category: e.target.value });
          }}
          style={{
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "14px"
          }}
        >
          <option value="">Tất cả danh mục</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p>⏳ Đang tải bài tập...</p>
      ) : exercises.length === 0 ? (
        <p>Chưa có bài tập nào cho khóa học này.</p>
      ) : (
        <ul className="exercise-list">
          {exercises.map((exercise) => (
            <li
              key={exercise._id}
              className="exercise-item"
              style={{
                cursor: "pointer",
                backgroundColor: "white",
                borderRadius: "8px",
                padding: "16px",
                marginBottom: "12px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                transition: "all 0.3s ease",
                border: "1px solid #eee"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px" }}>
                <div onClick={() => setSelectedExerciseId(exercise._id)} style={{ flex: 1 }}>
                  <h4 style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: "600" }}>
                    {exercise.title}
                  </h4>
                  <p style={{
                    margin: "0 0 8px 0",
                    fontSize: "14px",
                    color: "#666",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical"
                  }}>
                    {exercise.description}
                  </p>
                </div>

                <div style={{ display: "flex", gap: "8px", marginLeft: "12px", flexDirection: "column", alignItems: "flex-end" }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "4px 12px",
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: "bold",
                      backgroundColor: difficultyColors[exercise.difficulty] || "#e0e0e0",
                      color: "#fff",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {difficultyLabels[exercise.difficulty]}
                  </span>

                  {/* ✅ Status Badge */}
                  <span
                    style={{
                      display: "inline-block",
                      padding: "4px 12px",
                      borderRadius: "20px",
                      fontSize: "11px",
                      fontWeight: "bold",
                      backgroundColor: exercise.status === "published" ? "#4CAF50" : "#FF9800",
                      color: "#fff",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {exercise.status === "published" ? "Published" : "Draft"}
                  </span>

                  {/* ✅ Attempts Info */}
                  {exercise.maxAttempts > 0 && (
                    <span
                      style={{
                        display: "inline-block",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        backgroundColor: "#e3f2fd",
                        color: "#1565c0",
                        whiteSpace: "nowrap"
                      }}
                    >
                      Tối đa {exercise.maxAttempts} lần
                    </span>
                  )}
                </div>
              </div>

              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "13px",
                color: "#888",
                marginBottom: "12px"
              }}>
                <span>{exercise.submissionCount || 0} lượt nộp</span>
                <span> {exercise.acceptanceRate || 0}% AC</span>
              </div>

              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: "12px",
                borderTop: "1px solid #eee"
              }}>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", flex: 1 }}>
                  {exercise.allowedLanguages?.slice(0, 3).map((lang) => (
                    <span
                      key={lang}
                      style={{
                        padding: "2px 8px",
                        backgroundColor: "#f0f0f0",
                        color: "#666",
                        borderRadius: "4px",
                        fontSize: "11px"
                      }}
                    >
                      {lang}
                    </span>
                  ))}
                  {exercise.allowedLanguages?.length > 3 && (
                    <span
                      style={{
                        padding: "2px 8px",
                        backgroundColor: "#f0f0f0",
                        color: "#666",
                        borderRadius: "4px",
                        fontSize: "11px"
                      }}
                    >
                      +{exercise.allowedLanguages.length - 3}
                    </span>
                  )}
                </div>

                <span style={{ fontSize: "12px", color: "#666", marginRight: "12px" }}>
                  {exercise.totalPoints} điểm
                </span>

                {/* ✅ Actions cho teacher */}
                {isTeacher && isEditMode && course?.editable && (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSettingsExercise(exercise);
                      }}
                      style={{
                        padding: "6px 10px",
                        backgroundColor: "#FF9800",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px",
                      }}
                      title="Cấu hình bài tập"
                    >
                      ⚙️
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingExercise(exercise);
                        setIsCreating(true);
                      }}
                      style={{
                        padding: "6px 10px",
                        backgroundColor: "#2196F3",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px",
                      }}
                      title="Sửa bài tập"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteExercise(exercise._id);
                      }}
                      style={{
                        padding: "6px 10px",
                        backgroundColor: "#f44336",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px",
                      }}
                      title="Xóa bài tập"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            </li>
          )          )}
        </ul>
      )}

      {/* ✅ Settings Modal */}
      {selectedSettingsExercise && (
        <ExerciseSettingsModal
          exercise={selectedSettingsExercise}
          token={token}
          onClose={() => setSelectedSettingsExercise(null)}
          onSaveSuccess={() => {
            // Refresh exercises list
            fetchExercises();
          }}
        />
      )}
    </div>
  );
}

// ✅ Component chi tiết bài tập
function ExerciseDetailView({ exerciseId, token, onBack }) {
  const [exercise, setExercise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("python");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [activeTab, setActiveTab] = useState("description");
  const [studentSubmissionCount, setStudentSubmissionCount] = useState(0);

  useEffect(() => {
    fetchExercise();
    fetchStudentSubmissions();
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
        headers: { Authorization: `Bearer ${token}` },
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

  // ✅ Fetch số lần nộp bài của student cho exercise này
  const fetchStudentSubmissions = async () => {
    try {
      const response = await fetch(
        `${API_URL}/submissions/exercise/${exerciseId}/count`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();
      if (data.success) {
        setStudentSubmissionCount(data.count || 0);
      }
    } catch (error) {
      console.error("Error fetching submission count:", error);
    }
  };

  const handleSubmit = async () => {
    if (!code.trim()) {
      alert("⚠️ Vui lòng nhập code!");
      return;
    }

    // ✅ Check giới hạn số lần làm
    if (exercise.maxAttempts > 0 && studentSubmissionCount >= exercise.maxAttempts) {
      alert(`❌ Bạn đã hết lượt làm! Giới hạn: ${exercise.maxAttempts} lần`);
      return;
    }

    setSubmitting(true);
    setShowResult(false);

    try {
      const response = await fetch(`${API_URL}/exercises/${exerciseId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code, language }),
      });

      const data = await response.json();
      if (data.success) {
        // ✅ Update submission count
        setStudentSubmissionCount(prev => prev + 1);
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
        headers: { Authorization: `Bearer ${token}` },
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
    Accepted: "#c8e6c9",
    Partial: "#fff9c4",
    "Wrong Answer": "#ffcdd2",
    "Runtime Error": "#ffcdd2",
    "Time Limit Exceeded": "#ffe0b2",
    "Compilation Error": "#ffcdd2",
  };

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <p>⏳ Đang tải bài tập...</p>
      </div>
    );
  }

  if (!exercise) {
    return (
      <div style={{ padding: "20px" }}>
        <button onClick={onBack} style={{
          padding: "8px 16px",
          backgroundColor: "#f5f5f5",
          border: "1px solid #ddd",
          borderRadius: "4px",
          cursor: "pointer",
          marginBottom: "16px"
        }}>
          ← Quay lại
        </button>
        <p>Không tìm thấy bài tập</p>
      </div>
    );
  }

  return (
    <div>
      <button onClick={onBack} style={{
        padding: "8px 16px",
        backgroundColor: "#f5f5f5",
        border: "1px solid #ddd",
        borderRadius: "4px",
        cursor: "pointer",
        marginBottom: "20px"
      }}>
        ← Quay lại
      </button>

      <h2 style={{ marginBottom: "20px" }}>{exercise.title}</h2>

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "20px",
        marginBottom: "20px"
      }}>
        {/* Left panel */}
        <div style={{
          backgroundColor: "white",
          borderRadius: "8px",
          padding: "16px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
        }}>
          <div style={{ borderBottom: "1px solid #eee", marginBottom: "16px", display: "flex" }}>
            <button
              onClick={() => setActiveTab("description")}
              style={{
                padding: "8px 16px",
                backgroundColor: activeTab === "description" ? "#f0f0f0" : "transparent",
                border: "none",
                borderBottom: activeTab === "description" ? "2px solid #2196F3" : "none",
                color: activeTab === "description" ? "#2196F3" : "#666",
                cursor: "pointer",
                fontWeight: activeTab === "description" ? "bold" : "normal"
              }}
            >
              Đề bài
            </button>
            <button
              onClick={() => setActiveTab("testcases")}
              style={{
                padding: "8px 16px",
                backgroundColor: activeTab === "testcases" ? "#f0f0f0" : "transparent",
                border: "none",
                borderBottom: activeTab === "testcases" ? "2px solid #2196F3" : "none",
                color: activeTab === "testcases" ? "#2196F3" : "#666",
                cursor: "pointer",
                fontWeight: activeTab === "testcases" ? "bold" : "normal"
              }}
            >
              Test Cases
            </button>
          </div>

          {activeTab === "description" && (
            <div>
              <p style={{ whiteSpace: "pre-wrap", color: "#333", marginBottom: "16px" }}>
                {exercise.description}
              </p>
              <div style={{
                padding: "12px",
                backgroundColor: "#f5f5f5",
                borderRadius: "4px",
                fontSize: "13px",
                color: "#666"
              }}>
                <p style={{ margin: "4px 0" }}>⏱️ Time Limit: {exercise.timeLimit}ms</p>
                <p style={{ margin: "4px 0" }}>💾 Memory Limit: {exercise.memoryLimit}MB</p>
                <p style={{ margin: "4px 0" }}>🎯 Tổng điểm: {exercise.totalPoints}</p>
                <p style={{ margin: "4px 0" }}>📝 Test cases: {exercise.testCases?.length || 0}</p>
              </div>
            </div>
          )}

          {activeTab === "testcases" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {exercise.testCases?.map((tc, i) => (
                <div key={i} style={{
                  border: "1px solid #eee",
                  borderRadius: "4px",
                  padding: "12px"
                }}>
                  <h4 style={{ marginTop: 0, marginBottom: "8px" }}>Test Case #{i + 1}</h4>
                  <div style={{ fontSize: "13px" }}>
                    <p style={{ color: "#666", marginBottom: "4px" }}>Input:</p>
                    <pre style={{
                      backgroundColor: "#f5f5f5",
                      padding: "8px",
                      borderRadius: "4px",
                      overflow: "auto",
                      fontSize: "12px",
                      marginBottom: "8px"
                    }}>
                      {tc.input}
                    </pre>
                    <p style={{ color: "#666", marginBottom: "4px" }}>Expected Output:</p>
                    <pre style={{
                      backgroundColor: "#f5f5f5",
                      padding: "8px",
                      borderRadius: "4px",
                      overflow: "auto",
                      fontSize: "12px"
                    }}>
                      {tc.expectedOutput}
                    </pre>
                    {tc.isHidden && (
                      <p style={{ color: "#f57c00", fontSize: "12px", marginTop: "8px" }}>
                        🔒 Hidden test case
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div style={{
          backgroundColor: "white",
          borderRadius: "8px",
          padding: "16px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
        }}>
          <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "14px"
              }}
            >
              {exercise.allowedLanguages?.map((lang) => (
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
              disabled={submitting || (exercise.maxAttempts > 0 && studentSubmissionCount >= exercise.maxAttempts)}
              style={{
                padding: "8px 16px",
                backgroundColor: 
                  submitting || (exercise.maxAttempts > 0 && studentSubmissionCount >= exercise.maxAttempts)
                    ? "#ccc" 
                    : "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: 
                  submitting || (exercise.maxAttempts > 0 && studentSubmissionCount >= exercise.maxAttempts)
                    ? "not-allowed" 
                    : "pointer",
                fontWeight: "bold"
              }}
            >
              {submitting ? "⏳ Đang chấm..." : "▶️ Nộp bài"}
            </button>
          </div>

          {/* ✅ Display attempts info */}
          {exercise.maxAttempts > 0 && (
            <div style={{
              padding: "12px",
              backgroundColor: studentSubmissionCount >= exercise.maxAttempts ? "#ffebee" : "#e8f5e9",
              borderRadius: "4px",
              marginBottom: "12px",
              fontSize: "13px",
              color: studentSubmissionCount >= exercise.maxAttempts ? "#d32f2f" : "#388e3c",
              fontWeight: "bold"
            }}>
              {studentSubmissionCount >= exercise.maxAttempts 
                ? `❌ Bạn đã hết lượt làm! (${studentSubmissionCount}/${exercise.maxAttempts})`
                : `🔄 Số lần còn lại: ${exercise.maxAttempts - studentSubmissionCount}/${exercise.maxAttempts}`
              }
            </div>
          )}

          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={exercise.maxAttempts > 0 && studentSubmissionCount >= exercise.maxAttempts}
            style={{
              width: "100%",
              height: "400px",
              fontFamily: "monospace",
              fontSize: "13px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              padding: "12px",
              resize: "none",
              boxSizing: "border-box",
              opacity: exercise.maxAttempts > 0 && studentSubmissionCount >= exercise.maxAttempts ? 0.5 : 1,
              cursor: exercise.maxAttempts > 0 && studentSubmissionCount >= exercise.maxAttempts ? "not-allowed" : "text"
            }}
            placeholder="Nhập code của bạn..."
          />
        </div>
      </div>

      {/* Results */}
      {showResult && result && (
        <div style={{
          backgroundColor: "white",
          borderRadius: "8px",
          padding: "20px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px"
          }}>
            <h3>Kết quả chấm bài</h3>
            <span style={{
              padding: "8px 16px",
              borderRadius: "20px",
              fontWeight: "bold",
              backgroundColor: statusColors[result.status] || "#e0e0e0"
            }}>
              {result.status}
            </span>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "12px",
            marginBottom: "16px"
          }}>
            <div style={{ textAlign: "center", padding: "12px", backgroundColor: "#e3f2fd", borderRadius: "4px" }}>
              <p style={{ fontSize: "18px", fontWeight: "bold", color: "#1976d2", margin: "0 0 4px 0" }}>
                {result.score}/{result.maxScore}
              </p>
              <p style={{ fontSize: "12px", color: "#666", margin: 0 }}>Điểm</p>
            </div>
            <div style={{ textAlign: "center", padding: "12px", backgroundColor: "#e8f5e9", borderRadius: "4px" }}>
              <p style={{ fontSize: "18px", fontWeight: "bold", color: "#388e3c", margin: "0 0 4px 0" }}>
                {result.passedTests}/{result.totalTests}
              </p>
              <p style={{ fontSize: "12px", color: "#666", margin: 0 }}>Tests Pass</p>
            </div>
            <div style={{ textAlign: "center", padding: "12px", backgroundColor: "#f3e5f5", borderRadius: "4px" }}>
              <p style={{ fontSize: "18px", fontWeight: "bold", color: "#7b1fa2", margin: "0 0 4px 0" }}>
                {result.totalExecutionTime?.toFixed(2)}ms
              </p>
              <p style={{ fontSize: "12px", color: "#666", margin: 0 }}>Thời gian</p>
            </div>
            <div style={{ textAlign: "center", padding: "12px", backgroundColor: "#ffe0b2", borderRadius: "4px" }}>
              <p style={{ fontSize: "18px", fontWeight: "bold", color: "#e65100", margin: "0 0 4px 0" }}>
                {result.maxMemoryUsed?.toFixed(2)}MB
              </p>
              <p style={{ fontSize: "12px", color: "#666", margin: 0 }}>Bộ nhớ</p>
            </div>
          </div>

          <h4>Chi tiết từng test case:</h4>
          {result.testResults?.map((tr, i) => (
            <div
              key={i}
              style={{
                border: tr.status === "Accepted" ? "2px solid #4caf50" : "2px solid #f44336",
                backgroundColor: tr.status === "Accepted" ? "#f1f8e9" : "#ffebee",
                borderRadius: "4px",
                padding: "12px",
                marginBottom: "12px"
              }}
            >
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px"
              }}>
                <h5 style={{ margin: 0 }}>Test Case #{i + 1}</h5>
                <span style={{
                  padding: "4px 12px",
                  borderRadius: "4px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  backgroundColor: tr.status === "Accepted" ? "#c8e6c9" : "#ffcdd2",
                  color: tr.status === "Accepted" ? "#2e7d32" : "#c62828"
                }}>
                  {tr.status}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "8px" }}>
                <div>
                  <p style={{ fontSize: "12px", color: "#666", margin: "0 0 4px 0" }}>Input:</p>
                  <pre style={{
                    backgroundColor: "white",
                    padding: "8px",
                    borderRadius: "4px",
                    overflow: "auto",
                    fontSize: "11px",
                    margin: 0
                  }}>
                    {tr.input}
                  </pre>
                </div>
                <div>
                  <p style={{ fontSize: "12px", color: "#666", margin: "0 0 4px 0" }}>Expected:</p>
                  <pre style={{
                    backgroundColor: "white",
                    padding: "8px",
                    borderRadius: "4px",
                    overflow: "auto",
                    fontSize: "11px",
                    margin: 0
                  }}>
                    {tr.expectedOutput}
                  </pre>
                </div>
              </div>

              <div>
                <p style={{ fontSize: "12px", color: "#666", margin: "0 0 4px 0" }}>Your Output:</p>
                <pre style={{
                  backgroundColor: "white",
                  padding: "8px",
                  borderRadius: "4px",
                  overflow: "auto",
                  fontSize: "11px",
                  margin: 0
                }}>
                  {tr.actualOutput || tr.error || "(empty)"}
                </pre>
              </div>

              {tr.error && (
                <p style={{ color: "#d32f2f", fontSize: "12px", marginTop: "8px" }}>
                  {tr.error}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}