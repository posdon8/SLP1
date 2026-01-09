import React, { useState, useEffect, useCallback } from "react";
import "./ExerciseTab.css";
import QuizTab from "./QuizTab";
import CodeTab from "./CodeTab"; // ✅ Import CodeTab
import CodeExerciseForm from "./CodeExerciseForm"; // ✅ Import CodeExerciseForm
import QuestionBank from "./QuestionBank";
import QuizStatsTab from "../QuizStatsTab";
import ScheduleForm from "../ScheduleForm";
import { useNavigate } from "react-router-dom";

// ✅ Component hiển thị sidebar câu hỏi
function QuestionSidebar({ selectedQuiz, answers }) {
  if (!selectedQuiz || !selectedQuiz.questions) return null;
  
  const scrollToQuestion = (id) => {
    const el = document.getElementById(`q_${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="quiz-sidebar">
      <h4>📘 Câu hỏi</h4>
      <div className="questions-grid">
        {selectedQuiz.questions.map((q, index) => (
          <div
            key={q._id}
            className={`sidebar-item ${answers[q._id] !== undefined ? "answered" : ""}`}
            onClick={() => scrollToQuestion(q._id)}
            title={`Câu ${index + 1}`}
          >
            {index + 1}
          </div>
        ))}
      </div>
    </div>
  );
}

// ✅ Component chơi quiz với kiểm tra schedule
function QuizPlayView({
  selectedQuiz,
  timeLeft,
  handleSubmit,
  setSelectedQuiz,
  setAnswers,
  setScore,
  setSubmitted,
  answers,
  submitted,
  score,
  token
}) {
  const [quizStatus, setQuizStatus] = useState("OPEN");
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    document.body.classList.add("quiz-open");
    return () => {
      document.body.classList.remove("quiz-open");
    };
  }, []);

  // ✅ Check xem quiz có đang mở không
  useEffect(() => {
    if (!selectedQuiz || !token) return;

    const checkQuizStatus = async () => {
      try {
        setStatusLoading(true);
        const res = await fetch(
          `${process.env.REACT_APP_API_URL}/schedules/check/quiz/${selectedQuiz._id}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        const data = await res.json();
        console.log("📌 Quiz status:", data);

        if (data.success) {
          setQuizStatus("OPEN");
          setStatusMessage("");
        } else {
          setQuizStatus(data.status || "CLOSED");
          setStatusMessage(data.message || "Quiz không khả dụng");
        }
      } catch (err) {
        console.error("❌ Error checking quiz status:", err);
        setQuizStatus("OPEN");
        setStatusMessage("");
      } finally {
        setStatusLoading(false);
      }
    };

    checkQuizStatus();
  }, [selectedQuiz, token]);

  const formatTime = (t) => {
    const m = Math.floor(t / 60);
    const s = t % 60;
    return `${m}:${s < 10 ? "0" + s : s}`;
  };

  const handleBackClick = () => {
    setSelectedQuiz(null);
    setScore(null);
    setSubmitted(false);
    setAnswers({});
  };

  // ✅ Kiểm tra trước khi submit
  const handleSubmitWithCheck = async () => {
    if (quizStatus !== "OPEN") {
      const messages = {
        NOT_OPEN: "⏳ Quiz chưa mở - vui lòng quay lại sau",
        CLOSED: "❌ Quiz đã đóng - không thể nộp bài",
        ERROR: "⚠️ Không thể kiểm tra trạng thái quiz"
      };
      alert(messages[quizStatus] || "Quiz không khả dụng");
      return;
    }

    await handleSubmit();
  };

  // ✅ Status badge
  const getStatusBadge = () => {
    const badges = {
      OPEN: { color: "#4caf50", text: "✅ Đang mở", icon: "🟢" },
      NOT_OPEN: { color: "#ff9800", text: "⏳ Chưa mở", icon: "🟡" },
      CLOSED: { color: "#f44336", text: "❌ Đã đóng", icon: "🔴" },
      ERROR: { color: "#9c27b0", text: "⚠️ Lỗi", icon: "🟣" }
    };

    const badge = badges[quizStatus] || badges.ERROR;

    return (
      <div
        style={{
          display: "inline-block",
          backgroundColor: badge.color,
          color: "white",
          padding: "6px 12px",
          borderRadius: "4px",
          fontSize: "12px",
          fontWeight: "bold"
        }}
      >
        {badge.icon} {badge.text}
      </div>
    );
  };

  if (statusLoading) {
    return (
      <div className="quiz-overlay">
        <div className="quiz-container">
          <div className="quiz-focus">
            <div style={{ padding: "40px", textAlign: "center" }}>
              <p>⏳ Đang kiểm tra trạng thái quiz...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-overlay">
      <div className="quiz-container">
        {/* Quiz content bên trái */}
        <div className="quiz-focus">
          <div className="quiz-header-sticky">
            <h2>{selectedQuiz.title}</h2>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <div className={`timer ${timeLeft < 10 ? "urgent" : ""}`}>
                ⏱ {formatTime(timeLeft)}
              </div>
              {getStatusBadge()}
            </div>
          </div>

          {/* ⚠️ Warning nếu quiz không mở */}
          {quizStatus !== "OPEN" && (
            <div
              style={{
                backgroundColor:
                  quizStatus === "NOT_OPEN" ? "#fff3e0" : "#ffebee",
                color: quizStatus === "NOT_OPEN" ? "#e65100" : "#d32f2f",
                padding: "12px 16px",
                borderRadius: "4px",
                marginBottom: "20px",
                borderLeft: `4px solid ${
                  quizStatus === "NOT_OPEN" ? "#ff9800" : "#f44336"
                }`
              }}
            >
              <strong>
                {quizStatus === "NOT_OPEN"
                  ? "⏳ Quiz chưa mở"
                  : "❌ Quiz đã đóng"}
              </strong>
              <p style={{ margin: "8px 0 0 0", fontSize: "14px" }}>
                {statusMessage}
              </p>
            </div>
          )}

          {selectedQuiz.questions && selectedQuiz.questions.length > 0 ? (
            selectedQuiz.questions.map((q, idx) => (
              <div key={q._id} id={`q_${q._id}`} className="question">
                <h4>
                  {idx + 1}. {q.questionText}
                </h4>

                {/* ✅ SINGLE CHOICE (Radio buttons) */}
                {(q.type === "single" || !q.type) && (
                  <div className="answer-options">
                    {q.options?.map((opt, i) => (
                      <label key={i} className="option">
                        <input
                          type="radio"
                          name={q._id}
                          value={i}
                          checked={answers[q._id] === i}
                          onChange={() => setAnswers({ ...answers, [q._id]: i })}
                          disabled={submitted || quizStatus !== "OPEN"}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                )}

                {/* ✅ MULTIPLE CHOICE (Checkboxes) */}
                {q.type === "multiple" && (
                  <div className="answer-options">
                    {q.options?.map((opt, i) => (
                      <label key={i} className="option">
                        <input
                          type="checkbox"
                          checked={(answers[q._id] || []).includes(i)}
                          onChange={() => {
                            const current = answers[q._id] || [];
                            if (current.includes(i)) {
                              setAnswers({
                                ...answers,
                                [q._id]: current.filter(idx => idx !== i)
                              });
                            } else {
                              setAnswers({
                                ...answers,
                                [q._id]: [...current, i]
                              });
                            }
                          }}
                          disabled={submitted || quizStatus !== "OPEN"}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                )}

                {/* ✅ TEXT/KEYWORD (Text input) */}
                {q.type === "text" && (
                  <div className="answer-text">
                    <input
                      type="text"
                      placeholder="Nhập từ khóa..."
                      value={answers[q._id] || ""}
                      onChange={(e) => setAnswers({ ...answers, [q._id]: e.target.value })}
                      disabled={submitted || quizStatus !== "OPEN"}
                      className="input-text-answer"
                    />
                  </div>
                )}

                {/* ✅ Show results after submission */}
                {submitted && (
                  <div className="explanation">
                    <p>
                      ✅ <strong>Đáp án đúng:</strong>
                      {q.type === "single" && q.options ? ` ${q.options[q.correctAnswer]}` : ""}
                      {q.type === "multiple" && q.multipleCorrectAnswers && q.options ? (
                        <>
                          {" "}
                          {q.multipleCorrectAnswers.map(idx => q.options[idx]).join(", ")}
                        </>
                      ) : ""}
                      {q.type === "text" && q.keywords ? ` ${q.keywords.join(" / ")}` : ""}
                    </p>
                    {q.explanation && (
                      <p className="explain-text">
                        💡 <strong>Giải thích:</strong> {q.explanation}
                      </p>
                    )}
                    
                    {/* Show if wrong */}
                    {q.type === "single" && q.correctAnswer !== undefined && answers[q._id] !== q.correctAnswer && (
                      <p className="wrong-text">❌ Bạn đã chọn sai.</p>
                    )}
                    {q.type === "multiple" && q.multipleCorrectAnswers && (() => {
                      const userAnswers = (answers[q._id] || []).sort((a,b) => a - b);
                      const correctAnswers = (q.multipleCorrectAnswers || []).sort((a,b) => a - b);
                      const isCorrect = JSON.stringify(userAnswers) === JSON.stringify(correctAnswers);
                      return (
                        <p className="wrong-text">
                          {isCorrect ? "✅ Bạn đã chọn đúng!" : "❌ Bạn đã chọn sai."}
                        </p>
                      );
                    })()}
                    {q.type === "text" && q.keywords && (() => {
                      const userInput = (answers[q._id] || "").trim();
                      const keywords = q.keywords.map(kw => kw.trim());
                      let isCorrect = false;
                      if (q.caseSensitive) {
                        isCorrect = keywords.includes(userInput);
                      } else {
                        isCorrect = keywords.some(kw => kw.toLowerCase() === userInput.toLowerCase());
                      }
                      return (
                        <p className="wrong-text">
                          {isCorrect ? "✅ Bạn đã trả lời đúng!" : "❌ Bạn đã trả lời sai."}
                        </p>
                      );
                    })()}
                  </div>
                )}
              </div>
            ))
          ) : (
            <p>⚠️ Không có câu hỏi nào</p>
          )}

          {/* ✅ Submit button - disabled nếu quiz không mở */}
          <button
            className="submit-btn"
            onClick={handleSubmitWithCheck}
            disabled={submitted || quizStatus !== "OPEN"}
            style={{
              opacity: submitted || quizStatus !== "OPEN" ? 0.5 : 1,
              cursor: submitted || quizStatus !== "OPEN" ? "not-allowed" : "pointer"
            }}
            title={quizStatus !== "OPEN" ? "Quiz không khả dụng" : "Nộp bài"}
          >
            {quizStatus !== "OPEN" ? `❌ Không thể nộp (${quizStatus})` : "Nộp bài"}
          </button>

          <button className="back-btn-float" onClick={handleBackClick}>
            ⬅ Quay lại
          </button>
          {score && (
            <div className="quiz-result">
              🎯 Điểm của bạn: <strong>{score}</strong>
            </div>
          )}
        </div>

        {/* Sidebar bên phải */}
        <QuestionSidebar selectedQuiz={selectedQuiz} answers={answers} />
      </div>
    </div>
  );
}

// ✅ Component danh sách quiz
function QuizListView({ quizzes, isTeacher, course, handleSelectQuiz, setCreating, setEditingQuiz, handleDeleteQuiz, selectedScheduleQuiz, setSelectedScheduleQuiz, isEditMode}) {
  const navigate = useNavigate();
  return (
    <div className="exercise-tab">
      <h2>Danh sách Quiz</h2>
      {isTeacher && isEditMode && course?.editable && (
        <button className="create-btn" onClick={() => setCreating(true)}>
          ➕ Tạo quiz
        </button>
      )}
      {!Array.isArray(quizzes) || quizzes.length === 0 ? (
        <p>Chưa có quiz nào cho khóa học này.</p>
      ) : (
        <ul className="quiz-list">
          {quizzes.map((quiz) => (
            <li key={quiz._id} className="quiz-item" onClick={() => handleSelectQuiz(quiz)}>
              <div className="quiz-header">
                <div className="quiz-title">
                  <h4>{quiz.title}</h4>
                  <p>{quiz.questions?.length || 0} câu hỏi</p>

                    {/* Hiển thị số lần làm */}
                    {quiz.maxAttempts > 0 ? (
                      <p>Số lần còn lại: {quiz.attemptsLeft}</p>
                    ) : (
                      <p>Số lần làm: ~</p>
                    )}
                  { course.editable && (
                <button
                  className="answer-tag"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/quiz/${quiz._id}/answers`);
                  }}
                >
                  📘 Đáp án
                </button>
              )}

                </div>
                <div className="quiz-actions">
                  {isEditMode && isTeacher && course?.editable && (
                    <>
                      <button
                        className="edit-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCreating(true);
                          setEditingQuiz(quiz);
                        }}
                        title="Sửa quiz"
                      >
                        ✏️
                      </button>

                      <button
                        className="schedule-btn"
                        onClick={(e) => { 
                          e.stopPropagation();
                          setSelectedScheduleQuiz(quiz);
                        }}
                        title="Đặt lịch"
                      >
                        ⏰
                      </button>
                      <button
                        className="delete-btn"
                        onClick={(e) => { 
                          e.stopPropagation();
                          handleDeleteQuiz(quiz._id);
                        }}
                        title="Xóa quiz"
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Modal Đặt lịch Quiz */}
      {selectedScheduleQuiz && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: "white",
            borderRadius: "8px",
            padding: "24px",
            maxWidth: "500px",
            width: "90%",
            maxHeight: "80vh",
            overflowY: "auto"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2>⏰ Đặt lịch: {selectedScheduleQuiz.title}</h2>
              <button
                onClick={() => setSelectedScheduleQuiz(null)}
                style={{
                  backgroundColor: "#f5f5f5",
                  border: "none",
                  borderRadius: "4px",
                  padding: "4px 8px",
                  cursor: "pointer",
                  fontSize: "16px"
                }}
              >
                ✕
              </button>
            </div>

            <ScheduleForm
              ownerType="quiz"
              ownerId={selectedScheduleQuiz._id}
              onSaveSuccess={() => setSelectedScheduleQuiz(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ✅ Component chính
export default function ExerciseTab({ course, courseId, isEditMode }) {
  const [activeTab, setActiveTab] = useState("quiz"); 
  const [quizzes, setQuizzes] = useState([]);
  const [selectedScheduleQuiz, setSelectedScheduleQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user")); 
  const isTeacher = user?.roles?.includes("teacher");

  const token = localStorage.getItem("token");

  // ✅ Lấy quiz list
  useEffect(() => {
    if (!token) {
      setErrorMsg("❌ Vui lòng đăng nhập để xem quiz");
      setLoading(false);
      return;
    }

    fetch(`${process.env.REACT_APP_API_URL}/quiz/${courseId}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.quizzes)) {
          setQuizzes(data.quizzes || []);
          setErrorMsg("");
        } else {
          setQuizzes([]);
          setErrorMsg(data.message || "Không thể tải quiz");
        }
        setLoading(false);
      })
      .catch(() => {
        setErrorMsg("Lỗi khi tải quiz");
        setLoading(false);
      });
  }, [courseId, token]);

  // ✅ Xử lý chọn quiz
  const handleSelectQuiz = (quiz) => {
    navigate(`/${courseId}/quiz/${quiz._id}/play`);
  };

  // ✅ Xử lý xóa quiz
  const handleDeleteQuiz = async (quizId) => {
    if (!window.confirm("Bạn có chắc muốn xóa quiz này?")) return;

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/quiz/${quizId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setQuizzes((prev) => (Array.isArray(prev) ? prev.filter((q) => q._id !== quizId) : []));
      } else {
        alert("❌ " + (data.message || "Không thể xóa quiz"));
      }
    } catch (err) {
      console.error(err);
      alert("❌ Lỗi kết nối server");
    }
  };

  if (loading) return <p>⏳ Đang tải quiz...</p>;
  if (errorMsg) return <p>{errorMsg}</p>;
  if (!quizzes || !Array.isArray(quizzes)) return <p>⚠️ Dữ liệu quiz không hợp lệ</p>;

  return (
    <div className="exercise-wrapper">
      <div className="exercise-tabs">
        <button
          className={activeTab === "quiz" ? "active" : ""}
          onClick={() => setActiveTab("quiz")}
        >
           Quiz
        </button>
        {/* ✅ Code Tab Button */}
        <button
          className={activeTab === "code" ? "active" : ""}
          onClick={() => setActiveTab("code")}
        >
          Code
        </button>
        {isTeacher && course?.editable && (
          <button
            className={activeTab === "bank" ? "active" : ""}
            onClick={() => setActiveTab("bank")}
          >
             Bank
          </button>
        )}
        <button
          className={activeTab === "stats" ? "active" : ""}
          onClick={() => setActiveTab("stats")}
        >
          Tiến trình học tập
        </button>
      </div>

      {/* Quiz Tab */}
      {activeTab === "quiz" && (
        <>
          {isEditMode && creating ? (
            <QuizTab
              courseId={courseId}
              course={course}
              token={token}
              editingQuiz={editingQuiz}
              onCancelEdit={() => {
                setEditingQuiz(null);
                setCreating(false);
              }}
              onSaveQuiz={(updatedQuiz) => {
                setQuizzes(prev =>
                  prev.map(q => q._id === updatedQuiz._id ? updatedQuiz : q)
                );
                setEditingQuiz(null);
                setCreating(false);
              }}
            />
          ) : (
            <QuizListView
              quizzes={quizzes}
              isTeacher={isTeacher}
              course={course}
              handleSelectQuiz={handleSelectQuiz}
              setCreating={setCreating}
              setEditingQuiz={setEditingQuiz}
              handleDeleteQuiz={handleDeleteQuiz}
              isEditMode={isEditMode}
              selectedScheduleQuiz={selectedScheduleQuiz}
              setSelectedScheduleQuiz={setSelectedScheduleQuiz}
            />
          )}
        </>
      )}

      {/* ✅ Code Tab */}
      {activeTab === "code" && (
        <CodeTab
          courseId={courseId}
          course={course}
          isTeacher={isTeacher}
          token={token}
          isEditMode={isEditMode}
        />
      )}

      {/* Bank Tab */}
      {activeTab === "bank" && <QuestionBank courseId={courseId} course={course}/>}
      
      {/* Stats Tab */}
      {activeTab === "stats" && (
        <QuizStatsTab 
          course={course} 
          courseId={courseId} 
          token={token}
        />
      )}
    </div>
  );
}