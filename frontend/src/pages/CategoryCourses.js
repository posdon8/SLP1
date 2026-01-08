import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./Dashboard.css"; // ✅ dùng lại CSS dashboard

export default function CategoryCourses() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [categoryName, setCategoryName] = useState("");

  const [courses, setCourses] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");
  const isTeacher = user?.roles?.includes("teacher");
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
  const BASE_URL = API_URL.replace("/api", ""); // http://localhost:5000
  /* ===================== LOAD COURSES BY CATEGORY ===================== */
  useEffect(() => {
    fetch(`http://localhost:5000/api/courses?categorySlug=${slug}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setCourses(data.courses);
        } else {
          setCourses([]);
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);
useEffect(() => {
  fetch("http://localhost:5000/api/categories")
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        const found = data.data.find((c) => c.slug === slug);
        if (found) setCategoryName(found.name);
      }
    });
}, [slug]);

  /* ===================== LOAD ENROLLED COURSES ===================== */
  useEffect(() => {
    if (isTeacher || !token) return;

    fetch("http://localhost:5000/api/courses/my-enrolled-courses", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setEnrolledCourses(data.courses.map((c) => c._id));
        }
      });
  }, [token, isTeacher]);

  /* ===================== FILTER HIỂN THỊ ===================== */
  const visibleCourses = courses.filter((c) => {
    if (
      isTeacher &&
      c.teacher?._id?.toString() === user?._id?.toString()
    ) {
      return true;
    }
    if (c.accessType === "private") return false;
    if (c.isHidden) return false;
    return true;
  });

  /* ===================== UTILS ===================== */
  const isOwnerOfCourse = (course) => {
    if (!course.teacher || !user) return false;
    const teacherId = course.teacher._id || course.teacher;
    const userId = user._id || user.id;
    return teacherId.toString() === userId.toString();
  };

  const handleCourseClick = (course) => {
    if (isTeacher) {
      if (isOwnerOfCourse(course)) {
        navigate(`/course/${course._id}`);
        return;
      }
      navigate(
        course.isFree
          ? `/course/${course._id}`
          : `/course-review/${course._id}`
      );
      return;
    }

    if (course.isFree) {
      navigate(`/course/${course._id}`);
    } else {
      enrolledCourses.includes(course._id)
        ? navigate(`/course/${course._id}`)
        : navigate(`/course-review/${course._id}`);
    }
  };

  const renderCourseCard = (course) => {
    const isOwner = isOwnerOfCourse(course);
    const isEnrolled = enrolledCourses.includes(course._id);

    return (
      <div
        key={course._id}
        className={`course-card ${course.isFree ? "free-card" : "paid-card"}`}
        onClick={() => handleCourseClick(course)}
      >
        <img src={course.thumbnail} alt={course.title} />

        {!course.isFree && !isTeacher && isEnrolled && (
          <span className="enrolled-badge">
            <img
          src={`${BASE_URL}/uploads/images/login.png`}
          alt="Hero"
          style={{height: "2px"}}
          onError={(e) => {
            e.target.style.display = "none";
          }}
        />
        </span>
        )}
        {isTeacher && isOwner && (
          <span className="status-owner">✏️</span>
        )}

        <h3 className="title">{course.title}</h3>
        <p className="teacher-name">{course.teacher?.fullName}</p>

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
    );
  };

  if (loading) return <p className="loading">Đang tải khóa học...</p>;

  return (
    <div className="dashboard-container">
      <section className="course-section">
        <h3 className="section-title">
            Khóa học theo lĩnh vực:{" "}
            <span className="user-name">
                {categoryName || "Đang tải..."}
            </span>
            </h3>


        {visibleCourses.length ? (
          <div className="course-grid">
            {visibleCourses.map((course) =>
              renderCourseCard(course)
            )}
          </div>
        ) : (
          <p className="no-course">Không có khóa học nào</p>
        )}
      </section>
    </div>
  );
}
