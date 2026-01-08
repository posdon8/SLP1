import React, { useState, useEffect } from "react";

const API_URL = "http://localhost:5000/api";

export default function CodeManage({ onNavigate }) {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null);
  const [filter, setFilter] = useState({ search: "", difficulty: "", category: "" });
  const [user, setUser] = useState(null);

  const TOKEN = localStorage.getItem("token");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    difficulty: "medium",
    category: "Algorithm",
    allowedLanguages: ["python"],
    testCases: [{ input: "", expectedOutput: "", isHidden: false, points: 10 }],
    starterCode: {
      python: "# Your code here\n",
      javascript: "// Your code here\n",
      cpp: "#include <iostream>\nusing namespace std;\n\nint main() {\n    // Your code here\n    return 0;\n}",
      java: "public class Main {\n    public static void main(String[] args) {\n        // Your code here\n    }\n}",
    },
    timeLimit: 1000,
    memoryLimit: 128,
    totalPoints: 100,
    status: "draft",
  });

  // Load user
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser && storedUser !== "undefined") {
      try {
        setUser(JSON.parse(storedUser));
      } catch (err) {
        console.error("Parse user error:", err);
      }
    }
  }, []);

  // Fetch exercises
  useEffect(() => {
    if (TOKEN) fetchExercises();
  }, [TOKEN, filter]);

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

  const openAddModal = () => {
    resetForm();
    setEditingExercise(null);
    setShowModal(true);
  };

  const openEditModal = (exercise) => {
    setEditingExercise(exercise);
    setFormData({
      title: exercise.title,
      description: exercise.description,
      difficulty: exercise.difficulty,
      category: exercise.category,
      allowedLanguages: exercise.allowedLanguages,
      testCases: exercise.testCases,
      starterCode: exercise.starterCode,
      timeLimit: exercise.timeLimit,
      memoryLimit: exercise.memoryLimit,
      totalPoints: exercise.totalPoints,
      status: exercise.status,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert("⚠️ Tiêu đề không được để trống!");
      return;
    }

    if (formData.testCases.length === 0) {
      alert("⚠️ Phải có ít nhất 1 test case!");
      return;
    }

    setLoading(true);

    try {
      const response = editingExercise
        ? await fetch(`${API_URL}/exercises/${editingExercise._id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${TOKEN}`,
            },
            body: JSON.stringify(formData),
          })
        : await fetch(`${API_URL}/exercises`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${TOKEN}`,
            },
            body: JSON.stringify(formData),
          });

      const data = await response.json();

      if (data.success) {
        alert("✅ " + data.message);
        setShowModal(false);
        resetForm();
        fetchExercises();
      } else {
        alert("❌ " + data.message);
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("❌ Lỗi kết nối server");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("⚠️ Bạn có chắc muốn xóa bài tập này?")) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/exercises/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${TOKEN}` },
      });

      const data = await response.json();
      if (data.success) {
        alert("✅ Xóa bài tập thành công");
        fetchExercises();
      } else {
        alert("❌ " + data.message);
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("❌ Lỗi kết nối server");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      difficulty: "medium",
      category: "Algorithm",
      allowedLanguages: ["python"],
      testCases: [{ input: "", expectedOutput: "", isHidden: false, points: 10 }],
      starterCode: {
        python: "# Your code here\n",
        javascript: "// Your code here\n",
        cpp: "#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}",
        java: "public class Main {\n    public static void main(String[] args) {\n    }\n}",
      },
      timeLimit: 1000,
      memoryLimit: 128,
      totalPoints: 100,
      status: "draft",
    });
  };

  const addTestCase = () => {
    setFormData({
      ...formData,
      testCases: [...formData.testCases, { input: "", expectedOutput: "", isHidden: false, points: 10 }],
    });
  };

  const updateTestCase = (index, field, value) => {
    const newTestCases = [...formData.testCases];
    newTestCases[index][field] = value;
    setFormData({ ...formData, testCases: newTestCases });
  };

  const removeTestCase = (index) => {
    const newTestCases = formData.testCases.filter((_, i) => i !== index);
    setFormData({ ...formData, testCases: newTestCases });
  };

  const toggleLanguage = (lang) => {
    const newLangs = formData.allowedLanguages.includes(lang)
      ? formData.allowedLanguages.filter((l) => l !== lang)
      : [...formData.allowedLanguages, lang];
    setFormData({ ...formData, allowedLanguages: newLangs });
  };

  const isTeacher = user?.roles?.includes("teacher");
  const isAdmin = user?.roles?.includes("admin");

  const difficultyColors = {
    easy: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    hard: "bg-red-100 text-red-800",
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">💻 Quản lý Bài tập Code</h1>

        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="🔍 Tìm kiếm..."
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

            {(isAdmin || isTeacher) && (
              <button
                onClick={openAddModal}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                ➕ Thêm bài tập
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Đang tải...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exercises.map((exercise) => {
              const isAuthor = exercise.author?._id === user?._id;
              const canEdit = isAdmin || (isTeacher && isAuthor);

              return (
                <div key={exercise._id} className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3
                      className="text-lg font-semibold text-gray-900 flex-1 cursor-pointer hover:text-blue-600"
                      onClick={() => onNavigate && onNavigate(`/exercises/${exercise._id}`)}
                    >
                      {exercise.title}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${difficultyColors[exercise.difficulty]}`}>
                      {exercise.difficulty === "easy" && "Dễ"}
                      {exercise.difficulty === "medium" && "TB"}
                      {exercise.difficulty === "hard" && "Khó"}
                    </span>
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{exercise.description}</p>

                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span>📊 {exercise.submissionCount || 0} nộp</span>
                    <span>✅ {exercise.acceptanceRate || 0}% AC</span>
                  </div>

                  <div className="flex gap-2 mb-4">
                    {exercise.allowedLanguages.slice(0, 3).map((lang) => (
                      <span key={lang} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                        {lang}
                      </span>
                    ))}
                  </div>

                  {canEdit && (
                    <div className="pt-4 border-t flex gap-2">
                      <button
                        onClick={() => openEditModal(exercise)}
                        className="flex-1 px-3 py-2 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 text-sm"
                      >
                        ✏️ Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(exercise._id)}
                        className="flex-1 px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                      >
                        🗑️ Xóa
                      </button>
                    </div>
                  )}

                  {(isAdmin || isTeacher) && (
                    <div className="mt-2 text-xs text-gray-500">
                      Trạng thái: {exercise.status === "published" ? "📢 Đã xuất bản" : "📝 Nháp"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!loading && exercises.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500 text-lg mb-4">Chưa có bài tập nào</p>
            {(isAdmin || isTeacher) && (
              <button onClick={openAddModal} className="px-6 py-2 bg-blue-600 text-white rounded-lg">
                ➕ Tạo bài tập đầu tiên
              </button>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold mb-4">
              {editingExercise ? "✏️ Chỉnh sửa bài tập" : "➕ Thêm bài tập mới"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tiêu đề *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Mô tả *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="4"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Độ khó</label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="easy">Dễ</option>
                    <option value="medium">Trung bình</option>
                    <option value="hard">Khó</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Danh mục</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Ngôn ngữ được phép</label>
                <div className="flex gap-4">
                  {["python", "javascript", "cpp", "java"].map((lang) => (
                    <label key={lang} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.allowedLanguages.includes(lang)}
                        onChange={() => toggleLanguage(lang)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{lang}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Test Cases *</label>
                {formData.testCases.map((tc, index) => (
                  <div key={index} className="border rounded-lg p-4 mb-3 bg-gray-50">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">Test Case #{index + 1}</h4>
                      {formData.testCases.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTestCase(index)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          ✖️ Xóa
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-2">
                      <div>
                        <label className="block text-xs mb-1">Input</label>
                        <textarea
                          value={tc.input}
                          onChange={(e) => updateTestCase(index, "input", e.target.value)}
                          rows="2"
                          className="w-full px-3 py-2 border rounded text-sm font-mono"
                          placeholder="5 7"
                        />
                      </div>

                      <div>
                        <label className="block text-xs mb-1">Expected Output</label>
                        <textarea
                          value={tc.expectedOutput}
                          onChange={(e) => updateTestCase(index, "expectedOutput", e.target.value)}
                          rows="2"
                          className="w-full px-3 py-2 border rounded text-sm font-mono"
                          placeholder="12"
                        />
                      </div>
                    </div>

                    <div className="flex gap-4 items-center">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tc.isHidden}
                          onChange={(e) => updateTestCase(index, "isHidden", e.target.checked)}
                        />
                        <span className="text-sm">Test case ẩn</span>
                      </label>

                      <label className="flex items-center gap-2">
                        <span className="text-sm">Điểm:</span>
                        <input
                          type="number"
                          value={tc.points}
                          onChange={(e) => updateTestCase(index, "points", parseInt(e.target.value))}
                          className="w-20 px-2 py-1 border rounded text-sm"
                          min="1"
                        />
                      </label>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addTestCase}
                  className="px-4 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm"
                >
                  ➕ Thêm test case
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Time Limit (ms)</label>
                  <input
                    type="number"
                    value={formData.timeLimit}
                    onChange={(e) => setFormData({ ...formData, timeLimit: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border rounded-lg"
                    min="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Memory Limit (MB)</label>
                  <input
                    type="number"
                    value={formData.memoryLimit}
                    onChange={(e) => setFormData({ ...formData, memoryLimit: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border rounded-lg"
                    min="32"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Tổng điểm</label>
                  <input
                    type="number"
                    value={formData.totalPoints}
                    onChange={(e) => setFormData({ ...formData, totalPoints: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border rounded-lg"
                    min="1"
                  />
                </div>
              </div>

              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium mb-1">Trạng thái</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="draft">Nháp</option>
                    <option value="published">Đã xuất bản</option>
                  </select>
                </div>
              )}

              <div className="flex gap-4 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                  disabled={loading}
                >
                  ❌ Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  disabled={loading}
                >
                  {loading ? "⏳ Đang lưu..." : editingExercise ? "💾 Cập nhật" : "➕ Tạo mới"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}