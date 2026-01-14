import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CourseApproval.css"

export default function CourseApproval() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/courses/admin/pending`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();
      setCourses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ Lỗi tải khóa học chờ duyệt:", err);
      alert("❌ Không thể tải danh sách khóa học");
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, [token]); // ✅ Thêm token vào dependency

  const approve = async (id) => {
    // ✅ Thêm xác nhận
    if (!window.confirm("Bạn chắc chắn muốn duyệt khóa học này?")) return;

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/courses/admin/${id}/approve`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // ✅ Check response
      if (res.ok) {
        alert("✅ Duyệt khóa học thành công!");
        fetchPending(); // Refresh danh sách
      } else {
        const error = await res.json();
        alert("❌ " + (error.message || "Duyệt thất bại"));
      }
    } catch (err) {
      console.error("❌ Lỗi duyệt:", err);
      alert("❌ Lỗi kết nối server");
    }
  };

  const reject = async (id) => {
    const reason = prompt("Lý do từ chối khóa học?");
    if (!reason) return;

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/courses/admin/${id}/reject`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reason }),
        }
      );

      // ✅ Check response
      if (res.ok) {
        alert("✅ Từ chối khóa học thành công!");
        fetchPending(); // Refresh danh sách
      } else {
        const error = await res.json();
        alert("❌ " + (error.message || "Từ chối thất bại"));
      }
    } catch (err) {
      console.error("❌ Lỗi từ chối:", err);
      alert("❌ Lỗi kết nối server");
    }
  };

  const handleCourseClick = (course) => {
    navigate(`/course/${course._id}`);
  };

  return (
    <div className="course-approval-container">
      <h2 style={{fontWeight: "700"}}>Khóa học chờ duyệt</h2>

      {loading && <p className="loading-text">⏳ Đang tải...</p>}

      {!loading && courses.length === 0 && (
        <p className="empty-text">🎉 Không có khóa học chờ duyệt</p>
      )}

      <div className="course-list">
        {courses.map((c) => (
          <div
            key={c._id}
            className="course-card-admin"
            onClick={() => handleCourseClick(c)}
          >
            {c.thumbnail && (
              <img src={c.thumbnail} alt={c.title} className="course-thumbnail" />
            )}
            
            <h3>{c.title}</h3>
            <p className="description">{c.description?.substring(0, 100)}</p>

            <p> {c.teacher?.fullName || "N/A"}</p>
            
            <p> {c.categories?.map(cat => cat.name).join(", ") || "Chưa phân loại"}</p>
        {c.isFree ? (
          <p className="no-price">Miễn phí</p>
        ) : (
          <p className="price">{c.price?.toLocaleString()}đ</p>
        )}
            <div className="course-actions">
              <button
                className="btn-approve"
                onClick={(e) => {
                  e.stopPropagation();
                  approve(c._id);
                }}
              >
                 Duyệt
              </button>

              <button
                className="btn-reject"
                onClick={(e) => {
                  e.stopPropagation();
                  reject(c._id);
                }}
              >
                Từ chối
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}