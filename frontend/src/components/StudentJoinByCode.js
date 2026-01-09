import React, { useState } from "react";
import "./StudentJoinByCode.css";

export default function StudentJoinByCode() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [courseInfo, setCourseInfo] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));

  if (!token || !user) {
    return (
      <div className="join-by-code-page">
        <div className="join-container">
          <div className="alert alert-warning">
            ⚠️ Vui lòng <a href="/login" style={{ color: "#856404", fontWeight: "bold" }}>đăng nhập</a> để tham gia khóa học
          </div>
        </div>
      </div>
    );
  }

  const handleSearchByCode = async () => {
    if (!code.trim()) {
      setError("❌ Vui lòng nhập mã code");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");
    setCourseInfo(null);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/courses`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const courses = await response.json();
      const course = courses.find(c => c.enrollmentCode === code.toUpperCase());

      if (!course) {
        setError("❌ Không tìm thấy khóa học với mã này");
        setLoading(false);
        return;
      }

      setCourseInfo(course);
      setError("");
    } catch (err) {
      console.error("Search error:", err);
      setError("❌ Không tìm thấy khóa học");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCourse = async () => {
    if (!courseInfo) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/courses/${courseInfo._id}/join-by-code`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ code: code.toUpperCase() }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(`❌ ${data.message}`);
        setLoading(false);
        return;
      }

      setSuccess(data.message);

            // ⭐ Chỉ redirect nếu join ngay (auto mode)
      // Nếu chế độ manual, không redirect vì chưa được duyệt
      if (courseInfo.enrollmentMode === "auto") {
        setTimeout(() => {
          window.location.href = `/course/${courseInfo._id}`;
        }, 1500);
      } else {
        // Manual mode - hiển thị thông báo chờ duyệt
        setTimeout(() => {
          setCourseInfo(null);
          setCode("");
          // Có thể thêm UI để hiển thị "Chờ duyệt" thay vì redirect
        }, 2000);
      }
    } catch (err) {
      console.error("Join error:", err);
      setError("❌ Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !courseInfo) {
      handleSearchByCode();
    }
  };

  return (
    <div className="join-by-code-page">
      <div className="join-container">
        {/* HEADER */}
        <div className="join-header">
          <h1>Tham gia khóa học</h1>
          <p>Nhập mã code để tham gia khóa học của bạn</p>
        </div>

        {/* MAIN CARD */}
        <div className="join-card">
          {!courseInfo ? (
            <>
              <div className="step-title"> Bước 1: Nhập mã code</div>

              <div className="input-group">
                <input
                  type="text"
                  placeholder="Nhập mã code (ví dụ: ABC123)"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    setError("");
                  }}
                  onKeyPress={handleKeyPress}
                  maxLength="6"
                  disabled={loading}
                  className="code-input"
                  autoFocus
                />
                <button
                  onClick={handleSearchByCode}
                  disabled={loading || !code.trim()}
                  className="search-btn"
                >
                  {loading ? "⏳ Tìm..." : "🔍 Tìm kiếm"}
                </button>
              </div>

              {error && <div className="alert alert-danger">{error}</div>}

              <div className="info-box">
                <p>💡 <strong>Gợi ý:</strong> Mã code được cấp bởi giáo viên</p>
                <p>🔑 <strong>Định dạng:</strong> 6 ký tự in hoa (ví dụ: ABC123)</p>
              </div>
            </>
          ) : (
            <>
              <div className="step-title"> Bước 2: Xác nhận thông tin</div>

              <div className="course-info-card">
                <img
                  src={courseInfo.thumbnail || "/default-course.jpg"}
                  alt={courseInfo.title}
                  className="course-thumbnail"
                />

                <div className="course-details">
                  <h3>{courseInfo.title}</h3>

                  <div className="detail-item">
                    <span className="label">👨‍🏫 Giáo viên:</span>
                    <span className="value">
                      {courseInfo.teacher?.fullName || "Đang cập nhật"}
                    </span>
                  </div>

                  <div className="detail-item">
                    <span className="label">📚 Mô tả:</span>
                    <span className="value">{courseInfo.description}</span>
                  </div>

                  <div className="detail-item">
                    <span className="label">👥 Học viên:</span>
                    <span className="value">{courseInfo.totalStudents || 0}</span>
                  </div>

                  {!courseInfo.isFree && (
                    <div className="detail-item">
                      <span className="label">💰 Giá:</span>
                      <span className="value price">
                        {courseInfo.price?.toLocaleString()}đ
                      </span>
                    </div>
                  )}

                  <div
                    className={
                      courseInfo.enrollmentMode === "manual"
                        ? "badge-manual"
                        : "badge-auto"
                    }
                  >
                    {courseInfo.enrollmentMode === "manual"
                      ? "⏳ Chế độ duyệt - Yêu cầu sẽ được giáo viên xem xét"
                      : "⚡ Chế độ tự động - Bạn sẽ tham gia ngay"}
                  </div>
                </div>
              </div>

              {error && <div className="alert alert-danger">{error}</div>}
              {success && <div className="alert alert-success">{success}</div>}

              <div className="action-buttons">
                <button
                  onClick={() => {
                    setCourseInfo(null);
                    setCode("");
                    setError("");
                    setSuccess("");
                  }}
                  disabled={loading}
                  className="back-btn"
                >
                  ← Quay lại
                </button>
                <button
                  onClick={handleJoinCourse}
                  disabled={loading}
                  className="join-btn"
                >
                  {loading ? "⏳ Xử lý..." : "✅ Tham gia"}
                </button>
              </div>
            </>
          )}
        </div>

        {/* FAQ SECTION */}
        <div className="faq-section">
          <h3>❓ Câu hỏi thường gặp</h3>

          <div className="faq-item">
            <h4>🔑 Mã code là gì?</h4>
            <p>
              Mã code là chuỗi 6 ký tự do giáo viên tạo để cho phép học sinh
              tham gia khóa học.
            </p>
          </div>

          <div className="faq-item">
            <h4>⏳ Tôi cần chờ bao lâu?</h4>
            <p>
              Nếu chế độ 'tự động', bạn tham gia ngay. Nếu 'duyệt', giáo viên
              phải chấp thuận.
            </p>
          </div>

          <div className="faq-item">
            <h4>❌ Mã code không hợp lệ?</h4>
            <p>
              Kiểm tra lại mã - phải 6 ký tự in hoa. Liên hệ giáo viên nếu vẫn
              lỗi.
            </p>
          </div>

          <div className="faq-item">
            <h4>🔄 Tôi đã join rồi?</h4>
            <p>
              Nếu tham gia rồi, bạn sẽ nhận thông báo 'Bạn đã tham gia khóa
              học'.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}