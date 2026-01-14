import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PaymentHistory.css";

export default function PaymentHistory() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const token = localStorage.getItem("token");
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetchPaymentHistory();
  }, [token, navigate]);

  const fetchPaymentHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/payment/history`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to fetch payment history`);
      }

      const data = await res.json();

      if (data.success && data.payments) {
        setPayments(data.payments);
      } else {
        throw new Error(data.error || "Failed to load payment history");
      }
    } catch (err) {
      console.error("❌ Fetch error:", err);
      setError(err.message || "Failed to load payment history");
    } finally {
      setLoading(false);
    }
  };

  // Filter & Sort
  const filteredPayments = payments.filter((p) =>
    filter === "all" ? true : p.status === filter
  );

  const sortedPayments = [...filteredPayments].sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return new Date(b.createdAt) - new Date(a.createdAt);
      case "oldest":
        return new Date(a.createdAt) - new Date(b.createdAt);
      case "amount-high":
        return (b.amount || 0) - (a.amount || 0);
      case "amount-low":
        return (a.amount || 0) - (b.amount || 0);
      default:
        return 0;
    }
  });

  // Stats
  const completedPayments = payments.filter((p) => p.status === "completed");
  const totalSpent = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  // Tính tổng số course đã mua
const totalCourses = completedPayments.reduce((sum, p) => {
  const coursesList = p.courseIds || (p.courseId ? [p.courseId] : []);
  return sum + coursesList.length;
}, 0);

  const statusColors = {
    completed: "#10b981",
    pending: "#f59e0b",
    failed: "#ef4444",
  };

  const statusLabels = {
    completed: "✅ Thành công",
    pending: "⏳ Đang xử lý",
    failed: "❌ Thất bại",
  };

  const formatCurrency = (amount) => {
    return (amount || 0).toLocaleString("vi-VN") + "đ";
  };

  if (loading) {
    return (
      <div className="history-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>⏳ Đang tải lịch sử giao dịch...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="history-container">
        <div className="error-state">
          <p className="error-icon">⚠️</p>
          <p className="error-message">{error}</p>
          <button className="btn-retry" onClick={fetchPaymentHistory}>
            🔄 Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="history-container">
      <header className="history-header">
        <h1>Lịch sử giao dịch</h1>
        <p>Xem tất cả các khóa học bạn đã mua</p>
      </header>

      {/* Stats */}
      <section className="statistics">
        <div className="stat-card">
       
          <div className="stat-content">
            <span className="stat-label">Tổng chi tiêu</span>
            <span className="stat-value">{formatCurrency(totalSpent)}</span>
          </div>
        </div>

        <div className="stat-card">
       
          <div className="stat-content">
            <span className="stat-label">Khóa học đã mua</span>
            <span className="stat-value">{totalCourses}</span>
          </div>
        </div>

        <div className="stat-card">
       
          <div className="stat-content">
            <span className="stat-label">Giao dịch thành công</span>
            <span className="stat-value">{completedPayments.length}</span>
          </div>
        </div>

        <div className="stat-card">
       
          <div className="stat-content">
            <span className="stat-label">Đang xử lý</span>
            <span className="stat-value">{payments.filter(p => p.status === "pending").length}</span>
          </div>
        </div>
      </section>

      {/* Controls */}
      <section className="controls">
        <div className="filter-group">
          <label>🔍 Lọc theo trạng thái:</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">Tất cả</option>
            <option value="completed">✅ Thành công</option>
            <option value="pending">⏳ Đang xử lý</option>
            <option value="failed">❌ Thất bại</option>
          </select>
        </div>

        <div className="sort-group">
          <label>Sắp xếp:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
            <option value="amount-high">Giá cao nhất</option>
            <option value="amount-low">Giá thấp nhất</option>
          </select>
        </div>

        <button className="btn-refresh" onClick={fetchPaymentHistory}>
          🔄
        </button>
      </section>

      {/* Payments List */}
      <section className="payment-list">
  {sortedPayments.length === 0 ? (
    <div className="empty-state">
      <p className="empty-icon">📭</p>
      <p className="empty-text">
        {filter === "all"
          ? "Bạn chưa mua khóa học nào"
          : `Không có giao dịch ${statusLabels[filter]?.toLowerCase()}`}
      </p>
      <button className="btn-browse" onClick={() => navigate("/dashboard")}>
        Khám phá khóa học
      </button>
    </div>
  ) : (
    <div className="transactions">
      {sortedPayments.map((payment) => {
        // Chuyển courseIds sang object nếu là string, fallback courseId
        const coursesList =
          payment.courseIds?.map((c) =>
            typeof c === "string" ? { _id: c, title: "Course" } : c
          ) || (payment.courseId ? [payment.courseId] : []);

        const courseCount = coursesList.length;

        return (
          <div key={payment._id} className="transaction-card">
            <div className="transaction-left">
              {coursesList.map((course, idx) => (
                <div key={course._id} className="course-thumbnail">
                  {course.thumbnail ? (
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="no-image">📚</div>
                  )}
                  <p className="course-title">{course.title}</p>
                </div>
              ))}

              <div className="transaction-info">
                <p className="transaction-id">
                  ID: {payment.transactionId?.slice(0, 20) || payment._id?.slice(-8)}
                </p>
                <p className="transaction-date">
                   {new Date(payment.createdAt).toLocaleDateString("vi-VN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>

            <div className="transaction-right">
              <div className="amount">
                <span className="label">Giá tiền</span>
                <span className="value">{formatCurrency(payment.amount)}</span>
              </div>

              <div className="payment-method">
                <span className="method">
                  {payment.paymentMethod === "sepay" && "🏦 SePay"}
                  {payment.paymentMethod === "paypal" && "💳 PayPal"}
                  {payment.paymentMethod === "stripe" && "🟦 Stripe"}
                  {payment.paymentMethod === "momo" && "📱 MoMo"}
                  {!payment.paymentMethod && "💳 Chuyển khoản"}
                </span>
              </div>

              <div
                className="status-badge"
                style={{ backgroundColor: statusColors[payment.status] }}
              >
                {statusLabels[payment.status] || payment.status}
              </div>

              {payment.status === "completed" && (
                <button
                  className="btn-view-course"
                  onClick={() => {
                    if (courseCount === 1) {
                      navigate(`/course/${coursesList[0]._id}`);
                    } else {
                      navigate("/my-courses");
                    }
                  }}
                >
                   {courseCount === 1 ? "Vào học" : "Xem khóa học"}
                </button>
              )}

              {payment.status === "pending" && (
                <p className="note">⏳ Đang chờ xác nhận thanh toán</p>
              )}

              {payment.status === "failed" && (
                <button
                  className="btn-retry"
                  onClick={() => navigate("/checkout")}
                >
                  🔄 Thử lại
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  )}
</section>

    </div>
  );
}
