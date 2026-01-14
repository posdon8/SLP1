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
  
  const navigate = useNavigate();

  // ✅ Get token properly
  const [token, setToken] = useState(null);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    
    console.log("🔍 TeacherDashboard token check:", {
      hasToken: !!storedToken,
      isValid: storedToken && storedToken !== "null" && storedToken !== "undefined",
      preview: storedToken ? storedToken.substring(0, 20) + "..." : "MISSING"
    });

    if (!storedToken || storedToken === "null" || storedToken === "undefined") {
      alert("⚠️ Please login first");
      navigate("/login");
      return;
    }

    setToken(storedToken);
  }, [navigate]);

  useEffect(() => {
    if (!token) return;

    const fetchMyCourses = async () => {
      try {
        console.log("📡 Fetching my courses...");
        
        const res = await fetch(
          `${process.env.REACT_APP_API_URL}/courses/my-courses`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            },
          }
        );

        const data = await res.json();
        
        console.log("📥 Response from /my-courses:", data);

        if (!res.ok) {
          console.error("❌ Failed to load courses:", data);
          
          // If unauthorized, redirect to login
          if (res.status === 401) {
            localStorage.clear();
            alert("⚠️ Session expired. Please login again.");
            navigate("/login");
          }
          return;
        }
        
        // ✅ Handle both response formats
        let coursesArray;
        if (data.success && data.courses) {
          // New format: { success: true, courses: [...] }
          coursesArray = data.courses;
          console.log("✅ Using new format - courses from data.courses");
        } else if (Array.isArray(data)) {
          // Old format: [...]
          coursesArray = data;
          console.log("⚠️ Using old format - data is array directly");
        } else {
          console.error("❌ Unknown response format:", data);
          coursesArray = [];
        }

        console.log("✅ Courses loaded:", coursesArray.length);
        setCourses(coursesArray);

      } catch (err) {
        console.error("🚨 Server error:", err);
        alert("❌ Failed to load courses. Please try again.");
      }
    };

    fetchMyCourses();
  }, [token, navigate]);

  const handleCourseAdded = (newCourse) => {
    console.log("✅ New course added:", newCourse);
    setCourses((prev) => [...prev, newCourse]);
    setShowForm(false);
  };

  const handleCourseClick = (course) => {
    navigate(`/course/${course._id}`);
  };

  const renderStatusBadge = (course) => {
    if (course.approvalStatus === "pending") {
      return <span className="status-badge pending">⏳ Pending</span>;
    }

    if (course.approvalStatus === "rejected") {
      return (
        <button
          className="status-badge rejected-btn"
          onClick={(e) => {
            e.stopPropagation();
            setRejectInfo(course);
          }}
        >
          ❌ Rejected
        </button>
      );
    }

    return null; // approved → no badge
  };

  const handleResubmit = async () => {
    try {
      console.log("🔄 Resubmitting course:", rejectInfo._id);
      
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/courses/${rejectInfo._id}/resubmit`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to resubmit");
      }

      alert("✅ Course resubmitted for review!");

      // Update UI
      setCourses((prev) =>
        prev.map((c) =>
          c._id === rejectInfo._id ? data.course : c
        )
      );

      setRejectInfo(null);
    } catch (err) {
      console.error("❌ Resubmit error:", err);
      alert("❌ " + err.message);
    }
  };

  // Show loading while checking token
  if (!token) {
    return (
      <div className="animated-bg">
        <div className="teacher-dashboard-container">
          <div className="loading-state">
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

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
          <h2>My Teaching</h2>

          <div className="header-actions">
            <button
              className="open-form-btn"
              onClick={() => setShowForm((prev) => !prev)}
            >
              {showForm ? "❌ Close" : " Create New Course"}
            </button>

            <button
              className="open-globalbank-btn"
              onClick={() => setShowGlobalBank(true)}
            >
               Global Question Bank
            </button>
          </div>
        </header>

        {/* MODAL: CREATE COURSE */}
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
              <AddCourseForm 
                token={token} 
                onCourseAdded={handleCourseAdded} 
              />
            </div>
          </div>
        )}

        {/* MODAL: GLOBAL BANK */}
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

        {/* MODAL: REJECT INFO */}
        {rejectInfo && (
          <div className="modal-overlay" onClick={() => setRejectInfo(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button
                className="close-modal-btn"
                onClick={() => setRejectInfo(null)}
              >
                ✖
              </button>

              <h2>❌ Course Rejected</h2>
              <h3 className="reject-course-title">{rejectInfo.title}</h3>
              
              <div className="reject-details">
                <p><strong>Rejection Reason:</strong></p>
                <p className="reject-reason">
                  {rejectInfo.rejectionReason || 
                   rejectInfo.adminReview?.note || 
                   "No reason provided"}
                </p>
              </div>

              <button
                className="resubmit-btn"
                onClick={handleResubmit}
              >
                🔁 Resubmit for Review
              </button>
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
                  course.approvalStatus === "pending" || 
                  course.approvalStatus === "rejected" 
                    ? "disabled" 
                    : ""
                }`}
                onClick={() => {
                 
                    handleCourseClick(course);
                  
                }}
              >
                <div className="course-image">
                  {course.thumbnail ? (
                    <img src={course.thumbnail} alt={course.title} />
                  ) : (
                    <div className="no-image">📚</div>
                  )}
                </div>

                {renderStatusBadge(course)}

                <div className="course-info">
                  <h3>{course.title}</h3>
                  
                  {course.isFree  && course.accessType === "public" ?  (
                    <p className="price free">Free</p>
                  ) : (
                    <p className="price">{course.price?.toLocaleString()}đ</p>
                  )}
                  {course.accessType === "private" && (
                    <p className="private"> Private </p>
                  )}
                  <div className="course-footer">
                    <span className="rating">
                      {course.rating > 0
                        ? `⭐ ${course.rating.toFixed(1)}`
                        : "⭐ No ratings yet"}
                    </span>
                    <p className="student-count">
                      👥 {course.totalStudents || 0} students
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <h3>No courses yet</h3>
            <p>Create your first course to start teaching!</p>
            <button
              className="create-first-btn"
              onClick={() => setShowForm(true)}
            >
              ➕ Create Your First Course
            </button>
          </div>
        )}
      </div>
    </div>
  );
}