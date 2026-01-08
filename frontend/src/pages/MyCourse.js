import React, { useEffect, useState } from "react";
import axios from "axios";
import "./TeacherDashboard.css";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";

export default function MyCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { id } = useParams();
  const API_URL = "http://localhost:5000/api";

  useEffect(() => {
    const token = localStorage.getItem("token");

    // ❌ Không có token → không gọi API
    if (!token) {
      console.warn("❌ No token found in localStorage");
      setLoading(false);
      return;
    }

    console.log("✅ Token found:", token);

    axios
      .get(`${API_URL}/courses/my-enrolled-courses`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((res) => {
        console.log("📦 My courses response:", res.data);
        if (res.data.success) {
          setCourses(res.data.courses || []);
        }
      })
      .catch((err) => {
        console.error("❌ Error loading courses:", err.response?.data || err);
      })
      .finally(() => setLoading(false));
  }, []);

  // ✅ FIX: truyền courseId đúng
  const handleCourseClick = (courseId) => {
    if (!courseId) return;
    navigate(`/course/${courseId}`);
  };

  if (loading) {
    return <div className="my-courses-page">⏳ Loading...</div>;
  }

  return (
    <div className="animated-bg1">
      {/* Floating shapes */}
      <ul className="floating-shapes1">
        {Array.from({ length: 10 }).map((_, i) => (
          <li key={i}></li>
        ))}
      </ul>

      <div className="my-courses-page">
        <h2 style={{ color: "#000000e1" }}>My Classes</h2>

        {courses.length === 0 ? (
          <p className="no-course">
            You have not enrolled in any courses yet.
          </p>
        ) : (
          <div className="course-grid">
            {courses.map((course) => (
              <div
                key={course._id}
                className={`course-card ${
                  course.status !== "approved" ? "disabled" : ""
                }`}
                onClick={() => handleCourseClick(course._id)}
              >
                <img
                  src={course.thumbnail || "https://via.placeholder.com/300x200"}
                  alt={course.title}
                  onError={(e) => {
                    e.target.src =
                      "https://via.placeholder.com/300x200";
                  }}
                />

                <h3>{course.title}</h3>
                <p className="teacher-name">
                  {course.teacher?.fullName || "Unknown teacher"}
                </p>

                <p>Let's study</p>

                <div className="course-footer">
                  <span className="rating">
                    {course.rating > 0
                      ? `${course.rating} ${"★".repeat(
                          Math.round(course.rating)
                        )}`
                      : "Chưa có đánh giá"}
                  </span>
                  <p className="student-count">
                    👥 {course.totalStudents || 0}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
