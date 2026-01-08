import React, { useState, useEffect, useReducer, useCallback } from "react";
import './QuizTab.css';

// ✅ Reducer function - pure, no side effects
const manualQuestionsReducer = (state, action) => {
  switch (action.type) {
    case 'ADD': {
      return [
        ...state,
        {
          type: "single",
          questionText: "",
          options: ["", "", "", ""],
          correctAnswer: 0,
          multipleCorrectAnswers: [],
          keywords: [],
          caseSensitive: false,
          explanation: "",
          difficulty: "medium",
        },
      ];
    }

    case 'REMOVE': {
      return state.filter((_, i) => i !== action.index);
    }

    case 'CHANGE_TYPE': {
      const newState = [...state];
      const q = newState[action.index];
      const newType = action.newType;

      // Preserve text and difficulty
      const tempText = q.questionText;
      const tempDifficulty = q.difficulty;
      const tempExplanation = q.explanation;

      // Create new object based on type
      newState[action.index] = {
        type: newType,
        questionText: tempText,
        difficulty: tempDifficulty,
        explanation: tempExplanation,
      };

      if (newType === "single") {
        newState[action.index].options = ["", "", "", ""];
        newState[action.index].correctAnswer = 0;
        newState[action.index].multipleCorrectAnswers = [];
        newState[action.index].keywords = [];
        newState[action.index].caseSensitive = false;
      } else if (newType === "multiple") {
        newState[action.index].options = ["", "", "", ""];
        newState[action.index].multipleCorrectAnswers = [];
        newState[action.index].correctAnswer = 0;
        newState[action.index].keywords = [];
        newState[action.index].caseSensitive = false;
      } else if (newType === "text") {
        newState[action.index].keywords = [""];
        newState[action.index].options = [];
        newState[action.index].correctAnswer = 0;
        newState[action.index].multipleCorrectAnswers = [];
        newState[action.index].caseSensitive = false;
      }

      return newState;
    }

    case 'UPDATE_FIELD': {
      const newState = [...state];
      newState[action.index] = {
        ...newState[action.index],
        [action.field]: action.value,
      };
      return newState;
    }

    case 'UPDATE_OPTION': {
      const newState = [...state];
      const q = newState[action.index];
      q.options = [...q.options];
      q.options[action.optionIndex] = action.value;
      return newState;
    }

    case 'UPDATE_KEYWORD': {
      const newState = [...state];
      const q = newState[action.index];
      q.keywords = [...q.keywords];
      q.keywords[action.keywordIndex] = action.value;
      return newState;
    }
    case "RESET":
        return [];

    case 'TOGGLE_MULTIPLE': {
      const newState = [...state];
      const q = newState[action.index];
      const current = q.multipleCorrectAnswers || [];
      
      console.log(`[REDUCER] Before toggle Q${action.index}: [${current.join(',')}]`);
      
      if (current.includes(action.ansIdx)) {
        q.multipleCorrectAnswers = current.filter(a => a !== action.ansIdx);
      } else {
        q.multipleCorrectAnswers = [...current, action.ansIdx];
      }
      
      console.log(`[REDUCER] After toggle Q${action.index}: [${q.multipleCorrectAnswers.join(',')}]`);
      return newState;
    }

    case 'ADD_KEYWORD': {
      const newState = [...state];
      const q = newState[action.index];
      q.keywords = [...(q.keywords || []), ""];
      return newState;
    }

    default:
      return state;
  }
};

export default function QuizTab({ courseId, course, token, editingQuiz, onCancelEdit, onSaveQuiz }) {
  const [randomCount, setRandomCount] = useState(1);
  const [questions, setQuestions] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState("");
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [manualQuestions, dispatch] = useReducer(manualQuestionsReducer, []);
  const [quizTitle, setQuizTitle] = useState("");
  const [timeLimit, setTimeLimit] = useState(5);
  const [popupChapter, setPopupChapter] = useState(null);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [selectedDifficultyFilter, setSelectedDifficultyFilter] = useState("all");
  const [maxAttempts, setMaxAttempts] = useState(0); // 0 = vô hạn


// Function lọc câu hỏi theo chapter + difficulty
const getFilteredQuestions = () => {
  return questions.filter(q => {
    const matchChapter = q.chapter === popupChapter;
    const matchDifficulty = selectedDifficultyFilter === "all" || q.difficulty === selectedDifficultyFilter;
    return matchChapter && matchDifficulty;
  });
};


// Đóng popup và reset filter
const closePopup = () => {
  setPopupChapter(null);
  setSelectedDifficultyFilter("all");
  setRandomCount(1);
};
  // ✅ Memoized handlers to prevent double-invoke
  const handleToggleMultiple = useCallback((index, ansIdx) => {
    dispatch({ type: 'TOGGLE_MULTIPLE', index, ansIdx });
  }, []);

  const handleUpdateField = useCallback((index, field, value) => {
    dispatch({ type: 'UPDATE_FIELD', index, field, value });
  }, []);

  const handleUpdateOption = useCallback((index, optionIndex, value) => {
    dispatch({ type: 'UPDATE_OPTION', index, optionIndex, value });
  }, []);

  const handleUpdateKeyword = useCallback((index, keywordIndex, value) => {
    dispatch({ type: 'UPDATE_KEYWORD', index, keywordIndex, value });
  }, []);

  const handleChangeType = useCallback((index, newType) => {
    dispatch({ type: 'CHANGE_TYPE', index, newType });
  }, []);

  const handleRemoveQuestion = useCallback((index) => {
    dispatch({ type: 'REMOVE', index });
  }, []);

  const handleAddKeyword = useCallback((index) => {
    dispatch({ type: 'ADD_KEYWORD', index });
  }, []);

  const handleAddQuestion = useCallback(() => {
    dispatch({ type: 'ADD' });
  }, []);

  // Lấy danh sách câu hỏi từ QuestionBank
  useEffect(() => {
    if (!token) return;
    fetch(`http://localhost:5000/api/questionbank/local/${courseId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data.success) {
          setQuestions(data.questions || []);
          const uniqueChapters = [
            ...new Set((data.questions || []).map(q => q.chapter || "Chưa phân loại")),
          ];
          setChapters(uniqueChapters);
        }
      })
      .catch(err => console.error("Error fetching questions:", err));
  }, [courseId, token]);

  useEffect(() => {
  if (!editingQuiz) return;

  setQuizTitle(editingQuiz.title || "");
  setTimeLimit(editingQuiz.timeLimit || 5);
  setMaxAttempts(editingQuiz.maxAttempts ?? 0);

  // Câu hỏi từ bank
  const bankQs = editingQuiz.questions.filter(q => q._id);
  const manualQs = editingQuiz.questions.filter(q => !q._id);

  setQuizQuestions(bankQs);
  setSelectedQuestions(bankQs.map(q => q._id));

  manualQs.forEach(q => {
    dispatch({ type: "ADD" });
    const idx = manualQuestions.length;

    dispatch({ type: "UPDATE_FIELD", index: idx, field: "type", value: q.type });
    dispatch({ type: "UPDATE_FIELD", index: idx, field: "questionText", value: q.questionText });
    dispatch({ type: "UPDATE_FIELD", index: idx, field: "difficulty", value: q.difficulty });
    dispatch({ type: "UPDATE_FIELD", index: idx, field: "explanation", value: q.explanation });

    if (q.type === "single") {
      q.options.forEach((opt, oi) =>
        dispatch({ type: "UPDATE_OPTION", index: idx, optionIndex: oi, value: opt })
      );
      dispatch({ type: "UPDATE_FIELD", index: idx, field: "correctAnswer", value: q.correctAnswer });
    }

    if (q.type === "multiple") {
      q.options.forEach((opt, oi) =>
        dispatch({ type: "UPDATE_OPTION", index: idx, optionIndex: oi, value: opt })
      );
      q.multipleCorrectAnswers.forEach(ans =>
        dispatch({ type: "TOGGLE_MULTIPLE", index: idx, ansIdx: ans })
      );
    }

    if (q.type === "text") {
      q.keywords.forEach((kw, kwi) =>
        dispatch({ type: "UPDATE_KEYWORD", index: idx, keywordIndex: kwi, value: kw })
      );
      dispatch({ type: "UPDATE_FIELD", index: idx, field: "caseSensitive", value: q.caseSensitive });
    }
  });
}, [editingQuiz]);

  const addToQuiz = (q) => {
    if (!selectedQuestions.includes(q._id)) {
      setSelectedQuestions(prev => [...prev, q._id]);
      setQuizQuestions(prev => [...prev, q]);
    } else {
      setSelectedQuestions(prev => prev.filter(id => id !== q._id));
      setQuizQuestions(prev => prev.filter(qq => qq._id !== q._id));
    }
  };

  const addRandomQuestions = () => {
    const chapterQuestions = questions.filter(q => q.chapter === popupChapter);
    const availableQuestions = chapterQuestions.filter(q => !selectedQuestions.includes(q._id));

    if (randomCount < 1) return alert("Số lượng phải >= 1");
    if (randomCount > availableQuestions.length) {
      return alert(`Chỉ còn ${availableQuestions.length} câu hỏi chưa chọn`);
    }

    const shuffled = [...availableQuestions].sort(() => Math.random() - 0.5);
    const selectedRandom = shuffled.slice(0, randomCount);

    selectedRandom.forEach(q => addToQuiz(q));
  };

  const removeFromQuiz = (qId) => {
    setQuizQuestions(prev => prev.filter(qq => qq._id !== qId));
    setSelectedQuestions(prev => prev.filter(id => id !== qId));
  };
const handleSaveQuiz = async () => {
  const isEdit = !!editingQuiz;

  if (!quizTitle.trim()) return alert("❌ Nhập tiêu đề quiz!");

  const allQuestions = [...quizQuestions, ...manualQuestions];
  if (allQuestions.length === 0)
    return alert("❌ Chọn hoặc thêm ít nhất 1 câu hỏi!");

  // ===== VALIDATE (giữ nguyên của bạn) =====
  for (let i = 0; i < manualQuestions.length; i++) {
    const q = manualQuestions[i];

    if (!q.questionText.trim())
      return alert(`❌ Câu ${quizQuestions.length + i + 1}: Chưa nhập nội dung!`);

    if (q.type === "single" || q.type === "multiple") {
      const filledOptions = q.options.filter(o => o.trim());
      if (filledOptions.length < 2)
        return alert(`❌ Câu ${quizQuestions.length + i + 1}: Cần ít nhất 2 đáp án!`);
    }

    if (q.type === "single" && q.correctAnswer == null)
      return alert(`❌ Câu ${quizQuestions.length + i + 1}: Chưa chọn đáp án đúng!`);

    if (q.type === "multiple" && (!q.multipleCorrectAnswers?.length))
      return alert(`❌ Câu ${quizQuestions.length + i + 1}: Chưa chọn đáp án đúng!`);

    if (q.type === "text") {
      const validKeywords = q.keywords.filter(k => k.trim());
      if (validKeywords.length === 0)
        return alert(`❌ Câu ${quizQuestions.length + i + 1}: Chưa thêm từ khóa!`);
    }
  }

  try {
    const url = isEdit
      ? `http://localhost:5000/api/quiz/${editingQuiz._id}`
      : "http://localhost:5000/api/quiz/create";

    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        courseId,
        title: quizTitle,
        timeLimit: Number(timeLimit),
        maxAttempts: Number(maxAttempts),
        questions: allQuestions,
      }),
    });

    const data = await res.json();
    if (maxAttempts < 0) return alert("❌ Số lần làm phải >= 0");

    if (!res.ok) {
      return alert("❌ " + (data.message || "Không thể lưu quiz"));
    }

    alert(isEdit ? "✅ Quiz đã được cập nhật!" : "✅ Quiz đã được tạo!");

    // reset form
    setQuizTitle("");
    setQuizQuestions([]);
    setSelectedQuestions([]);
    dispatch({ type: "RESET" }); // 👈 cần thêm case RESET trong reducer

    onSaveQuiz?.(data.quiz);
  } catch (err) {
    console.error(err);
    alert("❌ Lỗi kết nối server");
  }
};


  return (
    <div className="quiz-tab">
      <h2>{editingQuiz ? "✏️ Sửa Quiz" : "🧩 Tạo Quiz"}</h2>
{editingQuiz && (
  <button className="btn-cancel" onClick={onCancelEdit}>
    ❌ Hủy sửa
  </button>
)}


      {/* QUIZ HEADER */}
      <div className="quiz-header">
        <div className="form-group">
          <label>Tiêu đề Quiz</label>
          <input
            type="text"
            placeholder="VD: Quiz Chương 1 - Biến & Kiểu dữ liệu"
            value={quizTitle}
            onChange={(e) => setQuizTitle(e.target.value)}
            className="input-lg"
          />
        </div>

        <div className="form-group">
          <label>♾️ Giới hạn số lần làm quiz (0 = vô hạn)</label>
              <input
                type="number"
                min="0"
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(Number(e.target.value))}
              />
            <label>⏳ Thời gian làm bài (phút)</label>
          <input
            type="number"
            min="1"
            value={timeLimit}
            onChange={(e) => setTimeLimit(Number(e.target.value))}
          />
        </div>
      </div>

      {/* CHỌN CÂU HỎI TỪ BANK */}
      <div className="quiz-select-chapter">
        <h3>📚 Chọn câu hỏi từ ngân hàng</h3>
        <label>Chọn chapter:</label>
        <select 
          value={selectedChapter} 
          onChange={(e) => {
            const chapter = e.target.value;
            setSelectedChapter(chapter);
            if (chapter !== "") setPopupChapter(chapter);
            else setPopupChapter(null);
          }}
        >
          <option value="">-- Chọn chapter --</option>
          {chapters.map((c, i) => (
            <option key={i} value={c}>{c}</option>
          ))}
        </select>

        {/* POPUP CHỌN CÂU HỎI */}
        {popupChapter && (
      <div className="popup-overlay" onClick={() => closePopup()}>
        <div className="popup-content" onClick={(e) => e.stopPropagation()}>
          <div className="popup-header">
            <h3>📝 Chọn câu hỏi - {popupChapter}</h3>
            <button className="btn-close-popup-x" onClick={() => closePopup()}>✕</button>
          </div>

          {/* FILTER DIFFICULTY */}
          <div className="popup-filter">
            <label>Lọc theo độ khó:</label>
            <div className="difficulty-filter-buttons">
              <button 
                className={`difficulty-btn all ${selectedDifficultyFilter === "all" ? "active" : ""}`}
                onClick={() => setSelectedDifficultyFilter("all")}
              >
                Tất cả
              </button>
              <button 
                className={`difficulty-btn easy ${selectedDifficultyFilter === "easy" ? "active" : ""}`}
                onClick={() => setSelectedDifficultyFilter("easy")}
              >
                🟢 Dễ
              </button>
              <button 
                className={`difficulty-btn medium ${selectedDifficultyFilter === "medium" ? "active" : ""}`}
                onClick={() => setSelectedDifficultyFilter("medium")}
              >
                🟡 Trung bình
              </button>
              <button 
                className={`difficulty-btn hard ${selectedDifficultyFilter === "hard" ? "active" : ""}`}
                onClick={() => setSelectedDifficultyFilter("hard")}
              >
                🔴 Khó
              </button>
            </div>
          </div>

          {/* RANDOM SELECT */}
          <div className="random-select">
            <label>Chọn ngẫu nhiên:</label>
            <div className="random-input-group">
              <input
                type="number"
                min="1"
                max={getFilteredQuestions().length}
                value={randomCount}
                onChange={(e) => setRandomCount(Number(e.target.value))}
                placeholder="Số lượng"
              />
              <span className="max-count">tối đa {getFilteredQuestions().length}</span>
              <button onClick={addRandomQuestions} className="btn-random">
                🎲 Chọn ngẫu nhiên
              </button>
            </div>
          </div>

          {/* DANH SÁCH CÂU HỎI */}
          <div className="popup-questions-wrapper">
            <div className="questions-list-header">
              <span>Câu hỏi ({getFilteredQuestions().length})</span>
            </div>
            
            {getFilteredQuestions().length > 0 ? (
              <ul className="questions-list">
                {getFilteredQuestions().map(q => (
                  <li key={q._id} className={`question-item ${selectedQuestions.includes(q._id) ? 'selected-item' : ''}`}>
                    <div className="question-content">
                      <span className="question-text">{q.questionText}</span>
                      <span className={`difficulty-badge difficulty-${q.difficulty}`}>
                        {q.difficulty === 'easy' ? '🟢 Dễ' : q.difficulty === 'medium' ? '🟡 Trung bình' : '🔴 Khó'}
                      </span>
                    </div>
                    <button 
                      className={`btn-select ${selectedQuestions.includes(q._id) ? 'selected' : ''}`}
                      onClick={() => addToQuiz(q)}
                    >
                      {selectedQuestions.includes(q._id) ? "X" : "+"}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="no-questions-popup">
                <p>😞 Không có câu hỏi phù hợp với bộ lọc này</p>
              </div>
            )}
          </div>

          <div className="popup-footer">
            <span className="selected-count">Đã chọn: {selectedQuestions.filter(id => getFilteredQuestions().some(q => q._id === id)).length}</span>
            <button className="btn-close-popup" onClick={() => closePopup()}>
              ✓ Đóng
            </button>
          </div>
        </div>
      </div>
    )}
      </div>

      {/* CÂU HỎI ĐÃ CHỌN */}
      <div className="quiz-selected">
        <h3>✅ Câu hỏi đã chọn ({quizQuestions.length})</h3>
        {quizQuestions.length === 0 ? (
          <p className="empty-message">Chưa chọn câu hỏi nào</p>
        ) : (
          quizQuestions.map((q, idx) => (
            <div key={q._id} className="selected-question">
              <span className="q-number">{idx + 1}.</span>
              <span className="q-text">{q.questionText}</span>
              <button 
                className="btn-remove" 
                onClick={() => removeFromQuiz(q._id)}
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      {/* THÊM CÂU HỎI THỦ CÔNG */}
      <div className="manual-questions-section">
        <h3>📝 Thêm câu hỏi thủ công</h3>

        {manualQuestions.map((q, i) => (
          <div key={i} className="manual-question-card">
            <div className="q-header">
              <span className="q-num">Câu {quizQuestions.length + i + 1}</span>
              <select 
                value={q.type}
                onChange={(e) => handleChangeType(i, e.target.value)}
                className="type-select"
              >
                <option value="single">✔️ Chọn 1 đáp án</option>
                <option value="multiple">☑️ Chọn nhiều đáp án</option>
                <option value="text">📝 Điền từ khóa</option>
              </select>
              {manualQuestions.length > 1 && (
                <button 
                  className="btn-delete-q"
                  onClick={() => handleRemoveQuestion(i)}
                >
                  🗑️
                </button>
              )}
            </div>

            {/* QUESTION TEXT */}
            <textarea
              placeholder="Nhập câu hỏi..."
              value={q.questionText}
              onChange={(e) => handleUpdateField(i, 'questionText', e.target.value)}
              className="textarea-lg"
            />

            {/* DIFFICULTY */}
            <select
              value={q.difficulty}
              onChange={(e) => handleUpdateField(i, 'difficulty', e.target.value)}
              className="difficulty-select"
            >
              <option value="easy">🟢 Dễ</option>
              <option value="medium">🟡 Trung bình</option>
              <option value="hard">🔴 Khó</option>
            </select>

            {/* LOẠI SINGLE */}
            {q.type === "single" && (
              <div className="answers-section">
                <h4>Đáp án</h4>
                {q.options && q.options.map((opt, oi) => (
                  <div key={oi} className="option-row single">
                    <input
                      type="radio"
                      name={`correct-${i}`}
                      checked={q.correctAnswer === oi}
                      onChange={() => handleUpdateField(i, 'correctAnswer', oi)}
                    />
                    <input
                      type="text"
                      placeholder={`Đáp án ${oi + 1}`}
                      value={opt}
                      onChange={(e) => handleUpdateOption(i, oi, e.target.value)}
                      className="input-option"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* LOẠI MULTIPLE */}
            {q.type === "multiple" && (
              <div className="answers-section">
                <h4>Chọn tất cả đáp án đúng</h4>
                <p style={{ fontSize: '12px', color: '#666' }}>
                  Đáp án đúng: [{q.multipleCorrectAnswers ? q.multipleCorrectAnswers.join(', ') : 'chưa chọn'}]
                </p>
                {q.options && q.options.map((opt, oi) => {
                  const isChecked = q.multipleCorrectAnswers && q.multipleCorrectAnswers.includes(oi);
                  
                  return (
                    <div key={oi} className="option-row multiple">
                      <input
                        type="checkbox"
                        checked={isChecked || false}
                        onChange={() => handleToggleMultiple(i, oi)}
                      />
                      <input
                        type="text"
                        placeholder={`Đáp án ${oi + 1}`}
                        value={opt}
                        onChange={(e) => handleUpdateOption(i, oi, e.target.value)}
                        className="input-option"
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* LOẠI TEXT */}
            {q.type === "text" && (
              <div className="answers-section">
                <h4>Từ khóa chấp nhận</h4>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={q.caseSensitive || false}
                    onChange={(e) => handleUpdateField(i, 'caseSensitive', e.target.checked)}
                  />
                  Phân biệt hoa/thường
                </label>
                {q.keywords && q.keywords.map((kw, kwIdx) => (
                  <input
                    key={kwIdx}
                    type="text"
                    placeholder={`Từ khóa ${kwIdx + 1}`}
                    value={kw}
                    onChange={(e) => handleUpdateKeyword(i, kwIdx, e.target.value)}
                    className="input-keyword"
                  />
                ))}
                <button 
                  className="btn-add-kw"
                  onClick={() => handleAddKeyword(i)}
                >
                  ➕ Thêm từ khóa
                </button>
              </div>
            )}

            {/* EXPLANATION */}
            <textarea
              placeholder="Giải thích (tùy chọn)..."
              value={q.explanation}
              onChange={(e) => handleUpdateField(i, 'explanation', e.target.value)}
              className="textarea-sm"
            />
          </div>
        ))}

        <button className="btn-add-manual" onClick={handleAddQuestion}>
          ➕ Thêm câu hỏi thủ công
        </button>
      </div>

      {/* SAVE BUTTON */}
      <button className="btn-save-quiz" onClick={handleSaveQuiz}>
        💾 Lưu Quiz
      </button>
      <button
    className="cancel-btn"
    onClick={() => {
      if (
        window.confirm("Bạn có chắc muốn hủy? Dữ liệu chưa lưu sẽ mất.")
      ) {
        onCancelEdit?.();
      }
    }}
  >
    ❌ Hủy
  </button>
    </div>
  );
}