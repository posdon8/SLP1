import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

export default function NewsDetail({ newsId: propNewsId, onBack }) {
  const { id: urlNewsId } = useParams();
  const newsId = urlNewsId || propNewsId;

  // ✅ Lấy user từ localStorage
  const [userFromStorage, setUserFromStorage] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser && storedUser !== "undefined") {
      try {
        const parsed = JSON.parse(storedUser);
        console.log("👤 NewsDetail - User from localStorage:", parsed);
        setUserFromStorage(parsed);
      } catch (err) {
        console.error("❌ Failed to parse user:", err);
        setUserFromStorage(null);
      }
    }
  }, []);

  const user = userFromStorage;
  const TOKEN = localStorage.getItem("token");

  const [news, setNews] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingContent, setEditingContent] = useState(false);
  const [editingMetadata, setEditingMetadata] = useState(false);
  const [contentDraft, setContentDraft] = useState("");
  const [metadataDraft, setMetadataDraft] = useState({
    title: "",
    description: "",
    category: "",
    tags: ""
  });
  const [saving, setSaving] = useState(false);

  // ✅ Kiểm tra nếu user là tác giả (robust version)
  const isAuthor = React.useMemo(() => {
    if (!user || !news?.author?._id) {
      return false;
    }

    // Try multiple ID fields (user._id, user.id, user.userId)
    const userIdOptions = [user._id, user.id, user.userId];
    const userId = userIdOptions.find(id => id)?.toString();

    if (!userId) {
      console.warn("⚠️ NewsDetail: User missing ID field", { user });
      return false;
    }

    const authorId = news.author._id.toString();
    const match = userId === authorId;

    

    return match;
  }, [user, news?.author?._id]);

  const canEdit = user?.roles?.includes("admin") || (user?.roles?.includes("teacher") && isAuthor);

  console.log("📝 NewsDetail - canEdit:", {
    userRole: user?.roles,
    isAuthor,
    canEdit,
  });

  // ✅ Fetch chi tiết tin tức
  useEffect(() => {
    if (!newsId) {
      setError("❌ Không tìm thấy ID tin tức");
      setLoading(false);
      return;
    }
    fetchNewsDetail();
  }, [newsId]);

  const fetchNewsDetail = async () => {
    setLoading(true);
    setError("");
    
    try {
      const res = await fetch(`${API_URL}/news/${newsId}`, {
        headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {},
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      
      if (data.success) {
        setNews(data.data);
        setContentDraft(data.data.content || "");
        setMetadataDraft({
          title: data.data.title || "",
          description: data.data.description || "",
          category: data.data.category || "Tin tức",
          tags: (data.data.tags || []).join(", ")
        });
      } else {
        setError(data.message || "Không thể tải tin tức");
      }
    } catch (err) {
      console.error("❌ Fetch error:", err);
      setError("Lỗi kết nối server. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Lưu nội dung (Content only)
  const handleSaveContent = async () => {
    if (!contentDraft.trim()) {
      alert("⚠️ Nội dung không được để trống");
      return;
    }

    setSaving(true);
    
    try {
      const res = await fetch(`${API_URL}/news/content/${news._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TOKEN}`,
        },
        body: JSON.stringify({ content: contentDraft }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      
      if (data.success) {
        setNews(data.data);
        setEditingContent(false);
        alert("✅ Cập nhật nội dung thành công!");
      } else {
        alert("❌ " + (data.message || "Lỗi cập nhật nội dung"));
      }
    } catch (err) {
      console.error("❌ Save error:", err);
      alert("❌ Lỗi kết nối server");
    } finally {
      setSaving(false);
    }
  };

  // ✅ Lưu metadata (title, description, category, tags)
  const handleSaveMetadata = async () => {
    if (!metadataDraft.title.trim()) {
      alert("⚠️ Tiêu đề không được để trống");
      return;
    }

    if (!metadataDraft.description.trim()) {
      alert("⚠️ Miêu tả không được để trống");
      return;
    }

    setSaving(true);

    try {
      const tagsArray = metadataDraft.tags
        .split(",")
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const res = await fetch(`${API_URL}/news/${news._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TOKEN}`,
        },
        body: JSON.stringify({
          title: metadataDraft.title,
          description: metadataDraft.description,
          category: metadataDraft.category,
          tags: tagsArray,
          content: news.content // Giữ nội dung cũ
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      
      if (data.success) {
        setNews(data.data);
        setEditingMetadata(false);
        alert("✅ Cập nhật thông tin tin tức thành công!");
      } else {
        alert("❌ " + (data.message || "Lỗi cập nhật thông tin"));
      }
    } catch (err) {
      console.error("❌ Save error:", err);
      alert("❌ Lỗi kết nối server");
    } finally {
      setSaving(false);
    }
  };

  // ✅ Format ngày
  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  // ✅ Loading / Error
  if (loading) {
    return (
      <div className="news-detail-container">
        {onBack && (
          <button className="btn-back" onClick={onBack}>
            ⬅️ Quay lại
          </button>
        )}
        <div className="loading">⏳ Đang tải tin tức...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="news-detail-container">
        {onBack && (
          <button className="btn-back" onClick={onBack}>
            ⬅️ Quay lại
          </button>
        )}
        <div className="error-message">❌ {error}</div>
        <button onClick={fetchNewsDetail} className="btn-primary" style={{ marginTop: "16px" }}>
          🔄 Thử lại
        </button>
      </div>
    );
  }

  if (!news) {
    return (
      <div className="news-detail-container">
        {onBack && (
          <button className="btn-back" onClick={onBack}>
            ⬅️ Quay lại
          </button>
        )}
        <div className="error-message">❌ Không tìm thấy tin tức</div>
      </div>
    );
  }

  // ✅ Render chính
  return (
    <div className="news-detail-container">
      {onBack && (
        <button className="btn-back" onClick={onBack}>
          ⬅️ Quay lại
        </button>
      )}

      
      <article className="news-detail">
        {/* Header */}
        {editingMetadata ? (
          <div className="news-header editing">
            <div className="form-group">
              <label>📝 Tiêu đề</label>
              <input
                type="text"
                value={metadataDraft.title}
                onChange={(e) =>
                  setMetadataDraft({ ...metadataDraft, title: e.target.value })
                }
                placeholder="Nhập tiêu đề"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>📄 Miêu tả ngắn</label>
              <textarea
                value={metadataDraft.description}
                onChange={(e) =>
                  setMetadataDraft({ ...metadataDraft, description: e.target.value })
                }
                placeholder="Nhập miêu tả ngắn"
                rows="3"
                className="form-input"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>🏷️ Danh mục</label>
                <input
                  type="text"
                  value={metadataDraft.category}
                  onChange={(e) =>
                    setMetadataDraft({ ...metadataDraft, category: e.target.value })
                  }
                  placeholder="Nhập danh mục"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>🏷️ Tags (cách bằng dấu phẩy)</label>
                <input
                  type="text"
                  value={metadataDraft.tags}
                  onChange={(e) =>
                    setMetadataDraft({ ...metadataDraft, tags: e.target.value })
                  }
                  placeholder="tag1, tag2, tag3"
                  className="form-input"
                />
              </div>
            </div>

            <div className="button-group">
              <button
                onClick={handleSaveMetadata}
                disabled={saving}
                className="btn-primary"
              >
                {saving ? "💾 Đang lưu..." : "💾 Lưu thông tin"}
              </button>
              <button
                onClick={() => setEditingMetadata(false)}
                disabled={saving}
                className="btn-secondary"
              >
                ❌ Hủy
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="news-header">
              <h1>{news.title}</h1>
              
            </div>

            <div className="news-meta">
              <img
                src={
                  news.author?.avatarUrl ||
                  "https://cdn-icons-png.flaticon.com/512/847/847969.png"
                }
                alt="author"
                className="author-avatar"
              />
              <span className="author" style={{fontSize: "15px"}}>{news.author?.fullName || "Admin"}</span>
              <span className="date" style={{ fontStyle: "italic" }}>
                Đăng {formatDate(news.createdAt)}
              </span>
              <span className="views"> {news.views || 0} lượt xem</span>
              
              {/* ✅ Hiển thị status cho admin và author (teacher) */}
              {canEdit && (
                <span className={`status ${news.status}`}>
                  {news.status === "published" ? "Đã xuất bản" : "Nháp"}
                </span>
              )}
            </div>

            <div className="news-category">
              <span className="category-badge">{news.category}</span>
            </div>
          </>
        )}

        {/* Thumbnail */}
        {news.thumbnail && (
          <div className="news-thumbnail">
            <img src={news.thumbnail} alt={news.title} />
          </div>
        )}

        {/* Content */}
        <div className="news-content">
          {canEdit ? (
            editingContent ? (
              <>
                <ReactQuill
                  theme="snow"
                  value={contentDraft}
                  onChange={setContentDraft}
                  style={{ height: "400px", marginBottom: "16px" }}
                />
                <div className="button-group">
                  <button
                    onClick={handleSaveContent}
                    disabled={saving}
                    className="btn-primary"
                  >
                    {saving ? "💾 Đang lưu..." : "💾 Lưu nội dung"}
                  </button>
                  <button
                    onClick={() => setEditingContent(false)}
                    disabled={saving}
                    className="btn-secondary"
                  >
                    ❌ Hủy
                  </button>
                </div>
              </>
            ) : (
              <>
                <div
                  dangerouslySetInnerHTML={{
                    __html:
                      news.content ||
                      "📝 Chưa có nội dung. Nhấn 'Sửa nội dung' để thêm.",
                  }}
                  style={{ marginBottom: "16px" }}
                />
                <button
                  onClick={() => setEditingContent(true)}
                  className="btn-primary"
                >
                   Sửa nội dung
                </button>
              </>
            )
          ) : (
            <div
              dangerouslySetInnerHTML={{
                __html: news.content || "Chưa có nội dung",
              }}
            />
          )}
        </div>

        {/* Tags */}
        {news.tags && news.tags.length > 0 && (
          <div className="news-tags">
            <strong>Tags:</strong>
            <div className="tags-list">
              {news.tags.map((tag, idx) => (
                <span key={idx} className="tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="news-footer">
          {news.updatedAt && news.updatedAt !== news.createdAt && (
            <small>Cập nhật lần cuối: {formatDate(news.updatedAt)}</small>
          )}
        </div>
      </article>
    </div>
  );
}