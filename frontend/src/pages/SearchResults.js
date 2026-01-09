// src/pages/SearchResults.js
import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import "./SearchResults.css";

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get("q");
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!query) return;

    const fetchResults = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `${process.env.REACT_APP_API_URL}/courses/search?q=${encodeURIComponent(query)}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setCourses(data.courses || []);
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  if (loading) {
    return (
      <div className="search-results-page">
        <div className="loading">🔍 Đang tìm kiếm...</div>
      </div>
    );
  }

  return (
    <div className="search-results-page">
      <div className="search-header">
        <h1>Kết quả tìm kiếm cho: "{query}"</h1>
        <p>{courses.length} khóa học được tìm thấy</p>
      </div>

      {courses.length === 0 ? (
        <div className="no-results">
          <span className="icon">😕</span>
          <h2>Không tìm thấy khóa học nào</h2>
          <p>Thử tìm kiếm với từ khóa khác</p>
          <button onClick={() => navigate("/dashboard")}>
            Về trang chủ
          </button>
        </div>
      ) : (
        <div className="courses-grid">
          {courses.map((course) => (
            <div
              key={course._id}
              className="course-card"
              onClick={() => navigate(`/course/${course._id}`)}
            >
              <img
                src={course.thumbnail || "/default-course.jpg"}
                alt={course.title}
                className="course-thumbnail"
              />
              <div className="course-info">
                <h3>{course.title}</h3>
                <p className="teacher">
                  👨‍🏫 {course.teacher?.fullName || "Giảng viên"}
                </p>
                <p className="description">{course.description}</p>
                <div className="course-meta">
                  <span>👥 {course.totalStudents || 0} học viên</span>
                  <span>⭐ {course.rating || 0}/5</span>
                  {course.isFree ? (
                    <span className="free-badge">Miễn phí</span>
                  ) : (
                    <span className="price">{course.price?.toLocaleString()}đ</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}