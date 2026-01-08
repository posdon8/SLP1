import React, { useState, useEffect } from "react";
import "./QuizStatsTab.css"; // ✅ FIXED: Changed from QuizStatsTab.css

// 📊 Component thống kê cho STUDENT
function StudentQuizStatsView({ courseId, token }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;

    fetch(`http://localhost:5000/api/quiz/stats/student/${courseId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStats(data.stats);
        } else {
          setError(data.message || "Không thể tải thống kê");
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError("Lỗi kết nối server");
        setLoading(false);
      });
  }, [courseId, token]);

  if (loading) return <p>⏳ Đang tải thống kê...</p>;
  if (error) return <p className="error">❌ {error}</p>;
  if (!stats) return <p>Chưa có dữ liệu</p>;

  const avgScore = stats.quizzes.length > 0
    ? (stats.quizzes.reduce((sum, q) => sum + q.avgScore, 0) / stats.quizzes.length).toFixed(1)
    : 0;

  return (
    <div className="stats-container">
      <h2>Thống kê hoàn thành</h2>

      {/* OVERVIEW STATS */}
      <div className="stats-overview">
        <div className="stat-card">
          <div className="stat-label">Quiz đã làm</div>
          <div className="stat-value">{stats.totalAttempts}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Điểm trung bình</div>
          <div className="stat-value">{avgScore}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Điểm cao nhất</div>
          <div className="stat-value">{stats.highestScore}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Điểm thấp nhất</div>
          <div className="stat-value">{stats.lowestScore}%</div>
        </div>
      </div>

      {/* QUIZ BREAKDOWN */}
      <div className="quiz-breakdown">
        <h3> Chi tiết theo Quiz</h3>
        {stats.quizzes.length === 0 ? (
          <p>Chưa làm quiz nào</p>
        ) : (
          <table className="stats-table">
            <thead>
              <tr>
                <th>Quiz</th>
                <th>Lần làm</th>
                <th>Điểm cao nhất</th>
                <th>Lần cuối</th>
              </tr>
            </thead>
            <tbody>
              {stats.quizzes.map((quiz) => (
                // ✅ FIXED: Use unique key instead of index
                <tr key={quiz.title}>
                  <td>{quiz.title}</td>
                  <td>{quiz.attempts}</td>
                  <td className="score-cell">
                    <span className={`score-badge ${quiz.highestScore >= 80 ? 'excellent' : quiz.highestScore >= 60 ? 'good' : 'need-improve'}`}>
                      {quiz.highestScore}%
                    </span>
                  </td>
                  <td>
                    {/* ✅ FIXED: Add null check for date */}
                    {quiz.lastAttempt 
                      ? new Date(quiz.lastAttempt).toLocaleDateString('vi-VN')
                      : "Chưa cập nhật"
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* PROGRESS CHART */}
      <div className="progress-section">
        <h3> Xu hướng điểm</h3>
        <div className="progress-bars">
          {stats.scoreDistribution && Object.entries(stats.scoreDistribution).map(([range, count]) => (
            <div key={range} className="progress-bar-item">
              <label>{range}</label>
              <div className="bar">
                {/* ✅ Handle division by zero when calculating progress width */}
                <div 
                  className="fill"
                  style={{ width: stats.totalAttempts > 0 ? `${(count / stats.totalAttempts) * 100}%` : '0%' }}
                ></div>
              </div>
              <span>{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 📊 Component thống kê cho TEACHER
function TeacherQuizStatsView({ courseId, token }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedQuiz, setSelectedQuiz] = useState(null);

  useEffect(() => {
    if (!token) return;

    fetch(`http://localhost:5000/api/quiz/stats/teacher/${courseId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStats(data.stats);
          if (data.stats.quizzes.length > 0) {
            setSelectedQuiz(data.stats.quizzes[0]._id);
          }
        } else {
          setError(data.message || "Không thể tải thống kê");
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError("Lỗi kết nối server");
        setLoading(false);
      });
  }, [courseId, token]);

  if (loading) return <p>⏳ Đang tải thống kê...</p>;
  if (error) return <p className="error">❌ {error}</p>;
  if (!stats) return <p>Chưa có dữ liệu</p>;

  const classAvg = stats.classAvgScore || 0;
  // ✅ FIXED: Add null check for selectedQuizData
  const selectedQuizData = selectedQuiz ? stats.quizzes.find(q => q._id === selectedQuiz) : null;

  return (
    <div className="stats-container teacher-stats">
      <h2> Thống kê lớp học</h2>

      {/* CLASS OVERVIEW */}
      <div className="stats-overview">
        <div className="stat-card">
          <div className="stat-label">Tổng sinh viên</div>
          <div className="stat-value">{stats.totalStudents}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Điểm trung bình lớp</div>
          <div className="stat-value">{classAvg.toFixed(1)}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Quiz tạo</div>
          <div className="stat-value">{stats.totalQuizzes}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Tổng lần làm</div>
          <div className="stat-value">{stats.totalAttempts}</div>
        </div>
      </div>

      {/* QUIZ SELECTOR */}
      {stats.quizzes.length > 0 && (
        <div className="quiz-selector">
          <h3>Chọn Quiz để xem chi tiết</h3>
          <select 
            value={selectedQuiz || ""} 
            onChange={(e) => setSelectedQuiz(e.target.value)}
            className="select-quiz"
          >
            {stats.quizzes.map(quiz => (
              <option key={quiz._id} value={quiz._id}>
                {quiz.title} ({quiz.attempts} lần làm)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* SELECTED QUIZ STATS */}
      {selectedQuizData && (
        <div className="quiz-detail-stats">
          <h3>📋 {selectedQuizData.title}</h3>
          
          <div className="quiz-stat-cards">
            <div className="stat-card">
              <div className="stat-label">Lần làm</div>
              <div className="stat-value">{selectedQuizData.attempts}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Điểm trung bình</div>
              <div className="stat-value">{selectedQuizData.avgScore.toFixed(1)}%</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Cao nhất</div>
              <div className="stat-value">{selectedQuizData.highestScore}%</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Thấp nhất</div>
              <div className="stat-value">{selectedQuizData.lowestScore}%</div>
            </div>
          </div>

          {/* STUDENT PERFORMANCE TABLE */}
          <div className="student-performance">
            <h4>📌 Kết quả sinh viên</h4>
            {/* ✅ FIXED: Add proper null check */}
            {selectedQuizData.studentScores && selectedQuizData.studentScores.length > 0 ? (
              <table className="performance-table">
                <thead>
                  <tr>
                    <th>Sinh viên</th>
                    <th>Lần làm</th>
                    <th>Điểm cao nhất</th>
                    <th>Lần cuối</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedQuizData.studentScores.map((student) => (
                    // ✅ FIXED: Use studentId instead of index
                    <tr key={student.studentId}>
                      <td>{student.name}</td>
                      <td>{student.attempts}</td>
                      <td className="score-cell">
                        <span className={`score-badge ${student.highestScore >= 80 ? 'excellent' : student.highestScore >= 60 ? 'good' : 'need-improve'}`}>
                          {student.highestScore}%
                        </span>
                      </td>
                      <td>
                        {/* ✅ FIXED: Add null check for date */}
                        {student.lastAttempt
                          ? new Date(student.lastAttempt).toLocaleDateString('vi-VN')
                          : "Chưa cập nhật"
                        }
                      </td>
                      <td>
                        {student.highestScore >= 80 && <span className="badge success">✅ Xuất sắc</span>}
                        {student.highestScore >= 60 && student.highestScore < 80 && <span className="badge good">👍 Tốt</span>}
                        {student.highestScore < 60 && <span className="badge warning">⚠️ Cần cải thiện</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>Chưa có học sinh làm quiz này</p>
            )}
          </div>
        </div>
      )}

      {/* ALL QUIZZES SUMMARY */}
      <div className="all-quizzes-summary">
        <h3>📈 Tóm tắt tất cả Quiz</h3>
        {stats.quizzes.length === 0 ? (
          <p>Chưa tạo quiz nào</p>
        ) : (
          <table className="summary-table">
            <thead>
              <tr>
                <th>Quiz</th>
                <th>Lần làm</th>
                <th>Điểm TB</th>
                <th>Cao nhất</th>
                <th>Thấp nhất</th>
                <th>Tỉ lệ đạt ≥60%</th>
              </tr>
            </thead>
            <tbody>
              {stats.quizzes.map((quiz) => {
                const passRate = quiz.attempts > 0 
                  ? ((quiz.passCount / quiz.attempts) * 100).toFixed(1)
                  : 0;
                
                return (
                  // ✅ FIXED: Use _id instead of index
                  <tr key={quiz._id}>
                    <td>{quiz.title}</td>
                    <td>{quiz.attempts}</td>
                    <td>{quiz.avgScore.toFixed(1)}%</td>
                    <td>{quiz.highestScore}%</td>
                    <td>{quiz.lowestScore}%</td>
                    <td>
                      <span className={`pass-rate ${passRate >= 70 ? 'high' : passRate >= 50 ? 'medium' : 'low'}`}>
                        {passRate}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
function StudentCodeStatsView({ courseId, token }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;

    fetch(`http://localhost:5000/api/submissions/stats/student/${courseId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStats(data.stats);
        } else {
          setError(data.message || "Không thể tải thống kê");
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError("Lỗi kết nối server");
        setLoading(false);
      });
  }, [courseId, token]);

  if (loading) return <p>⏳ Đang tải thống kê...</p>;
  if (error) return <p className="error">❌ {error}</p>;
  if (!stats) return <p>Chưa có dữ liệu</p>;

  return (
    <div className="stats-container">
      <h2>Thống kê Code Exercises</h2>

      {/* OVERVIEW STATS */}
      <div className="stats-overview">
        <div className="stat-card">
          <div className="stat-label">Bài tập đã làm</div>
          <div className="stat-value">{stats.totalSubmissions || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Bài AC</div>
          <div className="stat-value">{stats.acceptedSubmissions || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Tỉ lệ AC</div>
          <div className="stat-value">{stats.acceptanceRate || 0}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Bài giải được</div>
          <div className="stat-value">{stats.solvedExercises || 0}</div>
        </div>
      </div>

      {/* EXERCISE BREAKDOWN */}
      <div className="quiz-breakdown">
        <h3> Chi tiết theo Bài tập</h3>
        {stats.exercises && stats.exercises.length === 0 ? (
          <p>Chưa làm bài tập nào</p>
        ) : (
          <table className="stats-table">
            <thead>
              <tr>
                <th>Bài tập</th>
                <th>Lần nộp</th>
                <th>Trạng thái</th>
                <th>Điểm</th>
                <th>Lần cuối</th>
              </tr>
            </thead>
            <tbody>
              {stats.exercises?.map((exercise) => (
                <tr key={exercise.exerciseId}>
                  <td>{exercise.title}</td>
                  <td>{exercise.submissionCount}</td>
                  <td>
                    {exercise.bestStatus === "Accepted" ? (
                      <span className="badge success">✅ Accepted</span>
                    ) : exercise.bestStatus === "Partial" ? (
                      <span className="badge good">👍 Partial</span>
                    ) : (
                      <span className="badge warning">⚠️ {exercise.bestStatus || "Not Submitted"}</span>
                    )}
                  </td>
                  <td className="score-cell">
                    <span className={`score-badge ${exercise.bestScore >= 80 ? 'excellent' : exercise.bestScore >= 60 ? 'good' : 'need-improve'}`}>
                      {exercise.bestScore || 0}%
                    </span>
                  </td>
                  <td>
                    {exercise.lastSubmission
                      ? new Date(exercise.lastSubmission).toLocaleDateString('vi-VN')
                      : "Chưa cập nhật"
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* RECENT SUBMISSIONS */}
      <div className="progress-section">
        <h3>📌 Lần nộp gần đây</h3>
        {stats.recentSubmissions && stats.recentSubmissions.length > 0 ? (
          <div style={{ maxHeight: "300px", overflowY: "auto" }}>
            {stats.recentSubmissions.map((sub, idx) => (
              <div key={idx} style={{
                padding: "10px",
                border: "1px solid #eee",
                borderRadius: "4px",
                marginBottom: "8px",
                fontSize: "13px"
              }}>
                <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
                  {sub.exerciseTitle}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#666" }}>
                  <span>
                    {sub.status === "Accepted" ? "✅ AC" : sub.status === "Partial" ? "👍 Partial" : "⚠️ " + sub.status}
                  </span>
                  <span>{sub.score}/{sub.maxScore}</span>
                  <span>{new Date(sub.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>Chưa có nộp bài nào</p>
        )}
      </div>
    </div>
  );
}

// ==================== CODE STATS - TEACHER ====================
function TeacherCodeStatsView({ courseId, token }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedExercise, setSelectedExercise] = useState(null);

  useEffect(() => {
    if (!token) return;

    fetch(`http://localhost:5000/api/submissions/stats/teacher/${courseId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStats(data.stats);
          if (data.stats.exercises?.length > 0) {
            setSelectedExercise(data.stats.exercises[0]._id);
          }
        } else {
          setError(data.message || "Không thể tải thống kê");
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError("Lỗi kết nối server");
        setLoading(false);
      });
  }, [courseId, token]);

  if (loading) return <p>⏳ Đang tải thống kê...</p>;
  if (error) return <p className="error">❌ {error}</p>;
  if (!stats) return <p>Chưa có dữ liệu</p>;

  const selectedExerciseData = selectedExercise 
    ? stats.exercises?.find(e => e._id === selectedExercise) 
    : null;

  return (
    <div className="stats-container teacher-stats">
      <h2> Thống kê Code Exercises - Lớp học</h2>

      {/* CLASS OVERVIEW */}
      <div className="stats-overview">
        <div className="stat-card">
          <div className="stat-label">Tổng sinh viên</div>
          <div className="stat-value">{stats.totalStudents || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Tổng nộp</div>
          <div className="stat-value">{stats.totalSubmissions || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">AC</div>
          <div className="stat-value">{stats.acceptedCount || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Tỉ lệ AC</div>
          <div className="stat-value">{stats.acceptanceRate || 0}%</div>
        </div>
      </div>

      {/* EXERCISE SELECTOR */}
      {stats.exercises && stats.exercises.length > 0 && (
        <div className="quiz-selector">
          <h3>Chọn Bài tập để xem chi tiết</h3>
          <select 
            value={selectedExercise || ""} 
            onChange={(e) => setSelectedExercise(e.target.value)}
            className="select-quiz"
          >
            {stats.exercises.map(ex => (
              <option key={ex._id} value={ex._id}>
                {ex.title} ({ex.submissionCount} lần nộp)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* SELECTED EXERCISE STATS */}
      {selectedExerciseData && (
        <div className="quiz-detail-stats">
          <h3>📋 {selectedExerciseData.title}</h3>
          
          <div className="quiz-stat-cards">
            <div className="stat-card">
              <div className="stat-label">Tổng nộp</div>
              <div className="stat-value">{selectedExerciseData.submissionCount || 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">AC</div>
              <div className="stat-value">{selectedExerciseData.acceptedCount || 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Tỉ lệ AC</div>
              <div className="stat-value">{selectedExerciseData.acceptanceRate || 0}%</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Điểm TB</div>
              <div className="stat-value">{(selectedExerciseData.avgScore || 0).toFixed(1)}%</div>
            </div>
          </div>

          {/* STUDENT PERFORMANCE TABLE */}
          <div className="student-performance">
            <h4>📌 Kết quả sinh viên</h4>
            {selectedExerciseData.studentStats && selectedExerciseData.studentStats.length > 0 ? (
              <table className="performance-table">
                <thead>
                  <tr>
                    <th>Sinh viên</th>
                    <th>Lần nộp</th>
                    <th>Điểm cao nhất</th>
                    <th>Trạng thái</th>
                    <th>Lần cuối</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedExerciseData.studentStats.map((student) => (
                    <tr key={student.studentId}>
                      <td>{student.studentName}</td>
                      <td>{student.submissionCount}</td>
                      <td className="score-cell">
                        <span className={`score-badge ${student.bestScore >= 80 ? 'excellent' : student.bestScore >= 60 ? 'good' : 'need-improve'}`}>
                          {student.bestScore}%
                        </span>
                      </td>
                      <td>
                        {student.bestStatus === "Accepted" ? (
                          <span className="badge success">✅ AC</span>
                        ) : student.bestStatus === "Partial" ? (
                          <span className="badge good">👍 Partial</span>
                        ) : (
                          <span className="badge warning">⚠️ {student.bestStatus || "Not Submitted"}</span>
                        )}
                      </td>
                      <td>
                        {student.lastSubmission
                          ? new Date(student.lastSubmission).toLocaleDateString('vi-VN')
                          : "Chưa cập nhật"
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>Chưa có học sinh nộp bài tập này</p>
            )}
          </div>
        </div>
      )}

      {/* ALL EXERCISES SUMMARY */}
      <div className="all-quizzes-summary">
        <h3>📈 Tóm tắt tất cả Code Exercises</h3>
        {stats.exercises && stats.exercises.length === 0 ? (
          <p>Chưa tạo bài tập nào</p>
        ) : (
          <table className="summary-table">
            <thead>
              <tr>
                <th>Bài tập</th>
                <th>Khó độ</th>
                <th>Tổng nộp</th>
                <th>AC</th>
                <th>Tỉ lệ AC</th>
                <th>Điểm TB</th>
              </tr>
            </thead>
            <tbody>
              {stats.exercises?.map((ex) => (
                <tr key={ex._id}>
                  <td>{ex.title}</td>
                  <td>
                    {ex.difficulty === "easy" && "🟢 Dễ"}
                    {ex.difficulty === "medium" && "🟡 Trung bình"}
                    {ex.difficulty === "hard" && "🔴 Khó"}
                  </td>
                  <td>{ex.submissionCount}</td>
                  <td>{ex.acceptedCount}</td>
                  <td>
                    <span className={`pass-rate ${ex.acceptanceRate >= 70 ? 'high' : ex.acceptanceRate >= 50 ? 'medium' : 'low'}`}>
                      {ex.acceptanceRate || 0}%
                    </span>
                  </td>
                  <td>{(ex.avgScore || 0).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// 📊 Main Stats Component
export default function QuizStatsTab({ course, courseId, token }) {
  const user = JSON.parse(localStorage.getItem("user"));
  const isTeacher = user?.roles?.includes("teacher");
  const [activeTab, setActiveTab] = useState("quiz");
  return (
    <div className="quiz-stats-wrapper">
      {/* TAB SELECTOR */}
      <div style={{
        display: "flex",
        gap: "12px",
        marginBottom: "20px",
        borderBottom: "2px solid #eee",
        paddingBottom: "12px"
      }}>
        <button
          onClick={() => setActiveTab("quiz")}
          style={{
            padding: "10px 20px",
            backgroundColor: activeTab === "quiz" ? "#2196F3" : "transparent",
            color: activeTab === "quiz" ? "white" : "#666",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: activeTab === "quiz" ? "bold" : "normal",
            fontSize: "14px"
          }}
        >
           Quiz
        </button>
        <button
          onClick={() => setActiveTab("code")}
          style={{
            padding: "10px 20px",
            backgroundColor: activeTab === "code" ? "#4CAF50" : "transparent",
            color: activeTab === "code" ? "white" : "#666",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: activeTab === "code" ? "bold" : "normal",
            fontSize: "14px"
          }}
        >
          Code
        </button>
      </div>

      {/* CONTENT */}
      {activeTab === "quiz" ? (
        isTeacher ? (
          <TeacherQuizStatsView courseId={courseId} token={token} />
        ) : (
          <StudentQuizStatsView courseId={courseId} token={token} />
        )
      ) : (
        isTeacher ? (
          <TeacherCodeStatsView courseId={courseId} token={token} />
        ) : (
          <StudentCodeStatsView courseId={courseId} token={token} />
        )
      )}
    </div>
  );
}