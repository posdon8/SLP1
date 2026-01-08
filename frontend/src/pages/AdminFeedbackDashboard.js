import React, { useState, useEffect } from "react";
import axios from "axios";
// import "./AdminFeedbackDashboard.css";

const AdminFeedbackDashboard = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [filteredFeedbacks, setFilteredFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Filter & Search
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [adminReply, setAdminReply] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);

  // Lấy danh sách feedback
  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get("/api/feedback/all", {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setFeedbacks(response.data.data);
        filterAndSearch(response.data.data, statusFilter, categoryFilter, searchQuery);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi khi tải feedback");
      console.error("Fetch feedbacks error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Lọc & Tìm kiếm
  const filterAndSearch = (data, status, category, search) => {
    let result = data;

    if (status !== "all") {
      result = result.filter(f => f.status === status);
    }

    if (category !== "all") {
      result = result.filter(f => f.category === category);
    }

    if (search.trim()) {
      result = result.filter(f =>
        f.subject.toLowerCase().includes(search.toLowerCase()) ||
        f.content.toLowerCase().includes(search.toLowerCase()) ||
        f.userName.toLowerCase().includes(search.toLowerCase())
      );
    }

    setFilteredFeedbacks(result);
  };

  const handleStatusFilter = (status) => {
    setStatusFilter(status);
    filterAndSearch(feedbacks, status, categoryFilter, searchQuery);
  };

  const handleCategoryFilter = (category) => {
    setCategoryFilter(category);
    filterAndSearch(feedbacks, statusFilter, category, searchQuery);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    filterAndSearch(feedbacks, statusFilter, categoryFilter, query);
  };

  // Mở modal
  const openModal = (feedback) => {
    setSelectedFeedback(feedback);
    setAdminReply(feedback.adminReply || "");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedFeedback(null);
    setAdminReply("");
  };

  // Trả lời feedback
  const handleSubmitReply = async () => {
    if (!adminReply.trim()) {
      alert("Vui lòng nhập nội dung trả lời");
      return;
    }

    try {
      setReplyLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `/api/feedback/${selectedFeedback._id}/reply`,
        { adminReply },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert("✅ Trả lời đã được gửi");
        setFeedbacks(feedbacks.map(f =>
          f._id === selectedFeedback._id ? response.data.data : f
        ));
        setSelectedFeedback(response.data.data);
      }
    } catch (err) {
      alert("❌ Lỗi: " + (err.response?.data?.message || "Không thể trả lời"));
    } finally {
      setReplyLoading(false);
    }
  };

  // Cập nhật trạng thái
  const handleStatusUpdate = async (feedbackId, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `/api/feedback/${feedbackId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        const updated = response.data.data;
        setFeedbacks(feedbacks.map(f => (f._id === feedbackId ? updated : f)));
        if (selectedFeedback?._id === feedbackId) {
          setSelectedFeedback(updated);
        }
        filterAndSearch(
          feedbacks.map(f => (f._id === feedbackId ? updated : f)),
          statusFilter,
          categoryFilter,
          searchQuery
        );
      }
    } catch (err) {
      alert("❌ Lỗi: " + (err.response?.data?.message || "Không thể cập nhật"));
    }
  };

  // Hiển thị icon category
  const getCategoryIcon = (category) => {
    const icons = {
      bug: "🐛",
      "feature-request": "✨",
      improvement: "📈",
      complaint: "⚠️",
      other: "📝"
    };
    return icons[category] || "📝";
  };

  // Hiển thị màu status
  const getStatusColor = (status) => {
    const colors = {
      pending: "#ff9800",
      reviewing: "#2196f3",
      resolved: "#4caf50",
      closed: "#9e9e9e"
    };
    return colors[status] || "#999";
  };

  // Hiển thị label status
  const getStatusLabel = (status) => {
    const labels = {
      pending: "Chờ xử lý",
      reviewing: "Đang xem xét",
      resolved: "Đã giải quyết",
      closed: "Đóng"
    };
    return labels[status] || status;
  };

  const categoryOptions = [
    { value: "all", label: "Tất cả danh mục" },
    { value: "bug", label: "🐛 Báo cáo lỗi" },
    { value: "feature-request", label: "✨ Yêu cầu tính năng" },
    { value: "improvement", label: "📈 Cải thiện" },
    { value: "complaint", label: "⚠️ Khiếu nại" },
    { value: "other", label: "📝 Khác" }
  ];

  const statusOptions = [
    { value: "all", label: "Tất cả trạng thái" },
    { value: "pending", label: "Chờ xử lý" },
    { value: "reviewing", label: "Đang xem xét" },
    { value: "resolved", label: "Đã giải quyết" },
    { value: "closed", label: "Đóng" }
  ];

  if (loading) {
    return <div className="admin-container"><p className="loading">⏳ Đang tải dữ liệu...</p></div>;
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>📊 Quản lý Phản hồi từ Users</h1>
        <p className="total-count">Tổng: {filteredFeedbacks.length} phản hồi</p>
      </div>

      {error && <div className="error-alert">{error}</div>}

      {/* Thanh tìm kiếm & lọc */}
      <div className="filter-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="🔍 Tìm kiếm theo chủ đề, nội dung, tên người dùng..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-controls">
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilter(e.target.value)}
            className="filter-select"
          >
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => handleCategoryFilter(e.target.value)}
            className="filter-select"
          >
            {categoryOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <button className="refresh-btn" onClick={fetchFeedbacks}>
            🔄 Làm mới
          </button>
        </div>
      </div>

      {/* Danh sách feedback */}
      <div className="feedback-list">
        {filteredFeedbacks.length === 0 ? (
          <div className="empty-state">
            <p>📭 Không có phản hồi nào</p>
          </div>
        ) : (
          filteredFeedbacks.map((feedback) => (
            <div key={feedback._id} className="feedback-card">
              <div className="feedback-header">
                <div className="feedback-title-section">
                  <span className="category-badge">
                    {getCategoryIcon(feedback.category)}
                  </span>
                  <h3 className="feedback-title">{feedback.subject}</h3>
                  <div className="rating">
                    {'⭐'.repeat(feedback.rating)}
                  </div>
                </div>
                <span
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(feedback.status) }}
                >
                  {getStatusLabel(feedback.status)}
                </span>
              </div>

              <div className="feedback-info">
                <p><strong>👤 Từ:</strong> {feedback.userName} ({feedback.userRole})</p>
                <p><strong>📧 Email:</strong> {feedback.userEmail}</p>
                <p><strong>📅 Ngày:</strong> {new Date(feedback.createdAt).toLocaleDateString('vi-VN')}</p>
              </div>

              <div className="feedback-content-preview">
                <p>{feedback.content.substring(0, 150)}...</p>
              </div>

              <div className="feedback-actions">
                <button
                  className="view-btn"
                  onClick={() => openModal(feedback)}
                >
                  👁️ Xem chi tiết
                </button>
                <select
                  value={feedback.status}
                  onChange={(e) => handleStatusUpdate(feedback._id, e.target.value)}
                  className="status-select"
                >
                  <option value="pending">Chờ xử lý</option>
                  <option value="reviewing">Đang xem xét</option>
                  <option value="resolved">Đã giải quyết</option>
                  <option value="closed">Đóng</option>
                </select>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal xem chi tiết & trả lời */}
      {isModalOpen && selectedFeedback && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📋 Chi tiết Phản hồi</h2>
              <button className="close-btn" onClick={closeModal}>✕</button>
            </div>

            <div className="modal-body">
              {/* Thông tin feedback */}
              <div className="feedback-detail">
                <div className="detail-row">
                  <label>Chủ đề:</label>
                  <p>{selectedFeedback.subject}</p>
                </div>

                <div className="detail-row">
                  <label>Từ:</label>
                  <p>{selectedFeedback.userName} ({selectedFeedback.userRole})</p>
                </div>

                <div className="detail-row">
                  <label>Email:</label>
                  <p>{selectedFeedback.userEmail}</p>
                </div>

                <div className="detail-row">
                  <label>Danh mục:</label>
                  <p>{getCategoryIcon(selectedFeedback.category)} {selectedFeedback.category}</p>
                </div>

                <div className="detail-row">
                  <label>Đánh giá:</label>
                  <p>{'⭐'.repeat(selectedFeedback.rating)}</p>
                </div>

                <div className="detail-row">
                  <label>Trạng thái:</label>
                  <select
                    value={selectedFeedback.status}
                    onChange={(e) => {
                      handleStatusUpdate(selectedFeedback._id, e.target.value);
                    }}
                    className="status-select-modal"
                  >
                    <option value="pending">Chờ xử lý</option>
                    <option value="reviewing">Đang xem xét</option>
                    <option value="resolved">Đã giải quyết</option>
                    <option value="closed">Đóng</option>
                  </select>
                </div>

                <div className="detail-row">
                  <label>Nội dung:</label>
                  <div className="content-box">{selectedFeedback.content}</div>
                </div>

                <div className="detail-row">
                  <label>Ngày gửi:</label>
                  <p>{new Date(selectedFeedback.createdAt).toLocaleString('vi-VN')}</p>
                </div>
              </div>

              {/* Trả lời */}
              <div className="reply-section">
                <h3>💬 Trả lời</h3>

                {selectedFeedback.adminReply && (
                  <div className="existing-reply">
                    <p className="reply-label">Trả lời trước đó:</p>
                    <p>{selectedFeedback.adminReply}</p>
                    <small>
                      Vào lúc: {new Date(selectedFeedback.repliedAt).toLocaleString('vi-VN')}
                    </small>
                  </div>
                )}

                <textarea
                  value={adminReply}
                  onChange={(e) => setAdminReply(e.target.value)}
                  placeholder="Nhập nội dung trả lời cho user..."
                  rows="5"
                  className="reply-textarea"
                />

                <button
                  className="submit-reply-btn"
                  onClick={handleSubmitReply}
                  disabled={replyLoading}
                >
                  {replyLoading ? "⏳ Đang gửi..." : "📤 Gửi trả lời"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFeedbackDashboard;