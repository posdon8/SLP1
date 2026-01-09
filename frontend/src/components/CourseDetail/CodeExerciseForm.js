import React, { useState, useEffect } from "react";

const API_URL = process.env.REACT_APP_API_URL;

// ✅ Danh sách categories có sẵn
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

export default function CodeExerciseForm({
  courseId,
  token,
  editingExercise,
  onSaveSuccess,
  onCancel,
}) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    difficulty: "medium",
    category: "Array",
    allowedLanguages: ["python", "javascript", "cpp", "java"],
    timeLimit: 5000,
    memoryLimit: 256,
    totalPoints: 100,
    testCases: [{ input: "", expectedOutput: "", isHidden: false, points: 1 }],
    starterCode: {
      python: "def solution():\n    pass",
      javascript: "function solution() {\n    // code here\n}",
      cpp: "#include <iostream>\nusing namespace std;\n\nint main() {\n    // code here\n    return 0;\n}",
      java: "public class Solution {\n    public static void main(String[] args) {\n        // code here\n    }\n}",
    },
    // ✅ Status được quản lý riêng trong Settings Modal
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ✅ Load dữ liệu khi edit
  useEffect(() => {
    if (editingExercise) {
      setFormData({
        title: editingExercise.title,
        description: editingExercise.description,
        difficulty: editingExercise.difficulty,
        category: editingExercise.category,
        allowedLanguages: editingExercise.allowedLanguages,
        timeLimit: editingExercise.timeLimit,
        memoryLimit: editingExercise.memoryLimit,
        totalPoints: editingExercise.totalPoints,
        testCases: editingExercise.testCases,
        starterCode: editingExercise.starterCode,
        status: editingExercise.status,
      });
    }
  }, [editingExercise]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleTestCaseChange = (index, field, value) => {
    const newTestCases = [...formData.testCases];
    newTestCases[index] = { ...newTestCases[index], [field]: value };
    setFormData({ ...formData, testCases: newTestCases });
  };

  const handleLanguageToggle = (lang) => {
    const updated = formData.allowedLanguages.includes(lang)
      ? formData.allowedLanguages.filter((l) => l !== lang)
      : [...formData.allowedLanguages, lang];
    setFormData({ ...formData, allowedLanguages: updated });
  };

  const addTestCase = () => {
    setFormData({
      ...formData,
      testCases: [
        ...formData.testCases,
        { input: "", expectedOutput: "", isHidden: false, points: 1 },
      ],
    });
  };

  const removeTestCase = (index) => {
    if (formData.testCases.length > 1) {
      setFormData({
        ...formData,
        testCases: formData.testCases.filter((_, i) => i !== index),
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.title.trim()) {
      setError("Tiêu đề là bắt buộc");
      return;
    }

    if (!formData.description.trim()) {
      setError("Mô tả là bắt buộc");
      return;
    }

    if (formData.testCases.length === 0) {
      setError("Phải có ít nhất 1 test case");
      return;
    }

    if (formData.allowedLanguages.length === 0) {
      setError("Phải chọn ít nhất 1 ngôn ngữ");
      return;
    }

    setLoading(true);

    try {
      const url = editingExercise
        ? `${API_URL}/exercises/${editingExercise._id}`
        : `${API_URL}/exercises`;

      const method = editingExercise ? "PUT" : "POST";

      const payload = {
        ...formData,
        courseId,
        // ✅ Bỏ status - sẽ set trong Settings Modal
        status: undefined,
      };

      // Xóa undefined fields
      delete payload.status;

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      console.log("Response status:", res.status);
      console.log("Response data:", data);

      if (res.ok && data.success) {
        alert(editingExercise ? "✅ Cập nhật thành công!" : "✅ Tạo bài tập thành công!");
        onSaveSuccess(data.data);
      } else {
        // ✅ Hiển thị lỗi chi tiết từ server
        const errorMsg = data.message || data.error || "Lỗi khi lưu bài tập";
        console.error("Error details:", errorMsg);
        setError(errorMsg);
      }
    } catch (err) {
      console.error("Submit error:", err);
      setError("Lỗi kết nối server: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDebug = () => {
    console.log("FormData being sent:", {
      title: formData.title,
      description: formData.description,
      courseId: courseId,
      difficulty: formData.difficulty,
      category: formData.category,
      allowedLanguages: formData.allowedLanguages,
      timeLimit: formData.timeLimit,
      memoryLimit: formData.memoryLimit,
      totalPoints: formData.totalPoints,
      testCases: formData.testCases,
      status: formData.status,
    });
  };

  return (
    <div style={{
      backgroundColor: "white",
      borderRadius: "8px",
      padding: "24px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      maxHeight: "80vh",
      overflowY: "auto",
    }}>
      <h2 style={{ marginTop: 0 }}>
        {editingExercise ? "✏️ Sửa bài tập" : "➕ Tạo bài tập mới"}
      </h2>

      {error && (
        <div style={{
          backgroundColor: "#ffebee",
          color: "#d32f2f",
          padding: "12px",
          borderRadius: "4px",
          marginBottom: "16px",
          borderLeft: "4px solid #d32f2f"
        }}>
          ❌ {error}
        </div>
      )}

      {/* Debug Info */}
      <div style={{
        backgroundColor: "#f5f5f5",
        padding: "12px",
        borderRadius: "4px",
        marginBottom: "16px",
        fontSize: "12px",
        color: "#666"
      }}>
        <button
          type="button"
          onClick={handleDebug}
          style={{
            padding: "4px 8px",
            backgroundColor: "#2196F3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "11px",
            marginBottom: "8px"
          }}
        >
          🔍 Kiểm tra dữ liệu gửi
        </button>
        <p style={{ margin: "4px 0" }}>
          Course ID: <strong>{courseId || "❌ KHÔNG CÓ"}</strong>
        </p>
        <p style={{ margin: "4px 0" }}>
          Test Cases: <strong>{formData.testCases.length}</strong>
        </p>
        <p style={{ margin: "4px 0" }}>
          Ngôn ngữ: <strong>{formData.allowedLanguages.join(", ")}</strong>
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Tiêu đề */}
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>
            Tiêu đề <span style={{ color: "red" }}>*</span>
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="Ví dụ: Two Sum"
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "14px",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Mô tả */}
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>
            Mô tả <span style={{ color: "red" }}>*</span>
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Mô tả chi tiết bài tập..."
            style={{
              width: "100%",
              height: "150px",
              padding: "8px 12px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "14px",
              boxSizing: "border-box",
              fontFamily: "inherit",
              resize: "vertical",
            }}
          />
        </div>

        {/* Độ khó & Danh mục */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>
              Độ khó
            </label>
            <select
              name="difficulty"
              value={formData.difficulty}
              onChange={handleInputChange}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "14px",
                boxSizing: "border-box",
              }}
            >
              <option value="easy">Dễ</option>
              <option value="medium">Trung bình</option>
              <option value="hard">Khó</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>
              Danh mục <span style={{ color: "red" }}>*</span>
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "14px",
                boxSizing: "border-box",
              }}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Thời gian & Bộ nhớ & Điểm */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "16px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>
              Time Limit (ms)
            </label>
            <input
              type="number"
              name="timeLimit"
              value={formData.timeLimit}
              onChange={handleInputChange}
              min="100"
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "14px",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>
              Memory Limit (MB)
            </label>
            <input
              type="number"
              name="memoryLimit"
              value={formData.memoryLimit}
              onChange={handleInputChange}
              min="32"
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "14px",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>
              Tổng điểm
            </label>
            <input
              type="number"
              name="totalPoints"
              value={formData.totalPoints}
              onChange={handleInputChange}
              min="1"
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "14px",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {/* Ngôn ngữ */}
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
            Ngôn ngữ được phép <span style={{ color: "red" }}>*</span>
          </label>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {["python", "javascript", "cpp", "java"].map((lang) => (
              <label key={lang} style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={formData.allowedLanguages.includes(lang)}
                  onChange={() => handleLanguageToggle(lang)}
                  style={{ marginRight: "6px", cursor: "pointer" }}
                />
                {lang === "python" && "Python"}
                {lang === "javascript" && "JavaScript"}
                {lang === "cpp" && "C++"}
                {lang === "java" && "Java"}
              </label>
            ))}
          </div>
        </div>

        {/* Test Cases */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <label style={{ fontWeight: "bold" }}>
              Test Cases <span style={{ color: "red" }}>*</span>
            </label>
            <button
              type="button"
              onClick={addTestCase}
              style={{
                padding: "6px 12px",
                backgroundColor: "#2196F3",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              ➕ Thêm Test Case
            </button>
          </div>

          {formData.testCases.map((tc, index) => (
            <div
              key={index}
              style={{
                border: "1px solid #eee",
                borderRadius: "4px",
                padding: "12px",
                marginBottom: "12px",
                backgroundColor: "#f9f9f9",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontWeight: "bold" }}>Test Case #{index + 1}</span>
                {formData.testCases.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTestCase(index)}
                    style={{
                      padding: "4px 8px",
                      backgroundColor: "#f44336",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "12px",
                    }}
                  >
                    🗑️ Xóa
                  </button>
                )}
              </div>

              <div style={{ marginBottom: "8px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px" }}>
                  Input
                </label>
                <textarea
                  value={tc.input}
                  onChange={(e) => handleTestCaseChange(index, "input", e.target.value)}
                  placeholder="Nhập input..."
                  style={{
                    width: "100%",
                    height: "80px",
                    padding: "8px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontFamily: "monospace",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ marginBottom: "8px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px" }}>
                  Expected Output
                </label>
                <textarea
                  value={tc.expectedOutput}
                  onChange={(e) => handleTestCaseChange(index, "expectedOutput", e.target.value)}
                  placeholder="Nhập expected output..."
                  style={{
                    width: "100%",
                    height: "80px",
                    padding: "8px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontFamily: "monospace",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <label style={{ display: "flex", alignItems: "center", cursor: "pointer", fontSize: "13px" }}>
                  <input
                    type="checkbox"
                    checked={tc.isHidden}
                    onChange={(e) => handleTestCaseChange(index, "isHidden", e.target.checked)}
                    style={{ marginRight: "6px", cursor: "pointer" }}
                  />
                  Test case ẩn (Hidden)
                </label>

                <div>
                  <label style={{ display: "block", marginBottom: "2px", fontSize: "12px" }}>
                    Điểm test case này
                  </label>
                  <input
                    type="number"
                    value={tc.points}
                    onChange={(e) => handleTestCaseChange(index, "points", parseInt(e.target.value))}
                    min="1"
                    style={{
                      width: "100%",
                      padding: "4px 8px",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      fontSize: "12px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: "10px 20px",
              backgroundColor: "#f5f5f5",
              border: "1px solid #ddd",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "bold",
            }}
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "10px 20px",
              backgroundColor: loading ? "#ccc" : "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontWeight: "bold",
            }}
          >
            {loading ? "⏳ Đang lưu..." : editingExercise ? "Cập nhật" : "Tạo bài tập"}
          </button>
        </div>
      </form>
    </div>
  );
}