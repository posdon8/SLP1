import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./LessonTab.css";

export default function LessonTab({
  course,
  selectedLesson,
  setSelectedLesson,
  userRole,
  isEditMode,
  onUpdateLesson,
  onAddLesson,
  onDeleteLesson,
  onAddSection,
  onDeleteSection
}) {
  const navigate = useNavigate();
  const [openSections, setOpenSections] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [draggedFile, setDraggedFile] = useState(null);
  const [uploadingSection, setUploadingSection] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [editingSectionId, setEditingSectionId] = useState(null);

  const user = JSON.parse(localStorage.getItem("user"));
  const isTeacher = user?.roles?.includes("teacher");
  const token = localStorage.getItem("token");
  
  const [newLesson, setNewLesson] = useState({
    type: "video",
    title: "",
    duration: "",
    videoUrl: "",
    fileUrl: "",
    fileName: "",
    fileType: "",
    quizId: ""
  });

  const isOwner =
    course.teacher &&
    (course.teacher._id
      ? course.teacher._id.toString() === user._id
      : course.teacher.toString() === user._id);

  // Fetch danh sách quiz
  useEffect(() => {
    if (isTeacher && course._id) {
      fetchQuizzes();
    }
  }, [course._id, isTeacher]);

  const fetchQuizzes = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/quiz/${course._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setQuizzes(data.quizzes || []);
      }
    } catch (err) {
      console.error("Error fetching quizzes:", err);
    }
  };

  const toggleSection = (index) => {
    setOpenSections((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const handleLessonClick = (lesson) => {
    setSelectedLesson(lesson);
    setIsModalOpen(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedFile(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedFile(false);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedLesson(null);
  };

  // Upload video
  const handleVideoDrop = async (e, sectionId) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedFile(false);

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith("video/")) {
      return alert("❌ Vui lòng kéo thả file video!");
    }

    const formData = new FormData();
    formData.append("video", file);

    try {
      setUploadingSection(sectionId);
      const response = await fetch( `${process.env.REACT_APP_API_URL}/upload/video`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();
      if (response.ok && data.videoUrl) {
        setNewLesson({
          ...newLesson,
          videoUrl: data.videoUrl,
          title: file.name.replace(/\.[^/.]+$/, "")
        });
        alert("✅ Upload video thành công!");
      } else {
        alert("❌ " + (data.message || "Lỗi upload video"));
      }
    } catch (err) {
      console.error("Lỗi upload:", err);
      alert("❌ Lỗi kết nối server");
    } finally {
      setUploadingSection(null);
    }
  };

  // Upload file tài liệu
  const handleFileDrop = async (e, sectionId) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedFile(false);

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain"
    ];

    if (!allowedTypes.includes(file.type)) {
      return alert("❌ Chỉ chấp nhận file: PDF, DOC, DOCX, XLS, XLSX, TXT");
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploadingSection(sectionId);
      const response = await fetch( `${process.env.REACT_APP_API_URL}/upload/file`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();
      if (response.ok && data.fileUrl) {
        setNewLesson({
          ...newLesson,
          fileUrl: data.fileUrl,
          fileName: file.name,
          fileType: file.name.split(".").pop(),
          title: file.name.replace(/\.[^/.]+$/, "")
        });
        alert("✅ Upload file thành công!");
      } else {
        alert("❌ " + (data.message || "Lỗi upload file"));
      }
    } catch (err) {
      console.error("Lỗi upload:", err);
      alert("❌ Lỗi kết nối server");
    } finally {
      setUploadingSection(null);
    }
  };

  const handleAddSection = () => {
    if (!newSectionTitle.trim()) return alert("Vui lòng nhập tên chương học!");
    onAddSection(newSectionTitle);
    setNewSectionTitle("");
  };

  const handleAddLessonClick = (sectionId) => {
    if (!newLesson.title) {
      return alert("Vui lòng nhập tên bài học!");
    }

    if (newLesson.type === "video" && !newLesson.videoUrl) {
      return alert("Vui lòng chọn video!");
    }

    if (newLesson.type === "file" && !newLesson.fileUrl) {
      return alert("Vui lòng chọn file!");
    }

    if (newLesson.type === "quiz" && !newLesson.quizId) {
      return alert("Vui lòng chọn quiz!");
    }

    if (newLesson.type === "video" && !newLesson.duration) {
      return alert("Vui lòng nhập thời lượng video!");
    }

    onAddLesson(sectionId, newLesson);
    setNewLesson({
      type: "video",
      title: "",
      duration: "",
      videoUrl: "",
      fileUrl: "",
      fileName: "",
      fileType: "",
      quizId: ""
    });
  };

  const handleDeleteLessonClick = (lessonId) => {
    if (window.confirm("Bạn có chắc muốn xóa bài học này không?")) {
      onDeleteLesson(lessonId);
    }
  };

  const handleEditLesson = (lesson) => {
  if (!isEditMode) return;
  setEditingLesson(lesson);
};


  const handleSaveEdit = () => {
    if (!editingLesson?._id) return alert("Bài học chưa được tạo trên server!");
    
    // Validate khi edit
    if (editingLesson.type === "video" && !editingLesson.duration) {
      return alert("Video cần phải có thời lượng!");
    }
    
    onUpdateLesson(editingLesson);
    setEditingLesson(null);
  };

  const getQuizTitle = (quizId) => {
    const quiz = quizzes.find(q => q._id === quizId);
    return quiz?.title || "Quiz";
  };

  const renderLessonPreview = (lesson, secIdx, lessonIdx) => {
  let icon;
  switch (lesson.type) {
    case "video":
      icon = <img src= {`${process.env.REACT_APP_API_URL.replace("/api", "")}/uploads/images/play-button.png` } className="image" alt="play" />;
      break;
    case "file":
      icon = <img src= {`${process.env.REACT_APP_API_URL.replace("/api", "")}/uploads/images/document1.png`} className="image" alt="document" />;
      break;
    case "quiz":
      icon = <img src={`${process.env.REACT_APP_API_URL.replace("/api", "")}/uploads/images/question-sign.png`} className="image" alt="quiz" />;
      break;
    default:
      icon = <>📚</>;
  }

  return (
    <span className="lesson-preview" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
      {icon}
      <span style={{ fontWeight: "bold" }}>{secIdx + 1}.{lessonIdx + 1}</span>
      <span>{lesson.title}</span>
    </span>
  );
};


  return (
    <div className="lesson-tab">
      <h3>Danh sách bài học</h3>

      {isEditMode && isTeacher && isOwner && (
        <div className="add-section">
          <input
            type="text"
            placeholder="Nhập tên chương học..."
            value={newSectionTitle}
            onChange={(e) => setNewSectionTitle(e.target.value)}
          />
          <button onClick={handleAddSection}>➕ Thêm chương</button>
        </div>
      )}

      {course.sections?.map((section, secIdx) => (
        <div key={section._id} className="section">
          <div className="section-header" onClick={() => toggleSection(secIdx)}>
            <span>{openSections[secIdx] ? "▼" : "▶"}  Chương {secIdx + 1}: {section.title}</span>
            <span>{section.lessons?.length || 0} bài học</span>

            {isEditMode && isTeacher && isOwner && (
              <div className="section-actions">
                <button
                  className={`edit-section-btn ${editingSectionId === section._id ? "active" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingSectionId(editingSectionId === section._id ? null : section._id);
                  }}
                  title="Chế độ edit"
                >
                  {editingSectionId === section._id ? "✔️ Xong" : "✏️"}
                </button>
                <button
                  className="delete-section-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm("Bạn có chắc muốn xóa chương này không?")) {
                      onDeleteSection(section._id);
                    }
                  }}
                >
                  🗑️
                </button>
              </div>
            )}
          </div>

          {openSections[secIdx] && (
            <ul className="lesson-list">
              {section.lessons?.map((lesson, lessonIdx) => (
                <li
                  key={lesson._id}
                  className={`lesson-item ${selectedLesson?._id === lesson._id ? "active" : ""}`}
                >
                  <div onClick={() => handleLessonClick(lesson)}>
                    <span>{renderLessonPreview(lesson, secIdx, lessonIdx)} </span>
                    {lesson.type === "video" && lesson.duration && (
                      <span className="lesson-time">{lesson.duration} phút</span>
                    )}
                  </div>

                  { isEditMode && isTeacher && isOwner && editingSectionId === section._id && (
                    <div className="lesson-actions">
                      <button className="edit-btn" onClick={() => handleEditLesson(lesson)}>✏️</button>
                      <button className="delete-btn" onClick={() => handleDeleteLessonClick(lesson._id)}>🗑️</button>
                    </div>
                  )}
                </li>
              ))}

              {/* Thêm bài học mới - Chỉ hiển thị ở chế độ edit */}
              {isEditMode && isTeacher && isOwner && editingSectionId === section._id && (
                <li className="lesson-add">
                  <div className="lesson-type-select">
                    <label>Loại bài học:</label>
                    <select
                      value={newLesson.type}
                      onChange={(e) =>
                        setNewLesson({
                          ...newLesson,
                          type: e.target.value,
                          videoUrl: "",
                          fileUrl: "",
                          quizId: "",
                          duration: ""
                        })
                      }
                    >
                      <option value="video" style={{ color: "#666" }}>📹 Video</option>
                      <option value="file">📄 Tài liệu</option>
                      <option value="quiz">❓ Quiz</option>
                    </select>
                  </div>

                  <input
                    type="text"
                    placeholder="Tên bài học"
                    value={newLesson.title}
                    onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })}
                  />

                  {/* DURATION CHỈ CHO VIDEO */}
                  {newLesson.type === "video" && (
                    <input
                      type="number"
                      placeholder="Thời lượng (phút)"
                      value={newLesson.duration}
                      onChange={(e) => setNewLesson({ ...newLesson, duration: e.target.value })}
                    />
                  )}

                  {/* VIDEO SECTION */}
                  {newLesson.type === "video" && (
                    <>
                      <div
                        className={`video-drop-zone ${draggedFile ? "dragging" : ""} ${uploadingSection === section._id ? "uploading" : ""}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleVideoDrop(e, section._id)}
                      >
                        {uploadingSection === section._id ? (
                          <span>⏳ Đang upload...</span>
                        ) : (
                          <>
                            <span className="drop-icon">📹</span>
                            <span className="drop-text">
                              {newLesson.videoUrl ? "✅ Video đã chọn" : "Kéo thả video vào đây"}
                            </span>
                          </>
                        )}
                      </div>
                      {newLesson.videoUrl && (
                        <small className="video-selected">✓ Video URL: {newLesson.videoUrl.slice(0, 40)}...</small>
                      )}
                    </>
                  )}

                  {/* FILE SECTION */}
                  {newLesson.type === "file" && (
                    <>
                      <div
                        className={`video-drop-zone ${draggedFile ? "dragging" : ""} ${uploadingSection === section._id ? "uploading" : ""}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleFileDrop(e, section._id)}
                      >
                        {uploadingSection === section._id ? (
                          <span>⏳ Đang upload...</span>
                        ) : (
                          <>
                            <span className="drop-icon">📄</span>
                            <span className="drop-text">
                              {newLesson.fileUrl ? "✅ File đã chọn" : "Kéo thả file vào đây (PDF, DOC, XLSX...)"}
                            </span>
                          </>
                        )}
                      </div>
                      {newLesson.fileUrl && (
                        <small className="video-selected">✓ File: {newLesson.fileName}</small>
                      )}
                    </>
                  )}

                  {/* QUIZ SECTION */}
                  {newLesson.type === "quiz" && (
                    <div className="quiz-select">
                      <select
                        value={newLesson.quizId}
                        onChange={(e) => setNewLesson({ ...newLesson, quizId: e.target.value })}
                      >
                        <option value="">-- Chọn quiz --</option>
                        {quizzes.map((q) => (
                          <option key={q._id} value={q._id}>
                            {q.title}
                          </option>
                        ))}
                      </select>
                      {quizzes.length === 0 && (
                        <p className="warning">⚠️ Chưa có quiz nào. Vui lòng tạo quiz trước!</p>
                      )}
                    </div>
                  )}

                  <button onClick={() => handleAddLessonClick(section._id)}>➕</button>
                </li>
              )}
            </ul>
          )}
        </div>
      ))}

      {/* Modal xem video */}
      {isModalOpen && selectedLesson && selectedLesson.type === "video" && (
        <div className="video-modal-overlay" onClick={closeModal}>
          <div className="video-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={closeModal}>✖</button>
            <h2>{selectedLesson.title}</h2>
            <video src={selectedLesson.videoUrl} controls autoPlay className="lesson-video-modal" />
            <p className="video-duration">⏱️ {selectedLesson.duration} phút</p>
          </div>
        </div>
      )}

      {/* Modal xem file */}
      {isModalOpen && selectedLesson && selectedLesson.type === "file" && (
        <div className="video-modal-overlay" onClick={closeModal}>
          <div className="video-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={closeModal}>✖</button>
            <h2>{selectedLesson.title}</h2>
            <div className="file-preview">
              <p>📄 {selectedLesson.fileName}</p>
              <a href={selectedLesson.fileUrl} target="_blank" rel="noopener noreferrer" className="download-btn">
                ⬇️ Tải về / Xem online
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Modal xem quiz */}
      {isModalOpen && selectedLesson && selectedLesson.type === "quiz" && (
        <div className="video-modal-overlay" onClick={closeModal}>
          <div className="video-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={closeModal}>✖</button>
            <h2>{selectedLesson.title}</h2>
            <div className="quiz-preview">
              <p>❓ Quiz: {getQuizTitle(selectedLesson.quizId)}</p>
              <button 
                className="quiz-btn"
                onClick={() => {
                  navigate(`/${course._id}/quiz/${selectedLesson.quizId}/play`);
                }}
              >
                ▶️ Làm bài quiz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal chỉnh sửa bài học */}
      {isEditMode && editingLesson && (
        <div className="video-modal-overlay" onClick={() => setEditingLesson(null)}>
          <div className="video-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>✏️ Chỉnh sửa bài học</h3>
            
            <label>Loại bài học:</label>
            <select
              value={editingLesson.type}
              onChange={(e) => setEditingLesson({ ...editingLesson, type: e.target.value })}
            >
              <option value="video">📹 Video</option>
              <option value="file">📄 Tài liệu</option>
              <option value="quiz">❓ Quiz</option>
            </select>

            <input
              type="text"
              value={editingLesson.title}
              onChange={(e) => setEditingLesson({ ...editingLesson, title: e.target.value })}
              placeholder="Tên bài học"
            />

            {editingLesson.type === "video" && (
              <>
                <input
                  type="number"
                  value={editingLesson.duration}
                  onChange={(e) => setEditingLesson({ ...editingLesson, duration: e.target.value })}
                  placeholder="Thời lượng (phút)"
                />
                <input
                  type="text"
                  value={editingLesson.videoUrl}
                  onChange={(e) => setEditingLesson({ ...editingLesson, videoUrl: e.target.value })}
                  placeholder="Video URL"
                />
              </>
            )}

            {editingLesson.type === "file" && (
              <>
                <input
                  type="text"
                  value={editingLesson.fileUrl}
                  onChange={(e) => setEditingLesson({ ...editingLesson, fileUrl: e.target.value })}
                  placeholder="File URL"
                />
                <input
                  type="text"
                  value={editingLesson.fileName}
                  onChange={(e) => setEditingLesson({ ...editingLesson, fileName: e.target.value })}
                  placeholder="Tên file"
                />
              </>
            )}

            {editingLesson.type === "quiz" && (
              <select
                value={editingLesson.quizId}
                onChange={(e) => setEditingLesson({ ...editingLesson, quizId: e.target.value })}
              >
                <option value="">-- Chọn quiz --</option>
                {quizzes.map((q) => (
                  <option key={q._id} value={q._id}>
                    {q.title}
                  </option>
                ))}
              </select>
            )}

            <div className="edit-actions">
              <button onClick={handleSaveEdit}>💾 Lưu</button>
              <button onClick={() => setEditingLesson(null)}>✖ Hủy</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}