import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Dashboard.css";
import NewsBanner from "../components/NewsBanner";

export default function Dashboard() {
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const ITEMS_PER_PAGE = 8;

  const [pageTrending, setPageTrending] = useState(1);
  const [pageFree, setPageFree] = useState(1);
  const [pagePaid, setPagePaid] = useState(1);

  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const storedUser = JSON.parse(localStorage.getItem("user"));
  const isTeacher = storedUser?.roles?.includes("teacher") ;

  // ✅ API URL
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
  const BASE_URL = API_URL.replace("/api", ""); // http://localhost:5000

  console.log("📍 API_URL:", API_URL);
  console.log("📍 BASE_URL:", BASE_URL);

  /* ===================== LOAD USER PROFILE ===================== */
  useEffect(() => {
    if (!token || !storedUser) {
      setUser(storedUser);
      return;
    }

    // ✅ Fetch latest user data dari server
    axios
      .get(`${API_URL}/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        console.log("✅ User profile loaded:", res.data);
        setUser(res.data);
        // Update localStorage
        localStorage.setItem("user", JSON.stringify(res.data));
      })
      .catch((err) => {
        console.error("❌ Error loading user profile:", err);
        // Fallback to stored user
        setUser(storedUser);
      });
  }, [token, API_URL]);

  /* ===================== LOAD COURSES (FILTER) ===================== */
  useEffect(() => {
    const url =
      selectedCategory === "all"
        ? `${API_URL}/courses`
        : `${API_URL}/courses?categorySlug=${selectedCategory}`;

    console.log("🔗 Fetching courses from:", url);

    axios
      .get(url)
      .then((res) => {
        if (res.data.success) {
          setCourses(res.data.courses || []);
          console.log("✅ Courses loaded:", res.data.courses?.length);
        }
      })
      .catch((err) => {
        console.error("❌ Error loading courses:", err);
        setCourses([]);
      });
  }, [selectedCategory, API_URL]);

  /* ===================== LOAD CATEGORIES ===================== */
  useEffect(() => {
    axios
      .get(`${API_URL}/categories`)
      .then((res) => {
        if (res.data.success) {
          setCategories(res.data.data || []);
        }
      })
      .catch((err) => console.error("❌ Error loading categories:", err));
  }, [API_URL]);

  /* ===================== LOAD ENROLLED COURSES ===================== */
  useEffect(() => {
      if (!token) {
    setLoading(false);
    return;
  }


    axios
      .get(`${API_URL}/courses/my-enrolled-courses`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        if (res.data.success) {
          setEnrolledCourses(res.data.courses?.map((c) => c._id) || []);
          console.log("✅ Enrolled courses:", res.data.courses?.length);
        }
      })
      .catch((err) => {
        console.error("❌ Error loading enrolled courses:", err);
      })
      .finally(() => setLoading(false));
  }, [token, isTeacher, API_URL]);

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
const paginate = (items, page) => {
  const start = (page - 1) * ITEMS_PER_PAGE;
  return items.slice(start, start + ITEMS_PER_PAGE);
};

  // ⭐ TRENDING COURSES
  const trendingCourses = visibleCourses
    .sort((a, b) => {
      if (a.rating !== b.rating) {
        return (b.rating || 0) - (a.rating || 0);
      }
      return (b.totalStudents || 0) - (a.totalStudents || 0);
    })
    .slice(0, 8);

  const freeCourses = visibleCourses.filter((c) => c.isFree);
  const paidCourses = visibleCourses.filter((c) => !c.isFree);

  /* ===================== UTILS ===================== */
  const isOwnerOfCourse = (course) => {
    if (!course.teacher || !user) return false;
    const teacherId = course.teacher._id || course.teacher;
    const userId = user._id || user.id;
    return teacherId.toString() === userId.toString();
  };

  const handleCourseClick = (course) => {
  // 1️⃣ Nếu là giáo viên sở hữu khóa học
  if (isOwnerOfCourse(course) || user.roles?.includes("admin")) {
    navigate(`/course/${course._id}`);
    return;
  }

  // 2️⃣ Khóa học miễn phí
  if (course.isFree) {
    navigate(`/course/${course._id}`);
    return;
  }

  // 3️⃣ Đã đăng ký (student hoặc teacher đều tính)
  if (enrolledCourses.includes(course._id)) {
    navigate(`/course/${course._id}`);
    return;
  }

  // 4️⃣ Chưa đăng ký
  navigate(`/course-review/${course._id}`);
};


  const renderCourseCard = (course) => {
    const isOwner = isOwnerOfCourse(course);
    const isEnrolled = enrolledCourses.includes(course._id);

    return (
      <div
        key={course._id}
        className={`course-card ${!course.isFree ? "paid-card" : "free-card"}`}
        onClick={() => handleCourseClick(course)}
      >
        {/* ✅ Course thumbnail */}
        <img
          src={course.thumbnail || "https://via.placeholder.com/300x200"}
          alt={course.title}
          onError={(e) => {
            e.target.src = "https://via.placeholder.com/300x200";
          }}
        />

        {/* ✅ Enrolled badge */}
        {!course.isFree  && isEnrolled && (
          <span className="enrolled-badge">
            <img
          src={`${BASE_URL}/uploads/images/login.png`}
          alt="Hero"
          style={{height: "2px"}}
          onError={(e) => {
            e.target.style.display = "none";
          }}
        /></span>
        )}

        {/* ✅ Owner badge */}
        {isTeacher && isOwner && <span className="status-owner">✏️</span>}

        <h3 className="title">{course.title}</h3>
        <p className="teacher-name">{course.teacher?.fullName}</p>

        {/* ✅ Price */}
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
          <p className="student-count"><img
            src={`${BASE_URL}/uploads/images/user.png`}
            alt="Fire"
            style={{ height: "5px" }}
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />{course.totalStudents || 0}</p>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="dashboard-container">⏳ Đang tải...</div>;
  }

  return (
    <div className="dashboard-container">
      {/* ===================== HEADER ===================== */}
      <div className="welcome-user">
        {/* ✅ Avatar - Hiển thị từ user.avatarUrl */}
        <img
          src={
            user?.avatarUrl ||
            user?.avatar ||
            "https://cdn-icons-png.flaticon.com/512/847/847969.png"
          }
          alt="avatar"
          className="user-avatar"
          onError={(e) => {
            e.target.src =
              "https://cdn-icons-png.flaticon.com/512/847/847969.png";
          }}
        />

        <h2>
          Welcome back,{" "}
          <span className="user-name">
            {user?.fullName || user?.username || "bạn"}
          </span>
        </h2>
      </div>

      {/* ===================== HERO ROW ===================== */}
      <div className="hero-image">
        <img
          src={`${BASE_URL}/uploads/images/79272521_9725995.jpg`}
          alt="Hero"
          onError={(e) => {
            e.target.style.display = "none";
          }}
        />
      </div>

      <div className="dashboard-hero">
        <h2 style={{marginLeft: "20px"}}>
          Hot news
          <img
            src={`${BASE_URL}/uploads/images/fire.png`}
            alt="Fire"
            style={{ height: "27px" }}
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        </h2>
        <div className="hero-banner">
          <NewsBanner onSelectNews={(id) => navigate(`/news/${id}`)} />
        </div>
      </div>

      {/* ===================== TRENDING COURSES ===================== */}
      {trendingCourses.length > 0 && selectedCategory === "all" && (
        <section className="course-section">
          <h3 className="section-title trending">Trending courses</h3>
          <div className="course-grid">
            {trendingCourses.map((course) => renderCourseCard(course))}
          </div>
        </section>
      )}

      {/* ===================== FREE COURSES ===================== */}
      <section className="course-section">
        <h3 className="section-title free">Community courses</h3>
        {freeCourses.length ? (
          <div className="course-grid">
            {freeCourses.map((course) => renderCourseCard(course))}
          </div>
        ) : (
          <p className="no-course">Không có khóa học miễn phí</p>
        )}
      </section>

      {/* ===================== PAID COURSES ===================== */}
      <section className="course-section">
        <h3 className="section-title paid">Enhance courses</h3>
        {paidCourses.length ? (
          <div className="course-grid">
            {paidCourses.map((course) => renderCourseCard(course))}
          </div>
        ) : (
          <p className="no-course">Chưa có khóa học trả phí</p>
        )}
      </section>
    </div>
  );
}