import "./Footer.css";
import { useState } from "react";
import axios from "axios";

export default function Footer() {
  const [feedbackForm, setFeedbackForm] = useState({
    subject: "",
    content: "",
    category: "other",
    rating: 3,
    email: ""
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFeedbackForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      // Lấy token từ localStorage (giả sử bạn lưu token ở đó)
      const token = localStorage.getItem("token");
      
      if (!token) {
        setError("Vui lòng đăng nhập để gửi phản hồi");
        setLoading(false);
        return;
      }

      const response = await axios.post(
        "/api/feedback/submit",
        feedbackForm,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (response.data.success) {
        setMessage("✅ Cảm ơn bạn! Phản hồi đã được gửi thành công.");
        setFeedbackForm({
          subject: "",
          content: "",
          category: "other",
          rating: 3,
          email: ""
        });
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {
      console.error("Feedback error:", err);
      setError(err.response?.data?.message || "❌ Lỗi khi gửi phản hồi. Vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="site-footer">
      <div className="footer-container">
        {/* 📞 Thông tin liên hệ */}
        <div className="footer-section">
          <h4> Liên hệ</h4>
          <p>Địa chỉ: 52 Ta Quang Buu, Ha Noi</p>
          <p>Email: slpsupport@email.com</p>
          <p>Hotline: 1900 213 396</p>
        </div>

        <div className="footer-section">
          <h4> Về chúng tôi</h4>
          <p>Giới thiệu</p>
          <p>Liên hệ</p>
          <p>Điều khoản & Quy định</p>
          <p>Chính sách bảo mật</p>
        </div>

        {/* 💬 Phản hồi */}
        <div className="footer-section feedback-section">
          <h4> Góp ý / Phản hồi</h4>
          <form className="feedback-form" onSubmit={handleSubmit}>
            {/* Email */}
            <input
              type="email"
              name="email"
              placeholder="Email của bạn"
              value={feedbackForm.email}
              onChange={handleInputChange}
              required
            />

            {/* Chủ đề */}
            <input
              type="text"
              name="subject"
              placeholder="Chủ đề phản hồi"
              value={feedbackForm.subject}
              onChange={handleInputChange}
              maxLength="100"
              required
            />

            {/* Danh mục */}
            <select
              name="category"
              value={feedbackForm.category}
              onChange={handleInputChange}
              className="feedback-select"
            >
              <option value="other">-- Chọn danh mục --</option>
              <option value="bug">🐛 Báo cáo lỗi</option>
              <option value="feature-request">✨ Yêu cầu tính năng mới</option>
              <option value="improvement">📈 Cải thiện</option>
              <option value="complaint">⚠️ Khiếu nại</option>
              <option value="other">📝 Khác</option>
            </select>

            {/* Đánh giá */}
            <div className="rating-input">
              <label>Đánh giá: </label>
              <select
                name="rating"
                value={feedbackForm.rating}
                onChange={handleInputChange}
                className="rating-select"
              >
                <option value="1">⭐ 1 - Rất tệ</option>
                <option value="2">⭐⭐ 2 - Tệ</option>
                <option value="3">⭐⭐⭐ 3 - Bình thường</option>
                <option value="4">⭐⭐⭐⭐ 4 - Tốt</option>
                <option value="5">⭐⭐⭐⭐⭐ 5 - Rất tốt</option>
              </select>
            </div>

            {/* Nội dung */}
            <textarea
              name="content"
              placeholder="Nội dung phản hồi chi tiết..."
              value={feedbackForm.content}
              onChange={handleInputChange}
              rows="4"
              maxLength="5000"
              required
            />

            {/* Thông báo */}
            {message && <div className="success-message">{message}</div>}
            {error && <div className="error-message">{error}</div>}

            {/* Nút gửi
        <button type="submit" disabled={loading} className="submit-btn">
              {loading ? "⏳ Đang gửi..." : "📤 Gửi phản hồi"}
            </button> */}
          </form>
        </div>
      </div>

      <div className="footer-bottom">
        © {new Date().getFullYear()} SLP Platform. All rights reserved.
      </div>
    </footer>
  );
}