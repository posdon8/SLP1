import React, { useEffect, useState } from "react";
import AddCourseForm from "./AddCourseForm";
import GlobalBankForm from "../components/GlobalBankForm";
import "./TeacherDashboard.css";
import { useNavigate } from "react-router-dom";

export default function TeacherDashboard() {
  const [courses, setCourses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showGlobalBank, setShowGlobalBank] = useState(false);
  const [rejectInfo, setRejectInfo] = useState(null);

  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMyCourses = async () => {
      try {
        const res = await fetch(
          `${process.env.REACT_APP_API_URL}/courses/my-courses`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await res.json();
        if (res.ok) {
          setCourses(data);
        } else {
          console.error("❌ Lỗi lấy course:", data.error);
        }
      } catch (err) {
        console.error("🚨 Lỗi server:", err);
      }
    };

    if (token) fetchMyCourses();
  }, [token]);

  const handleCourseAdded = (newCourse) => {
    setCourses((prev) => [...prev, newCourse]);
    setShowForm(false);
  };

  const handleCourseClick = (course) => {
    navigate(`/course/${course._id}`);
  };

  const renderStatusBadge = (course) => {
  if (course.approvalStatus === "pending")
    return <span className="status-badge pending">⏳</span>;

   if (course.approvalStatus === "rejected") {
    return (
      <button
        className="status-badge rejected-btn"
        onClick={(e) => {
          e.stopPropagation(); // 🚫 không trigger click course
          setRejectInfo(course);
        }}
      >
        ❌
      </button>
    );
  }

  return null; // approved → không tag
};

  return (
    <div className="animated-bg">
    <div className="teacher-dashboard-container">
      <ul className="floating-shapes">
      <li></li>
      <li></li>
      <li></li>
      <li></li>
      <li></li>
      <li></li>
      <li></li>
      <li></li>
    </ul>
      <header className="teacher-dashboard-header">
        <h2>My learning</h2>

        <button
          className="open-form-btn"
          onClick={() => setShowForm((prev) => !prev)}
        >
          {showForm ? "Đóng form" : " Tạo khóa học mới"}
        </button>

        <button
          className="open-globalbank-btn"
          onClick={() => setShowGlobalBank(true)}
        >
           Global Question Bank
        </button>
      </header>

      {/* MODAL CREATE COURSE */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close-modal-btn"
              onClick={() => setShowForm(false)}
            >
              ✖
            </button>
            <AddCourseForm token={token} onCourseAdded={handleCourseAdded} />
          </div>
        </div>
      )}

      {/* MODAL GLOBAL BANK */}
      {showGlobalBank && (
        <div className="modal-overlay" onClick={() => setShowGlobalBank(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close-modal-btn"
              onClick={() => setShowGlobalBank(false)}
            >
              ✖
            </button>
            <GlobalBankForm token={token} />
          </div>
        </div>
      )}

      {/* COURSE LIST */}
      {courses.length > 0 ? (
        <div className="course-grid">
          {courses.map((course) => (
            <div
              key={course._id}
              className={`course-card ${
                course.status !== "approved" ? "disabled" : ""
              }`}
              onClick={() => handleCourseClick(course)}
            >
              <img src={course.thumbnail} alt={course.title} />

             

              {renderStatusBadge(course)}

              <h3>{course.title}</h3>
                 {course.isFree ? (
                <p className="no-price">Miễn phí</p>
              ) : (
                <p className="price">{course.price?.toLocaleString()}đ</p>
              )}

        <div className="course-footer">
          <span className="rating">
            {course.rating > 0
              ? `${course.rating} ${"★".repeat(Math.round(course.rating))}`
              : "Chưa có đánh giá"}
          </span>
          <p className="student-count">👥 {course.totalStudents || 0}</p>
        </div>
            </div>
          ))}
          {rejectInfo && (
  <div className="modal-overlay" onClick={() => setRejectInfo(null)}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <button
        className="close-modal-btn"
        onClick={() => setRejectInfo(null)}
      >
        ✖
      </button>

      <h3> Khóa học bị từ chối</h3>

      <p><strong>Tên khóa học:</strong> {rejectInfo.title}</p>

      <p><strong>Lý do từ chối:</strong></p>
      <p className="reject-reason">
        {rejectInfo.adminReview?.note || "Không có lý do"}
      </p>
    </div>
  </div>
)}

        </div>
      ) : (
        <p className="no-course">Bạn chưa tạo khóa học nào.</p>
      )}
    </div></div>
  );
}
