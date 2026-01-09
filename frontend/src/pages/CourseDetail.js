import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import LessonTab from "../components/CourseDetail/LessonTab";
import ExerciseTab from "../components/CourseDetail/ExerciseTab";
import EnrollmentPanel from "../components/EnrollSettings";
import FileTab from "../components/CourseDetail/FileTab";
import ChatBox from "../components/ChatBox";
import MiniCalendar from "../components/MiniCalendar";
import ScheduleForm from "../components/ScheduleForm";
import EnrollmentSettings from "../components/EnrollSettings";
import PendingStudentsPanel from "./PendingStudentsPanel";
import io from "socket.io-client";
import TeacherChatList from "../components/TeacherChatList";
import "./CourseDetail.css";

export default function CourseDetail() {
  const { id } = useParams();
  
  const [course, setCourse] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [activeTab, setActiveTab] = useState("lessons");
  const user = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");
  const navigate = useNavigate();
  const [editingBanner, setEditingBanner] = useState(false);
  const [draggedBanner, setDraggedBanner] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [userReview, setUserReview] = useState(null);

  // chat state
  const socketRef = useRef(null);
  const fetchedConvos = useRef(false);
  const [chatTarget, setChatTarget] = useState(null);
  const joinedRooms = useRef(new Set());
  const [hasJoined, setHasJoined] = useState(false)
  const [newReview, setNewReview] = useState({ stars: 5, comment: "" });  
  const [quizzes, setQuizzes] = useState([]); 
  const isTeacher = user?.roles?.includes("teacher");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const isOwner =
    user && course?.teacher && user._id === course.teacher._id;
  const isStudentJoined = (course, user) => {
    if (!course?.students?.length || !user?._id) return false;
    return course.students.some(s => {
      if (!s) return false;
      const studentId = typeof s === "string" ? s : s?._id;
      return studentId?.toString() === user._id.toString();
    });
  };

  // ===========================
  // 🟦 Fetch course data
  const fetchCourse = useCallback(async () => {
    if (!token) {
      alert("⚠️ Bạn cần đăng nhập để xem chi tiết khóa học!");
      navigate("/login");
      return;
    }
    try {
      const res = await fetch( `${process.env.REACT_APP_API_URL}/courses/${id}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.status === 401) {
        alert("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!");
        navigate("/login");
        return;
      }
      const data = await res.json();
      setCourse(data);
    } catch (err) {
      console.error("Error fetching course:", err);
    }
  }, [id, navigate, token]);

  useEffect(() => {
    fetchCourse();
  }, [fetchCourse]);

  useEffect(() => {
    if (!course) return;
    setHasJoined(course.joined);
  }, [course]);

  // ==================================
  const handleBannerUpload = async (file) => {
    if (!file.type.startsWith("image/")) {
      alert("❌ Vui lòng chọn file ảnh!");
      return;
    }

    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/upload/image`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        const updateRes = await fetch( `${process.env.REACT_APP_API_URL}/courses/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            thumbnail: data.imageUrl,
          }),
        });

        const updatedCourse = await updateRes.json();
        setCourse(updatedCourse.course || updatedCourse);
        setEditingBanner(false);
        alert("✅ Cập nhật banner thành công!");
      } else {
        alert("❌ " + (data.message || "Lỗi upload"));
      }
    } catch (err) {
      console.error(err);
      alert("❌ Lỗi upload banner");
    }
  };

  const handleScheduleSaved = () => {
    console.log("✅ Lịch đã lưu!");
  };

  // =====================
  // 🙈 ẨN / HIỆN KHÓA HỌC
  // =====================
  const handleToggleHidden = async () => {
    if (!window.confirm("Bạn có chắc muốn ẩn/hiện khóa học này?")) return;

    try {
      const res = await fetch(
         `${process.env.REACT_APP_API_URL}/courses/${id}/hidden`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) throw new Error(data.message);

      alert(data.message);

      setCourse((prev) => ({
        ...prev,
        isHidden: data.isHidden,
      }));
    } catch (err) {
      console.error("Toggle hidden error:", err);
      alert(err.message || "Không thể ẩn/hiện khóa học");
    }
  };

  // =====================
  // 🗑️ XÓA KHÓA HỌC
  // =====================
  const handleDeleteCourse = async () => {
    if (!window.confirm("⚠️ Xóa vĩnh viễn khóa học này? Không thể khôi phục!")) return;

    try {
      const res = await fetch(
         `${process.env.REACT_APP_API_URL}/courses/${course._id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) throw new Error(data.message);

      alert("🗑️ Đã xóa khóa học");

      navigate("/my-courses");
    } catch (err) {
      console.error("Delete course error:", err);
      alert(err.message || "Xóa khóa học thất bại");
    }
  };

  const handleBannerDragOver = (e) => {
    e.preventDefault();
    setDraggedBanner(true);
  };

  const handleBannerDragLeave = (e) => {
    e.preventDefault();
    setDraggedBanner(false);
  };

  const handleBannerDrop = (e) => {
    e.preventDefault();
    setDraggedBanner(false);
    const file = e.dataTransfer.files[0];
    if (file) handleBannerUpload(file);
  };

  // ===========================
  // 🟦 Initialize socket
  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io(`${process.env.REACT_APP_SOCKET_URL}`, { auth: { token } });
    }
  }, [token]);

  // ===========================
  // 🟦 Teacher join rooms automatically
  useEffect(() => {
    if (!course || !user || fetchedConvos.current) {
      return;
    }
    
    fetchedConvos.current = true;

    const startConversation = async (targetId) => {
      if (!targetId) {
        console.warn("⚠️ No targetId provided");
        return;
      }

      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/chat/start`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json", 
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify({ userId: targetId, courseId: course._id }),
        });

        if (!res.ok) {
          console.error("❌ Chat API error:", res.status);
          return;
        }

        const convo = await res.json();
        
        if (!convo || !convo._id) {
          console.warn("⚠️ Invalid conversation data:", convo);
          return;
        }

        if (!joinedRooms.current.has(convo._id)) {
          socketRef.current?.emit("join_room", convo._id);
          joinedRooms.current.add(convo._id);
          console.log("✅ Joined room:", convo._id);
        }
      } catch (err) { 
        console.error("❌ Conversation create error:", err); 
      }
    };

    if (user.roles?.includes("teacher")) {
      if (course.students && Array.isArray(course.students)) {
        console.log(`📞 Starting convos with ${course.students.length} students`);
        course.students.forEach(student => {
          if (student && student._id) {
            startConversation(student._id);
          }
        });
      } else {
        console.warn("⚠️ course.students không hợp lệ:", course.students);
      }
    } 
    else if (user.roles?.includes("student")) {
      if (course.teacher && course.teacher._id) {
        console.log("📞 Starting convo with teacher");
        startConversation(course.teacher._id);
      } else {
        console.warn("⚠️ course.teacher không hợp lệ:", course.teacher);
      }
    }
  }, [course, user, token]);
// Check user's review
  useEffect(() => {
  if (course?.reviews && user?._id) {
    const existing = course.reviews.find(r => r.userId === user._id);
    setUserReview(existing || null);
  }
}, [course?.reviews, user?._id]);
  // ===========================
  // 🟦 Open chat button
  const openChat = async (target) => {
    if (!target?._id) return alert("Không xác định được người để chat!");

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/chat/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: target._id, courseId: course._id })
      });

      if (!res.ok) {
        const err = await res.json();
        return alert("Không mở được đoạn chat: " + err.error);
      }

      const convo = await res.json();
      if (!joinedRooms.current.has(convo._id)) {
        socketRef.current.emit("join_room", convo._id);
        joinedRooms.current.add(convo._id);
      }

      setChatTarget({ convoId: convo._id, student: target });

    } catch (err) {
      console.error("Open chat error:", err);
    }
  };

  // ==================
  const handleKickStudent = async (studentId, studentName) => {
    if (!window.confirm(`Bạn có chắc muốn kick ${studentName} ra khỏi khóa học?`)) return;

    try {
      const res = await fetch( `${process.env.REACT_APP_API_URL}/courses/${id}/kick-student`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ studentId }),
      });

      const data = await res.json();
      if (res.ok) {
        alert("✅ Đã kick học viên ra khỏi khóa học");
        // Fetch lại course để update data chính xác
        fetchCourse();
      } else {
        alert("❌ " + (data.message || "Lỗi khi kick học viên"));
      }
    } catch (err) {
      console.error(err);
      alert("❌ Lỗi kết nối server");
    }
  };

  const handleJoinCourse = async () => {
    try {
      const res = await fetch( `${process.env.REACT_APP_API_URL}/courses/${id}/join`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
      });

      const data = await res.json();
      
      if (!res.ok) {
        alert(data.message || "Có lỗi xảy ra");
        return;
      }

      setCourse(prevCourse => ({
        ...prevCourse,
        ...data.course,
        joined: true,
        students: [...(prevCourse.students || []), user]
      }));
      setHasJoined(true);
      
      alert(data.message || "✅ Bạn đã tham gia khóa học!");
    } catch (err) {
      console.error("Join course error:", err);
      alert("❌ Có lỗi xảy ra khi tham gia khóa học");
    }
  };

  // ===========================
  // 🟦 Lesson handling
  const handleAddLesson = async (sectionId, lessonData) => {
    try {
      const res = await fetch(
         `${process.env.REACT_APP_API_URL}/courses/${course._id}/sections/${sectionId}/lessons`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(lessonData),
        }
      );
      const data = await res.json();
      if (res.ok) {
        setCourse(data.course);
        setSelectedLesson(data.addedLesson);
      } else alert("❌ Lỗi: " + data.error);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateLesson = async (lesson) => {
    try {
      const res = await fetch(
         `${process.env.REACT_APP_API_URL}/courses/${course._id}/lessons/${lesson._id}`,
        {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(lesson),
        }
      );
      const data = await res.json();
      if (res.ok) {
        setCourse(data.course);
        setSelectedLesson(lesson);
      } else alert("❌ Lỗi: " + data.error);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteLesson = async (lessonId) => {
    try {
      const res = await fetch(
         `${process.env.REACT_APP_API_URL}/courses/${course._id}/lessons/${lessonId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          }
        }
      );
      const data = await res.json();
      if (res.ok) {
        setCourse(data.course);
        if (selectedLesson?._id === lessonId) setSelectedLesson(null);
      } else alert("❌ Lỗi: " + data.error);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSection = async (title) => {
    try {
      const res = await fetch(
         `${process.env.REACT_APP_API_URL}/courses/${course._id}/add-section`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ title }),
        }
      );
      const data = await res.json();
      if (res.ok) setCourse(data.course);
      else alert("❌ Lỗi: " + data.error);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSection = async (sectionId) => {
    try {
      const res = await fetch(
         `${process.env.REACT_APP_API_URL}/courses/${course._id}/sections/${sectionId}`,
        { 
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      const data = await res.json();
      if (res.ok) setCourse(data.course);
      else alert("❌ Lỗi: " + data.error);
    } catch (err) {
      console.error(err);
    }
  };

  // ===========================
  // 🟦 Review handling
  const handleAddReview = async () => {
    if (!newReview.comment) return alert("Vui lòng nhập nội dung đánh giá!");
    if (userReview) {
    return alert("❌ Bạn đã đánh giá khóa học này rồi. Mỗi học viên chỉ được đánh giá 1 lần.");
  }

    try {
      const res = await fetch(
         `${process.env.REACT_APP_API_URL}/courses/${id}/reviews`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", },
          body: JSON.stringify({
            userId: user._id,  // ⭐ Gửi userId
            user: user?.fullName || "Anonymous",
            stars: newReview.stars,
            comment: newReview.comment,
          }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        setCourse((prev) => ({ ...prev, reviews: data.reviews }));
        setUserReview(data.reviews.find(r => r.userId === user._id));
        setNewReview({ stars: 5, comment: "" });
      } else alert("❌ Lỗi: " + data.error);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm("Bạn có chắc muốn xóa đánh giá này không?")) return;
    try {
      const res = await fetch(
         `${process.env.REACT_APP_API_URL}/courses/${id}/reviews/${reviewId}`,
        { method: "DELETE", 
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user._id }) }
      );
      const data = await res.json();
      if (res.ok) {
      setCourse((prev) => ({ ...prev, reviews: data.reviews }));
      setUserReview(null); // ⭐ Reset userReview
      alert("✅ Đã xóa đánh giá");
    } else {
      alert("❌ Lỗi: " + data.error);
    }
    } catch (err) {
      console.error(err);
    }
  };

  // ===========================
  if (!course) return <div className="course-detail-container">Đang tải khóa học...</div>;

  return (
    <div className="course-detail">
      <div className="course-header">
{course.editable  && (
  <div className="course-settings">
    <button
      className="settings-btn"
      onClick={() => setIsEditMode(prev => !prev)}
    >
      {isEditMode ? "👁️" : "⚙️"}
    </button>
  </div>
)}
  
</div>

      {/* Banner */}
      { course.editable && (
      <div
        className={`course-banner ${!course.isFree ? "vip-banner" : ""} ${editingBanner ? "editing" : ""} ${draggedBanner ? "dragging" : ""}`}
        onDragOver={isEditMode ? handleBannerDragOver : null}
        onDragLeave={isEditMode ? handleBannerDragLeave : null}
        onDrop={isEditMode ? handleBannerDrop : null}
      >
        <img src={course.thumbnail || "/default-banner.jpg"} alt={course.title} />
        <div className="banner-overlay">
         
          {!course.isFree && <span className="vip-tag">💎</span>}
          {isEditMode && (
            <button
              className="edit-banner-btn"
              onClick={() => setEditingBanner(!editingBanner)}
            >
              {editingBanner ? "❌" : "✏️"}
            </button>
          )}
        </div>
        {editingBanner && course.editable && (
          <div className="banner-edit-zone">
            <span className="edit-text">📸 Kéo thả ảnh mới vào đây</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files[0]) {
                  handleBannerUpload(e.target.files[0]);
                }
              }}
              style={{ display: "none" }}
              id="banner-upload"
            />
            <label htmlFor="banner-upload" className="upload-label">
              Chọn ảnh từ máy
            </label>
          </div>
        )}
      </div>
)}

        <div className="course-info-wrapper">
  <div className="course-info-left">
    <h1>{course.title}</h1>
    <p>{course.description}</p>
    <div className="course-goals">
      <h3>Bạn sẽ học được gì?</h3>
      <ul>
        <li>Các kiến thức cơ bản, nền móng của ngành IT</li>
        <li>Các mô hình, kiến trúc cơ bản khi triển khai ứng dụng</li>
        <li>Các khái niệm, thuật ngữ cốt lõi khi triển khai ứng dụng</li>
       
      </ul>
    </div>
    <div className="course-meta1">
      <p><img src={`${process.env.REACT_APP_API_URL.replace('/api','')}/uploads/images/teacher.png`} className="image1" alt="quiz" />Giảng viên: {course.teacher?.fullName || "Chưa cập nhật"}</p>
      <p><img src={`${process.env.REACT_APP_API_URL.replace('/api','')}/uploads/images/volume.png`} className="image" alt="quiz" />Trình độ: {course.level || "Cơ bản"}</p>
      <p><img src={`${process.env.REACT_APP_API_URL.replace('/api','')}/uploads/images/group-users.png`} className="image" alt="quiz" />Học viên: {course.totalStudents || 0}</p>
      <p><img src={`${process.env.REACT_APP_API_URL.replace('/api','')}/uploads/images/clock.png`} className="image" alt="quiz" />Tổng thời lượng: {course.totalDuration} phút</p>
    </div>
  </div>

  <div className="video-tutorial">
    <iframe 
      width="400" 
      height="225"
      src="https://www.youtube.com/embed/AWRCYCm2a8s" 
      title="Active Tab Animation" 
      frameBorder="0" 
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
      allowFullScreen
    ></iframe>
  </div>
</div>

      {/* Main content */}
      <div className="course-content">
       
        <div className="course-main">
          {/* Tabs */}
          <div className="course-tabs">
            <button className={`tab-btn ${activeTab==="lessons"?"active":""}`} onClick={()=>setActiveTab("lessons")}>Bài giảng</button>
            <button className={`tab-btn ${activeTab==="exercises"?"active":""}`} onClick={()=>setActiveTab("exercises")}>Bài tập</button>
            <button className={`tab-btn ${activeTab==="file"?"active":""}`} onClick={()=>setActiveTab("file")}>Tài liệu</button>
            { !course.isFree && (<button className={`tab-btn ${activeTab === "schedule" ? "active" : ""}`} onClick={() => setActiveTab("schedule")}>Thời khóa biểu </button> )}
          </div>

          {/* Tab content */}
          <div className="tab-content">
            {activeTab==="lessons" && <LessonTab 
              course={course}
              selectedLesson={selectedLesson}
              setSelectedLesson={setSelectedLesson}
              userRole={user.roles}
              isEditMode={isEditMode} 
              onAddLesson={handleAddLesson}
              onUpdateLesson={handleUpdateLesson}
              onDeleteLesson={handleDeleteLesson}
              onAddSection={handleAddSection}
              onDeleteSection={handleDeleteSection}
            />}
            {activeTab==="exercises" && <ExerciseTab course={course} isEditMode={isEditMode}  courseId={course._id} />}
            {activeTab==="file" && <FileTab course={course} isEditMode={isEditMode}  onResourceAdded={fetchCourse} />}
            {activeTab === "schedule"  && (
              <div className="schedule-tab">
                <div className="schedule-container">
                  <MiniCalendar
                    courseId={id}
                    token={token}
                  />
                </div>
              </div>
            )}
          </div>
                
          {/* Reviews */}
          <div className="review-section">
            <h2>Đánh giá</h2>
            {user.roles?.includes("student") && (
            <div className="add-review">
              <select value={newReview.stars} onChange={e=>setNewReview({...newReview, stars: Number(e.target.value)})}  disabled={!!userReview}>
                {[5,4,3,2,1].map(n=><option key={n} value={n}>{n} ★</option>)}
              </select>
              <textarea placeholder="Viết nhận xét..." value={newReview.comment} onChange={e=>setNewReview({...newReview, comment: e.target.value})}  disabled={!!userReview}></textarea>
              <button onClick={handleAddReview}  disabled={!!userReview}>{userReview ? "✅ Đã đánh giá" : "Thêm đánh giá"}</button>
              {userReview && <p style={{color: "gray", fontSize: "12px"}}>📝 Bạn có thể xóa và đánh giá lại</p>}
            </div>)}
            <div className="review-list">
            {course.reviews?.length>0 ? course.reviews.map((r,i)=>(
              <div key={i} className="review-item">
                <p><strong>{r.user}</strong> — <span>{"★".repeat(r.stars)}</span> ({r.stars}/5)</p>
                <p>{r.comment}</p>
                {user?._id === r.userId && (  // ⭐ So sánh userId thay vì name
      <button 
        onClick={()=>handleDeleteReview(r._id)} 
        style={{color:"red",border:"none",cursor:"pointer"}}
      >
        Xóa
      </button>
    )}
              </div>
            )): <p>Chưa có đánh giá</p>
            }
          </div>
          </div>
          {/* Sidebar */}
          <div className="course-sidebar">
            {user.roles?.includes("student") && course.isFree && (
              <button
                className="join-btn"
                onClick={handleJoinCourse}
                disabled={hasJoined}
              >
                {hasJoined ? "Đã tham gia" : "+ Tham gia khóa học"}
              </button>
            )}
          </div>

       
        </div>
        
        {user.roles?.includes("student") && course.teacher?._id && !course.isFree &&  (
          <button className="chat-teacher-btn" onClick={() => openChat(course.teacher)}>
            💬
          </button>
        )}
      
          
        {isEditMode && course.editable && (
          <div className="schedule">
          <ScheduleForm 
            ownerType="course" 
            ownerId={course._id}
            onSaveSuccess={handleScheduleSaved}
          />
          </div>
        )}
        
        {isTeacher && course.students?.length > 0 && (
          <div className="teacher-chat-list">
            <h4>👥 Danh sách học viên ({course.students.length})</h4>
            <div className="student-list">
              {course.students?.map((stu, index) => (
                <div key={stu._id ? stu._id : index} className="student-item">
                  <span className="student-name">{stu.fullName || stu.name}</span>
                  <button
                    className="chat-btn"
                    onClick={() => openChat(stu)}
                    title="Chat"
                  >
                    💬
                  </button>
                  {isEditMode && (
                  <button
                    className="kick-btn"
                    onClick={() => handleKickStudent(stu._id, stu.fullName || stu.name)}
                    title="Kick"
                  >
                    🚫
                  </button>)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      
      
      {isEditMode && course.editable && (
        <div className="teacher-controls">
          <EnrollmentPanel 
            courseId={id} 
            token={token}
            enrollmentCode={course.enrollmentCode}
            enrollmentMode={course.enrollmentMode}
          />

          <button 
            className="btn-toggle-hidden"
            onClick={handleToggleHidden}
          >
            {course.isHidden ? " Hiện khóa học" : "Ẩn khóa học"}
          </button>
          
          <button 
            className="btn-delete"
            onClick={handleDeleteCourse}
          >
            🗑️ Xóa khóa học
          </button>
        </div>
      )}
      
      {/* ChatBox popup */}
      {chatTarget?.convoId && (
        <div className="chatbox-container" >
          <div>
            <h4> {chatTarget.student?.fullName || "Học viên"}</h4>
            <button onClick={()=>setChatTarget(null)} style={{cursor:"pointer"}}>✖️</button>
          </div>
          <ChatBox
            open={true}
            conversationId={chatTarget.convoId}
            userId={user._id}
            token={token}
            socket={socketRef.current}
            onClose={()=>setChatTarget(null)}
          />
        </div>
      )}
    </div>
  );
}