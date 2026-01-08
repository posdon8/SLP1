import React, { useState, useEffect } from "react";
import "./QuestionBank.css";

function ChapterQuestions({ questions, openQuestionId, setOpenQuestionId, onEdit }) {

  const renderQuestionContent = (q) => {
    switch (q.type) {
      case "single":
        return (
          <div className="options-display">
            <p className="options-label"><strong>📝 Các đáp án:</strong></p>
            <ul>
              {q.options?.map((opt, oi) => (
                <li
                  key={oi}
                  className={oi === q.correctAnswer ? "correct-opt" : "normal-opt"}
                >
                  <span className="option-letter">{String.fromCharCode(65 + oi)}</span>
                  <span className="option-text">{opt}</span>
                  {oi === q.correctAnswer && <span className="correct-badge">✓ Đúng</span>}
                </li>
              ))}
            </ul>
          </div>
        );
      case "multiple":
        return (
          <div className="options-display">
            <p className="options-label"><strong>📝 Các đáp án (chọn 1 hoặc nhiều):</strong></p>
            <ul>
              {q.options?.map((opt, oi) => (
                <li
                  key={oi}
                  className={q.multipleCorrectAnswers?.includes(oi) ? "correct-opt" : "normal-opt"}
                >
                  <span className="option-letter">{String.fromCharCode(65 + oi)}</span>
                  <span className="option-text">{opt}</span>
                  {q.multipleCorrectAnswers?.includes(oi) && <span className="correct-badge">✓ Đúng</span>}
                </li>
              ))}
            </ul>
          </div>
        );
      case "text":
        return (
          <div className="keywords-display">
            <p className="options-label"><strong>🔑 Từ khóa chấp nhận:</strong></p>
            <ul>
              {q.keywords?.map((kw, idx) => (
                <li key={idx} className="keyword-item">
                  <span className="keyword-badge">{kw}</span>
                </li>
              ))}
            </ul>
            {q.caseSensitive && <p className="sensitive">⚠️ Phân biệt chữ hoa/thường</p>}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="chapter-questions">
      <div className="question-scroll">
        <ul>
          {questions.map((q) => (
            <li key={q._id} className="question-item">
              <div className="question-actions">
  <button
    className="btn-edit"
    onClick={(e) => {
      e.stopPropagation();
      onEdit(q);
    }}
  >
    ✏️ Sửa
  </button>
</div>

              <strong
                onClick={() =>
                  setOpenQuestionId(openQuestionId === q._id ? null : q._id)
                }
                style={{ cursor: "pointer" }}
                className="question-title"
              >
                <span className="expand-icon">{openQuestionId === q._id ? '▼' : '▶'}</span>
                <span className="question-text">[{q.chapter || "Chưa phân loại"}] {q.questionText}</span>
                <span className="question-type-badge">{q.type === "single" ? "1 Đáp án" : q.type === "multiple" ? "Nhiều Đáp án" : "Tự luận"}</span>
              </strong>

              {openQuestionId === q._id && (
                <div className="question-details">
                  {renderQuestionContent(q)}
                  {q.explanation && <div className="explain">💡 <strong>Giải thích:</strong> {q.explanation}</div>}
                  <p className="difficulty">
                    🎯 <strong>Mức độ:</strong> <span className={`difficulty-${q.difficulty}`}>{q.difficulty === 'easy' ? 'Dễ' : q.difficulty === 'medium' ? 'Trung bình' : 'Khó'}</span>
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function QuestionBankTab({ courseId, course }) {
  const [localQs, setLocalQs] = useState([]);
  const [globalQs, setGlobalQs] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [newChapter, setNewChapter] = useState("");
  const [openQuestionId, setOpenQuestionId] = useState(null);
  const [selectedGlobalIds, setSelectedGlobalIds] = useState(new Set());
  const [creating, setCreating] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);

  const [newQuestion, setNewQuestion] = useState({
    type: "single",
    questionText: "",
    options: ["", "", "", ""],
    correctAnswer: 0,
    multipleCorrectAnswers: [],
    keywords: [],
    caseSensitive: false,
    explanation: "",
    difficulty: "medium",
  });
  const [activeTab, setActiveTab] = useState("local");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));
  const isTeacher = user?.roles?.includes("teacher") && course?.teacher?._id?.toString() === user?._id?.toString();

  const fetchLocal = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/questionbank/local/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setLocalQs(data.questions);
        setChapters([...new Set(data.questions.map(q => q.chapter || "Chưa phân loại"))]);
      } else setErrorMsg(data.message || "Không thể tải câu hỏi");
    } catch {
      setErrorMsg("Lỗi khi tải câu hỏi");
    } finally {
      setLoading(false);
    }
  };

  const fetchGlobal = async () => {
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:5000/api/questionbank/global`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setGlobalQs(data.questions);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isTeacher) {
      fetchLocal();
      fetchGlobal();
    }
  }, [courseId, token, isTeacher]);

  const handleAddChapter = () => {
    if (!newChapter.trim()) return alert("Nhập tên chapter mới!");
    if (!chapters.includes(newChapter.trim())) {
      setChapters(prev => [...prev, newChapter.trim()]);
    }
    setSelectedChapter(newChapter.trim());
    setNewChapter("");
  };

  const handleSaveQuestion = async () => {
  const isEdit = !!editingQuestion;

  if (!selectedChapter.trim()) return alert("Chọn chapter!");
  if (!newQuestion.questionText.trim()) return alert("Nhập câu hỏi!");

  // ===== validate giữ nguyên =====

  try {
    const url = isEdit
      ? `http://localhost:5000/api/questionbank/local/${editingQuestion._id}`
      : `http://localhost:5000/api/questionbank/local/create/${courseId}`;

    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...newQuestion,
        chapter: selectedChapter,
      }),
    });

    const data = await res.json();
    if (!data.success) {
      return alert(data.message || "Không thể lưu câu hỏi");
    }

    if (isEdit) {
      setLocalQs((prev) =>
        prev.map((q) =>
          q._id === data.question._id ? data.question : q
        )
      );
    } else {
      setLocalQs((prev) => [...prev, data.question]);
    }

    // reset
    setCreating(false);
    setEditingQuestion(null);
    setNewQuestion({
      type: "single",
      questionText: "",
      options: ["", "", "", ""],
      correctAnswer: 0,
      multipleCorrectAnswers: [],
      keywords: [],
      caseSensitive: false,
      explanation: "",
      difficulty: "medium",
    });
  } catch (err) {
    console.error(err);
    alert("Lỗi kết nối server");
  }
};


  const handleImportFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!selectedChapter.trim()) return alert("Chọn chapter trước!");

    try {
      const text = await file.text();
      const questions = JSON.parse(text);
      if (!Array.isArray(questions)) return alert("File không hợp lệ!");

      const res = await fetch(`http://localhost:5000/api/questionbank/local/import-file/${courseId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ chapter: selectedChapter, questions }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ Import thành công ${data.inserted.length} câu hỏi!`);
        fetchLocal(); 
      } else alert(data.message || "Import thất bại");
    } catch {
      alert("File JSON không hợp lệ!");
    }
  };

  const handleImportGlobal = async () => {
    if (!selectedGlobalIds.size) return alert("Chọn câu hỏi Global!");
    try {
      const res = await fetch(`http://localhost:5000/api/questionbank/local/import-global/${courseId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ questionIds: Array.from(selectedGlobalIds) }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ Import ${data.inserted.length} câu hỏi từ Global thành công!`);
        fetchLocal();
        setSelectedGlobalIds(new Set());
      } else alert(data.message || "Import thất bại");
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <p>⏳ Đang tải dữ liệu...</p>;
  if (errorMsg) return <p>{errorMsg}</p>;

  const filteredQuestions =
    !selectedChapter || selectedChapter === "all"
      ? localQs.filter(q => selectedDifficulty === "all" || q.difficulty === selectedDifficulty)
      : localQs.filter(q => 
          (q.chapter || "Chưa phân loại") === selectedChapter &&
          (selectedDifficulty === "all" || q.difficulty === selectedDifficulty)
        );

  return (
    <div className="question-bank">
      <h2>📚 Question Bank</h2>
      {isTeacher && (
        <>
          <div className="tabs">
            <button className={activeTab === "local" ? "active" : ""} onClick={() => setActiveTab("local")}>Local</button>
            <button className={activeTab === "global" ? "active" : ""} onClick={() => setActiveTab("global")}>Global</button>
            <button onClick={() => setCreating(true)}>➕ Tạo câu hỏi</button>
          </div>

          {creating && (
            <div className="create-question">
              <h3>{editingQuestion ? "✏️ Sửa câu hỏi" : "➕ Tạo câu hỏi mới"}</h3>

              <div className="chapter-select">
                <select value={selectedChapter} onChange={e => setSelectedChapter(e.target.value)}>
                  <option value="">-- Chọn chapter --</option>
                  {chapters.map((c, idx) => <option key={idx} value={c}>{c}</option>)}
                </select>
                <input type="text" placeholder="Hoặc tạo chapter mới..." value={newChapter} onChange={e => setNewChapter(e.target.value)} />
                <button onClick={handleAddChapter}>➕ Thêm chapter</button>
              </div>

              <div className="form-group">
                <label>Loại câu hỏi:</label>
                <select value={newQuestion.type} onChange={e => setNewQuestion({ ...newQuestion, type: e.target.value })}>
                  <option value="single">1 Đáp án đúng</option>
                  <option value="multiple">Nhiều đáp án đúng</option>
                  <option value="text">Tự luận (từ khóa)</option>
                </select>
              </div>

              <textarea placeholder="Nội dung câu hỏi..." value={newQuestion.questionText} onChange={e => setNewQuestion({ ...newQuestion, questionText: e.target.value })} />

              {(newQuestion.type === "single" || newQuestion.type === "multiple") && (
                <div className="options-section">
                  <h4>{newQuestion.type === "single" ? "Đáp án" : "Đáp án (chọn 1 hoặc nhiều)"}</h4>
                  {newQuestion.options.map((opt, i) => (
                    <div key={i} className="option-line">
                      <input type="text" placeholder={`Đáp án ${String.fromCharCode(65 + i)}`} value={opt} onChange={e => {
                        const updated = [...newQuestion.options];
                        updated[i] = e.target.value;
                        setNewQuestion({ ...newQuestion, options: updated });
                      }} />
                      {newQuestion.type === "single" ? (
                        <>
                          <input type="radio" name="correctAnswer" checked={newQuestion.correctAnswer === i} onChange={() => setNewQuestion({ ...newQuestion, correctAnswer: i })} />
                          <label>Đúng</label>
                        </>
                      ) : (
                        <>
                          <input
                            type="checkbox"
                            checked={newQuestion.multipleCorrectAnswers.includes(i)}
                            onChange={(e) => {
                              const updated = e.target.checked
                                ? [...newQuestion.multipleCorrectAnswers, i]
                                : newQuestion.multipleCorrectAnswers.filter(idx => idx !== i);
                              setNewQuestion({ ...newQuestion, multipleCorrectAnswers: updated });
                            }}
                          />
                          <label>Đúng</label>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {newQuestion.type === "text" && (
                <div className="keywords-section">
                  <h4>Từ khóa chấp nhận</h4>
                  <div className="keywords-input">
                    {newQuestion.keywords.map((kw, i) => (
                      <div key={i} className="keyword-item">
                        <input
                          type="text"
                          placeholder={`Từ khóa ${i + 1}`}
                          value={kw}
                          onChange={e => {
                            const updated = [...newQuestion.keywords];
                            updated[i] = e.target.value;
                            setNewQuestion({ ...newQuestion, keywords: updated });
                          }}
                        />
                        <button onClick={() => {
                          const updated = newQuestion.keywords.filter((_, idx) => idx !== i);
                          setNewQuestion({ ...newQuestion, keywords: updated });
                        }}>🗑️</button>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setNewQuestion({ ...newQuestion, keywords: [...newQuestion.keywords, ""] })}>
                    ➕ Thêm từ khóa
                  </button>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={newQuestion.caseSensitive}
                      onChange={e => setNewQuestion({ ...newQuestion, caseSensitive: e.target.checked })}
                    />
                    Phân biệt chữ hoa/thường
                  </label>
                </div>
              )}

              <select value={newQuestion.difficulty} onChange={e => setNewQuestion({ ...newQuestion, difficulty: e.target.value })}>
                <option value="easy">Dễ</option>
                <option value="medium">Trung bình</option>
                <option value="hard">Khó</option>
              </select>

              <textarea placeholder="Giải thích (tuỳ chọn)" value={newQuestion.explanation} onChange={e => setNewQuestion({ ...newQuestion, explanation: e.target.value })} />

              <button className="btn-save" onClick={handleSaveQuestion}>
  💾 {editingQuestion ? "Cập nhật" : "Lưu"}
</button>

              <button className="btn-back" onClick={() => setCreating(false)}>⬅ Quay lại</button>
            </div>
          )}

          {activeTab === "local" && (
            <>
              <div className="filter-section">
                <div className="filter-group">
                  <label>Chọn chapter:</label>
                  <select value={selectedChapter} onChange={e => setSelectedChapter(e.target.value)}>
                    <option value="all">-- Tất cả --</option>
                    {chapters.map((c, idx) => <option key={idx} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="filter-group">
                  <label>Chọn độ khó:</label>
                  <select value={selectedDifficulty} onChange={e => setSelectedDifficulty(e.target.value)}>
                    <option value="all">-- Tất cả --</option>
                    <option value="easy">🟢 Dễ</option>
                    <option value="medium">🟡 Trung bình</option>
                    <option value="hard">🔴 Khó</option>
                  </select>
                </div>
              </div>
              
              {filteredQuestions.length ? (
                <ChapterQuestions
  questions={filteredQuestions}
  openQuestionId={openQuestionId}
  setOpenQuestionId={setOpenQuestionId}
  onEdit={(q) => {
    setEditingQuestion(q);
    setCreating(true);

    setNewQuestion({
      type: q.type,
      questionText: q.questionText,
      options: q.options || ["", "", "", ""],
      correctAnswer: q.correctAnswer ?? 0,
      multipleCorrectAnswers: q.multipleCorrectAnswers || [],
      keywords: q.keywords || [],
      caseSensitive: q.caseSensitive || false,
      explanation: q.explanation || "",
      difficulty: q.difficulty || "medium",
    });

    setSelectedChapter(q.chapter || "");
  }}
/>

              ) : <p className="no-questions">Chưa có câu hỏi phù hợp với bộ lọc này</p>}
              
              <div className="import-section-local">
                <label>Import file JSON:</label>
                <input type="file" accept=".json" onChange={handleImportFile} />
              </div>
            </>
          )}

          {activeTab === "global" && (
            <>
              <h4>📦 Global Questions</h4>
              <ul>
                {globalQs.map(q => (
                  <li key={q._id}>
                    <input
                      type="checkbox"
                      checked={selectedGlobalIds.has(q._id)}
                      onChange={e => {
                        const setCopy = new Set(selectedGlobalIds);
                        if (e.target.checked) setCopy.add(q._id);
                        else setCopy.delete(q._id);
                        setSelectedGlobalIds(setCopy);
                      }}
                    />
                    {q.questionText} [{q.chapter || "Chưa phân loại"}]
                  </li>
                ))}
              </ul>
              <button onClick={handleImportGlobal}>📥 Import selected Global → Local</button>
            </>
          )}
        </>
      )}
    </div>
  );
}