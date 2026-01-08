import React, { useState, useEffect, useCallback } from "react";
import "./NewsManage.css";
import NewsDetail from "./NewsDetail";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

// ✅ API wrapper
const newsAPI = {
  getAll: (params, token) =>
    fetch(`${API_URL}/news?${new URLSearchParams(params)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }),

  create: (data, token) =>
    fetch(`${API_URL}/news`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    }).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }),

  update: (id, data, token) =>
    fetch(`${API_URL}/news/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    }).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }),

  delete: (id, token) =>
    fetch(`${API_URL}/news/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }),

  getStatistics: (token) =>
    fetch(`${API_URL}/news/admin/statistics`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }),

  uploadThumbnail: (file, token) => {
    const formData = new FormData();
    formData.append("thumbnail", file);
    return fetch(`${API_URL}/news/upload-thumbnail`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
  },
};

export default function NewsManagement() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingNews, setEditingNews] = useState(null);
  const [stats, setStats] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [user, setUser] = useState(null);
  const [draggedFile, setDraggedFile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedNewsId, setSelectedNewsId] = useState(null);

  const TOKEN = localStorage.getItem("token");
  const roles = user?.roles || [];
  const isAdmin = roles.includes("admin");
  const isTeacher = roles.includes("teacher");


  const categories = ["Thông báo", "Sự kiện", "Tin tức", "Học thuật"];
  const statusOptions = [
    { value: "draft", label: "Nháp" },
    { value: "published", label: "Đã xuất bản" },
  ];

  const [formData, setFormData] = useState({
    title: "",
    category: "Tin tức",
    thumbnail: "",
    description: "",
    status: "draft",
    tags: "",
  });

  // ✅ Lấy user từ localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser && storedUser !== "undefined") {
      try {
        const parsedUser = JSON.parse(storedUser);
        console.log("👤 User loaded from localStorage:", parsedUser);
        setUser(parsedUser);
      } catch (err) {
        console.error("❌ Failed to parse user:", err);
        setUser(null);
      }
    } else {
      console.warn("⚠️ No user found in localStorage");
      setUser(null);
    }
  }, []);

  // ✅ Listen to storage changes (sync across tabs)
  useEffect(() => {
    const handleStorageChange = () => {
      const storedUser = localStorage.getItem("user");
      if (storedUser && storedUser !== "undefined") {
        try {
          setUser(JSON.parse(storedUser));
        } catch (err) {
          console.error("Failed to parse user:", err);
          setUser(null);
        }
      } else {
        setUser(null);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // ✅ Fetch news - optimized
  const fetchNews = useCallback(
    async (term = "") => {
      if (!TOKEN) {
        setError("❌ Bạn chưa đăng nhập");
        return;
      }

      setLoading(true);
      setError("");

      try {
      const params = {};
      if (term && term.trim() !== "") {
        params.search = term.trim(); // ✅ CHỈ gửi khi có search
      }
      const response = await newsAPI.getAll(params, TOKEN);

        if (response.success) {
          setNews(response.data || []);
        } else {
          setError(response.message || "Không thể tải tin tức");
          setNews([]);
        }
      } catch (err) {
        console.error("❌ Fetch error:", err);
        setError("Lỗi kết nối server");
        setNews([]);
      } finally {
        setLoading(false);
      }
    },
    [TOKEN]
  );

  // ✅ Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchNews(inputValue);
    }, 500);
    return () => clearTimeout(timer);
  }, [inputValue, fetchNews]);

  // ✅ Initial fetch
  useEffect(() => {
    if (TOKEN && !selectedNewsId) {
      fetchNews();
    }
  }, [TOKEN, selectedNewsId, fetchNews]);

  const openAddModal = () => {
    resetForm();
    setEditingNews(null);
    setShowModal(true);
  };

  // ✅ Thumbnail drag & drop
  const handleThumbnailDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedFile(true);
  };

  const handleThumbnailDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedFile(false);
  };

  const handleThumbnailDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedFile(false);

    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("❌ Vui lòng kéo thả file ảnh!");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("❌ Ảnh không được vượt quá 5MB!");
      return;
    }

    setUploading(true);
    try {
      const response = await newsAPI.uploadThumbnail(file, TOKEN);
      if (response.success) {
        setFormData({ ...formData, thumbnail: response.thumbnailUrl });
        alert("✅ Upload ảnh thành công!");
      } else {
        alert("❌ " + (response.message || "Lỗi upload ảnh"));
      }
    } catch (err) {
      console.error("❌ Upload error:", err);
      alert("❌ Lỗi upload ảnh: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const openEditModal = (item) => {
    setEditingNews(item);
    setFormData({
      title: item.title,
      thumbnail: item.thumbnail,
      description: item.description || "",
      category: item.category,
      status: item.status,
      tags: item.tags ? item.tags.join(", ") : "",
    });
    setShowModal(true);
  };

  // ✅ Check if user owns the news
  const isNewsAuthor = (newsItem) => {
    if (!user?._id || !newsItem?.author?._id) return false;
  return user._id.toString() === newsItem.author._id.toString();}
  const handleSave = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert("⚠️ Tiêu đề không được để trống!");
      return;
    }

    if (!formData.description.trim()) {
      alert("⚠️ Mô tả không được để trống!");
      return;
    }

    if (!formData.thumbnail) {
      alert("⚠️ Vui lòng tải lên ảnh thumbnail!");
      return;
    }

    setLoading(true);

    // ✅ Teacher chỉ tạo draft, Admin có thể chọn status
    const statusToSend = isTeacher && !editingNews ? "draft" : formData.status;

    const dataToSend = {
      title: formData.title,
      description: formData.description,
      category: formData.category,
      thumbnail: formData.thumbnail,
      status: statusToSend,
      tags: formData.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };

    try {
      const response = editingNews
        ? await newsAPI.update(editingNews._id, dataToSend, TOKEN)
        : await newsAPI.create(dataToSend, TOKEN);

      if (!response.success) {
        alert("❌ " + (response.message || "Lỗi lưu tin tức"));
      } else {
        alert("✅ " + response.message);
        setShowModal(false);
        resetForm();
        fetchNews();

        // ✅ Navigate to detail nếu tạo tin mới thành công
        if (!editingNews && response.data?._id) {
          setSelectedNewsId(response.data._id);
        }
      }
    } catch (err) {
      console.error("❌ Save error:", err);
      alert("❌ Lỗi kết nối server: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("⚠️ Bạn có chắc muốn xoá tin tức này?")) return;

    setLoading(true);
    try {
      const response = await newsAPI.delete(id, TOKEN);
      if (!response.success) {
        alert("❌ " + (response.message || "Không thể xoá"));
      } else {
        alert("✅ Xoá tin tức thành công");
        fetchNews();
      }
    } catch (err) {
      console.error("❌ Delete error:", err);
      alert("❌ Lỗi kết nối server");
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (item) => {
    if (!window.confirm("❓ Bạn có muốn xuất bản tin này?")) return;

    setLoading(true);
    try {
      const response = await newsAPI.update(
        item._id,
        { status: "published" },
        TOKEN
      );
      if (!response.success) {
        alert("❌ " + (response.message || "Lỗi xuất bản"));
      } else {
        alert("✅ Xuất bản thành công");
        fetchNews();
      }
    } catch (err) {
      console.error("❌ Publish error:", err);
      alert("❌ Lỗi kết nối server");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "Tin tức",
      thumbnail: "",
      status: "draft",
      tags: "",
    });
    setDraggedFile(false);
    setUploading(false);
    setError("");
  };

  const fetchStats = async () => {
    if (!TOKEN) {
      alert("❌ Bạn chưa đăng nhập");
      return;
    }

    try {
      const response = await newsAPI.getStatistics(TOKEN);
      if (response.success) {
        setStats(response.data);
        setShowStats(true);
      } else {
        alert("❌ " + (response.message || "Không thể lấy thống kê"));
      }
    } catch (err) {
      console.error("❌ Stats error:", err);
      alert("❌ Lỗi kết nối server");
    }
  };

  // ✅ Render detail view
  if (selectedNewsId) {
    return (
      <NewsDetail newsId={selectedNewsId} onBack={() => setSelectedNewsId(null)} />
    );
  }

  // ✅ Render list view
  return (
    <div className="news-container">
      <h2 className="page-title"> Tin tức</h2>

      {/* Error banner */}
      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={() => setError("")}>✕</button>
        </div>
      )}

      {/* Top actions */}
      <div className="top-actions">
        <input
          type="text"
          value={inputValue}
          className="input-search"
          placeholder="🔍 Tìm kiếm theo tiêu đề..."
          onChange={(e) => setInputValue(e.target.value)}
          disabled={loading}
        />
        {(isAdmin || isTeacher) && (
          <button className="btn-primary" onClick={openAddModal} disabled={loading}>
            ➕ Thêm tin mới
          </button>
        )}
        {isAdmin && (
          <button
            className="btn-secondary"
            onClick={async () => {
              if (!stats) await fetchStats();
              setShowStats(!showStats);
            }}
            disabled={loading}
          >
            {showStats ? " Ẩn thống kê" : " Thống kê"}
          </button>
        )}
      </div>

      {/* Statistics */}
      {showStats && stats && isAdmin && (
        <div className="statistics">
          <div className="stat-item">
            <strong>📈 Tổng tin:</strong> {stats.total}
          </div>
          <div className="stat-item">
            <strong>Đã xuất bản:</strong> {stats.published}
          </div>
          <div className="stat-item">
            <strong>Nháp:</strong> {stats.draft}
          </div>
          <div className="stat-item">
            <strong>Theo thể loại:</strong>
            <ul>
              {stats.byCategory?.map((c) => (
                <li key={c._id}>
                  {c._id}: {c.count}
                </li>
              ))}
            </ul>
          </div>
          <div className="stat-item">
            <strong>🔥 5 tin xem nhiều nhất:</strong>
            <ul>
              {stats.mostViewed?.map((n) => (
                <li key={n._id}>
                  {n.title} ({n.views} views)
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* News list */}
      <div className="news-list">
        {loading && <div className="loading">⏳ Đang tải...</div>}

        {!loading && news.length === 0 && (
          <div className="empty-state">
            <p>📭 Không có tin tức nào</p>
            {(isAdmin || isTeacher) && (
              <button className="btn-primary" onClick={openAddModal}>
                ➕ Thêm tin mới
              </button>
            )}
          </div>
        )}

        {news.map((item) => (
          <div
            key={item._id}
            className="news-item"
            onClick={() => setSelectedNewsId(item._id)}
            style={{ cursor: "pointer" }}
          >
            <img src={item.thumbnail} alt={item.title} className="news-thumb" />

            <div className="news-body">
              <div className="news-title">{item.title}</div>
              <div className="news-desc">{item.description}</div>

              {/* Actions for author & admin */}
              {(isAdmin || (isTeacher && isNewsAuthor(item))) && (
                <div className="news-actions">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(item);
                    }}
                  >
                    ✏️ 
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item._id);
                    }}
                  >
                    🗑️ 
                  </button>

                  {isAdmin && item.status === "draft" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePublish(item);
                      }}
                    >
                       Xuất bản
                    </button>
                  )}
                </div>
              )}

              {/* Metadata */}
              <div className="news-meta">
                <div className="author">
                  <img
                    src={
                      item.author?.avatarUrl ||
                      "https://cdn-icons-png.flaticon.com/512/847/847969.png"
                    }
                    alt="author"
                    className="author-avatar"
                  />
                  <span className="author-name">
                    {item.author?.fullName || "Ẩn danh"}
                  </span>
                </div>

                <span>•</span>

                <span>
                  {new Date(item.createdAt).toLocaleDateString("vi-VN")}
                </span>

                {(isAdmin || isTeacher) && (
                  <span
                    className={`news-status ${
                      item.status === "published"
                        ? "status-published"
                        : "status-draft"
                    }`}
                  >
                    {item.status === "published" ? "Xuất bản" : "Nháp"}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="overlay" onClick={() => setShowModal(false)}>
          <form
            className="modal"
            onSubmit={handleSave}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>{editingNews ? " Chỉnh sửa tin" : " Thêm tin mới"}</h3>

            <input
              type="text"
              name="title"
              value={formData.title}
              placeholder="Tiêu đề *"
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
            />

            <textarea
              value={formData.description}
              placeholder="Mô tả ngắn (tối đa 300 ký tự)"
              rows="3"
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              required
            />

            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Thumbnail drag & drop */}
            <div
              className={`thumbnail-drop-zone ${draggedFile ? "dragging" : ""} ${
                uploading ? "uploading" : ""
              }`}
              onDragOver={handleThumbnailDragOver}
              onDragLeave={handleThumbnailDragLeave}
              onDrop={handleThumbnailDrop}
            >
              {uploading ? (
                <span>⏳ Đang upload...</span>
              ) : (
                <>
                  <span className="drop-icon">🖼️</span>
                  <span className="drop-text">
                    {formData.thumbnail ? "✅ Ảnh đã chọn" : "Kéo thả ảnh vào đây"}
                  </span>
                </>
              )}
            </div>

            {formData.thumbnail && (
              <div className="thumbnail-preview">
                <img src={formData.thumbnail} alt="Preview" />
                <button
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, thumbnail: "" })
                  }
                  className="btn-remove"
                >
                  ✖️ Xóa ảnh
                </button>
              </div>
            )}

            {/* Status - only for Admin */}
            {isAdmin && (
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
              >
                {statusOptions.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            )}

            {/* Teacher: show status info */}
            {isTeacher && (
              <div
                style={{
                  padding: "10px",
                  backgroundColor: "#fef3c7",
                  borderRadius: "4px",
                  marginBottom: "12px",
                  fontSize: "13px",
                }}
              >
                📝 Tin mới của bạn sẽ được tạo ở trạng thái <strong>Nháp</strong>.
                Admin sẽ duyệt và xuất bản.
              </div>
            )}

            <input
              type="text"
              name="tags"
              value={formData.tags}
              placeholder="Tags (cách nhau bằng dấu phẩy)"
              onChange={(e) =>
                setFormData({ ...formData, tags: e.target.value })
              }
            />

            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowModal(false)}
                disabled={loading || uploading}
              >
                 Hủy
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={loading || uploading}
              >
                {loading
                  ? "⏳ Đang lưu..."
                  : editingNews
                  ? " Cập nhật"
                  : " Thêm mới"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}