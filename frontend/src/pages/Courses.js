import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./CourseDetail.css";

export default function CourseDetail() {
const { id } = useParams();
const [course, setCourse] = useState(null);
const navigate = useNavigate();

useEffect(() => {
fetch(`http://localhost:5000/api/courses/${id}`)
.then((res) => res.json())
.then((data) => setCourse(data))
.catch((err) => console.error("Error fetching course:", err));
}, [id]);

if (!course) {
return <div className="course-detail-container">Đang tải khóa học...</div>;
}

return ( <div className="course-detail-container">
{/* Banner */} <div className="course-banner">
<img src={course.thumbnail || "/default-banner.jpg"} alt={course.title} /> <div className="overlay"></div> <div className="course-info"> <h1>{course.title}</h1> <p>👨‍🏫 Giảng viên: {course.instructor || "Chưa cập nhật"}</p> <p>⭐ Đánh giá: {course.rating || "Chưa có"}</p> </div> </div>

```
  {/* Nội dung khóa học */}
  <div className="course-content">
    <h2>Giới thiệu khóa học</h2>
    <p>{course.description}</p>

    <h2>Thông tin chi tiết</h2>
    <p>
      ⏱ Thời lượng: {course.duration || "Không rõ"} <br />
      💪 Cấp độ: {course.level || "Mọi trình độ"} <br />
      👥 Học viên: {course.totalStudents || 0}
    </p>

    <h2>Danh sách bài học</h2>
    <ul className="lesson-list">
      {course.lessons && course.lessons.length > 0 ? (
        course.lessons.map((lesson, index) => (
          <li key={index}>
            {lesson.title} — {lesson.duration}
          </li>
        ))
      ) : (
        <p>Khóa học này chưa có bài học nào.</p>
      )}
    </ul>

    <h2>Giảng viên</h2>
    <div style={{ display: "flex", alignItems: "center", marginTop: "10px" }}>
      <img
        src={course.instructorImage || "/default-teacher.jpg"}
        alt={course.instructor}
        style={{
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          marginRight: "15px",
        }}
      />
      <div>
        <strong>{course.instructor || "Chưa cập nhật"}</strong>
        <p style={{ color: "#555" }}>Giảng viên hướng dẫn chính</p>
      </div>
    </div>

    <h2>Đánh giá học viên</h2>
    {course.reviews && course.reviews.length > 0 ? (
      course.reviews.map((review, i) => (
        <div
          key={i}
          style={{
            background: "#f9fafb",
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "10px",
          }}
        >
          <p>
            <strong>{review.user}</strong> — ⭐ {review.stars}/5
          </p>
          <p>{review.comment}</p>
        </div>
      ))
    ) : (
      <p>Chưa có đánh giá nào.</p>
    )}

    <button
      onClick={() => navigate(-1)}
      style={{
        marginTop: "30px",
        padding: "10px 20px",
        backgroundColor: "#3b82f6",
        color: "white",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
      }}
    >
      ⬅ Quay lại Dashboard
    </button>
  </div>
</div>


);
}
