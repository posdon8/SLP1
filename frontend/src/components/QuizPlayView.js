import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./QuizPlayView.css";

/* ================= Sidebar ================= */
function QuestionSidebar({ questions, answers }) {
  if (!questions) return null;

  const scrollToQuestion = (id) => {
    const el = document.getElementById(`q_${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="quiz-sidebar">
      <h4>📘 Câu hỏi</h4>
      <div className="questions-grid">
        {questions.map((q, idx) => (
          <div
            key={q._id}
            className={`sidebar-item ${
              answers[q._id] !== undefined ? "answered" : ""
            }`}
            onClick={() => scrollToQuestion(q._id)}
          >
            {idx + 1}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= Page ================= */
export default function QuizPlayView() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
const [results, setResults] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);

  /* ===== Load quiz ===== */
  useEffect(() => {
    if (!quizId || !token) return;

    fetch(`${process.env.REACT_APP_API_URL}/quiz/${quizId}/play`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setQuiz(data.quiz);
          setTimeLeft(
            data.quiz.timeLimit
              ? data.quiz.timeLimit * 60
              : data.quiz.questions.length * 30
          );
        } else {
          alert("❌ Không tải được quiz");
        }
        setLoading(false);
      })
      .catch(() => {
        alert("❌ Lỗi server");
        setLoading(false);
      });
  }, [quizId, token]);

  /* ===== Timer ===== */
  useEffect(() => {
    if (!quiz || submitted || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quiz, timeLeft, submitted]);

  const formatTime = (t) => {
    const m = Math.floor(t / 60);
    const s = t % 60;
    return `${m}:${s < 10 ? "0" + s : s}`;
  };

  /* ===== Submit ===== */
 const handleSubmit = useCallback(async () => {
  if (!quiz || !token) return;

  const formattedAnswers = {};

  quiz.questions.forEach((q) => {
    if (q.type === "multiple") {
      // nhiều đáp án
      formattedAnswers[q._id] = answers[q._id] || [];
    } 
    else if (q.type === "text") {
      // tự luận
      formattedAnswers[q._id] = answers[q._id] || "";
    } 
    else {
      // single choice (hoặc mặc định)
      formattedAnswers[q._id] =
        answers[q._id] !== undefined ? answers[q._id] : null;
    }
  });

  try {
    const res = await fetch(
      `${process.env.REACT_APP_API_URL}/quiz/submit/${quiz._id}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ answers: formattedAnswers }),
      }
    );

    const data = await res.json();

    if (data.success) {
      setScore(`${data.correct}/${data.total}`);
      setResults(data.results);
      setSubmitted(true);
    
    } else {
      alert("❌ Lỗi chấm điểm");
    }
  } catch (err) {
    console.error("Submit error:", err);
    alert("❌ Không thể nộp bài");
  }
}, [quiz, answers, token]);


  if (loading) return <p>⏳ Đang tải quiz...</p>;
  if (!quiz) return <p>❌ Quiz không tồn tại</p>;

  return (
    <div className="quiz-overlay">
      <div className="quiz-container">
        <div className="quiz-focus">
          <div className="quiz-header-sticky">
            <h2>{quiz.title}</h2>
            <div className="timer">⏱ {formatTime(timeLeft)}</div>
          </div>

          {quiz.questions.map((q, idx) => (
            <div key={q._id} id={`q_${q._id}`} className="question">
              <h4>
                {idx + 1}. {q.questionText}
              </h4>

              {(q.type === "single" || !q.type) &&
                q.options.map((opt, i) => (
                  <label key={i} className="option">
                    <input
                      type="radio"
                      name={q._id}
                      checked={answers[q._id] === i}
                      onChange={() =>
                        setAnswers({ ...answers, [q._id]: i })
                      }
                      disabled={submitted}
                    />
                    {opt}
                  </label>
                ))}

              {q.type === "multiple" &&
                q.options.map((opt, i) => (
                  <label key={i} className="option">
                    <input
                      type="checkbox"
                      checked={(answers[q._id] || []).includes(i)}
                      onChange={() => {
                        const cur = answers[q._id] || [];
                        setAnswers({
                          ...answers,
                          [q._id]: cur.includes(i)
                            ? cur.filter((x) => x !== i)
                            : [...cur, i],
                        });
                      }}
                      disabled={submitted}
                    />
                    {opt}
                  </label>
                ))}
                {q.type === "text" && (
          <textarea
            className="text-answer"
            placeholder="Nhập câu trả lời của bạn..."
            value={answers[q._id] || ""}
            onChange={(e) =>
              setAnswers({ ...answers, [q._id]: e.target.value })
            }
            disabled={submitted}
          />
        )}

            </div>
          ))}

          <button
            className="submit-btn"
            onClick={handleSubmit}
            disabled={submitted}
          >
            Nộp bài
          </button>

          <button
            className="back-btn-float"
            onClick={() => navigate(-1)}
          >
            ⬅ Quay lại
          </button>

          {score && (
            <div className="quiz-result">
              🎯 Điểm của bạn: <strong>{score}</strong>
            </div>
          )}
        </div>
          {submitted && results && (
            <div className="quiz-results-modal">
              <div className="results-content">


                <h3>📊 Kết quả chi tiết</h3>
                <div className="result-summary">
                  <p className="score-display">
                    Bạn đạt: <span className="score-value">{score}</span>
                  </p>
                </div>

                <div className="results-list">
                  {results.map((result, idx) => (
                    <div
                      key={idx}
                      className={`result-item ${result.correct ? "correct" : "incorrect"}`}
                    >
                      <h4>
                        {idx + 1}. {result.question}
                        <span className={`result-badge ${result.correct ? "pass" : "fail"}`}>
                          {result.correct ? "✓ Đúng" : "✗ Sai"}
                        </span>
                      </h4>

                      {/* ===== SINGLE CHOICE ===== */}
                      {result.type === "single" && (
                        <div className="comparison">
                          <div className="answer-section">
                            <p className="label">📝 Câu trả lời của bạn:</p>
                            <p className={`answer ${!result.correct ? "wrong" : ""}`}>
                              {result.yourAnswer}
                            </p>
                          </div>
                          <div className="answer-section correct-section">
                            <p className="label">✅ Câu trả lời đúng:</p>
                            <p className="answer correct">{result.correctAnswer}</p>
                          </div>
                        </div>
                      )}

                      {/* ===== MULTIPLE CHOICE ===== */}
                      {result.type === "multiple" && (
                        <div className="comparison">
                          <div className="answer-section">
                            <p className="label">📝 Câu trả lời của bạn:</p>
                            <ul className="answer-list">
                              {result.yourAnswers.length > 0 ? (
                                result.yourAnswers.map((ans, i) => (
                                  <li key={i} className={!result.correct ? "wrong" : ""}>
                                    {ans}
                                  </li>
                                ))
                              ) : (
                                <li className="wrong">Không chọn</li>
                              )}
                            </ul>
                          </div>
                          <div className="answer-section correct-section">
                            <p className="label">✅ Câu trả lời đúng:</p>
                            <ul className="answer-list">
                              {result.correctAnswers.map((ans, i) => (
                                <li key={i} className="correct">
                                  {ans}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* ===== TEXT ===== */}
                      {result.type === "text" && (
                        <div className="comparison">
                          <div className="answer-section">
                            <p className="label">📝 Câu trả lời của bạn:</p>
                            <p className={`answer ${!result.correct ? "wrong" : ""}`}>
                              "{result.yourAnswer}"
                            </p>
                          </div>
                          <div className="answer-section correct-section">
                            <p className="label">✅ Từ khóa chấp nhận:</p>
                            <div className="keywords-list">
                              {result.correctKeywords.map((kw, i) => (
                                <span key={i} className="keyword">
                                  {kw}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ===== EXPLANATION ===== */}
                      {result.explanation && (
                        <div className="explanation-box">
                          💡 <strong>Giải thích:</strong> {result.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="results-actions">
                  <button
                    className="back-btn"
                    onClick={() => navigate(-1)}
                  >
                    ⬅️ Quay lại
                  </button>
                </div>
              </div>
            </div>
          )}
        <QuestionSidebar
          questions={quiz.questions}
          answers={answers}
        />
      </div>
    </div>
  );
}
