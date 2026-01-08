import React, { useState, useEffect } from "react";
import "./GlobalBankForm.css";

export default function GlobalBankForm({ token }) {
  const [questions, setQuestions] = useState([]);
  const [fileContent, setFileContent] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [selectedImportChapter, setSelectedImportChapter] = useState("");
  const [showNewChapterInput, setShowNewChapterInput] = useState(false);
  const [newChapterName, setNewChapterName] = useState("");
  const [globalQuestions, setGlobalQuestions] = useState([]);
  const [selectedChapterView, setSelectedChapterView] = useState(null);
  const [debugInfo, setDebugInfo] = useState("");
  const [editingQuestion, setEditingQuestion] = useState(null);

  useEffect(() => {
  fetchGlobalBank();
}, [token]);

  const fetchGlobalBank = async () => {
  try {
    const res = await fetch(
      "http://localhost:5000/api/questionbank/global",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const data = await res.json();

    if (res.ok) {
      setGlobalQuestions(data.questions || []);
      setChapters(
        Array.from(new Set((data.chapters || []).filter(c => c?.trim())))
      );
      setDebugInfo(`Đã load ${data.questions.length} câu hỏi`);
    }
  } catch (err) {
    setDebugInfo("Lỗi kết nối server");
  }
};

const handleUpdateQuestion = async () => {
  try {
    const res = await fetch(
      `http://localhost:5000/api/questionbank/global/${editingQuestion._id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editingQuestion),
      }
    );

    if (res.ok) {
      alert("✅ Đã cập nhật câu hỏi");
      setEditingQuestion(null);
      await fetchGlobalBank();
    } else {
      alert("❌ Update thất bại");
    }
  } catch (err) {
    alert("❌ Lỗi kết nối server");
  }
};

const handleDeleteQuestion = async (id) => {
  if (!window.confirm("Bạn chắc chắn muốn xóa câu hỏi này?")) return;

  try {
    const res = await fetch(
      `http://localhost:5000/api/questionbank/global/${id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (res.ok) {
      alert("✅ Đã xóa câu hỏi");
      await fetchGlobalBank();
    } else {
      alert("❌ Xóa thất bại");
    }
  } catch (err) {
    alert("❌ Lỗi kết nối server");
  }
};

  const handleAddNewChapter = () => {
    if (!newChapterName.trim()) {
      alert("❌ Tên chapter không được để trống!");
      return;
    }

    if (chapters.includes(newChapterName.trim())) {
      alert("⚠️ Chapter này đã tồn tại!");
      setNewChapterName("");
      setShowNewChapterInput(false);
      return;
    }

    setChapters(prev => [...prev, newChapterName.trim()]);
    setNewChapterName("");
    setShowNewChapterInput(false);
    alert("✅ Đã thêm chapter mới!");
  };

  const addManualQuestion = () => {
    setQuestions(prev => [
      ...prev,
      {
        type: "single",
        chapter: "",
        questionText: "",
        options: ["", "", "", ""],
        correctAnswer: 0,
        multipleCorrectAnswers: [],
        keywords: [],
        caseSensitive: false,
        explanation: "",
        difficulty: "medium",
      },
    ]);
  };

  const removeManualQuestion = index => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const updateManualQuestion = (index, field, value, optionIndex = null) => {
    setQuestions(prev => {
      const updated = [...prev];

      if (field === "option") {
        updated[index].options[optionIndex] = value;
      } else if (field === "keyword") {
        updated[index].keywords[optionIndex] = value;
      } else {
        updated[index][field] = value;
      }

      return updated;
    });
  };

  const addKeyword = (index) => {
    setQuestions(prev => {
      const updated = [...prev];
      updated[index].keywords.push("");
      return updated;
    });
  };

  const removeKeyword = (index, keywordIndex) => {
    setQuestions(prev => {
      const updated = [...prev];
      updated[index].keywords = updated[index].keywords.filter((_, i) => i !== keywordIndex);
      return updated;
    });
  };

  const toggleMultipleAnswer = (index, optionIndex) => {
    setQuestions(prev => {
      const updated = [...prev];
      const answers = updated[index].multipleCorrectAnswers;
      if (answers.includes(optionIndex)) {
        updated[index].multipleCorrectAnswers = answers.filter(i => i !== optionIndex);
      } else {
        updated[index].multipleCorrectAnswers = [...answers, optionIndex];
      }
      return updated;
    });
  };

  const handleFileChange = e => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();

    reader.onload = evt => {
      try {
        const data = JSON.parse(evt.target.result);
        if (!Array.isArray(data)) {
          throw new Error("JSON phải là một mảng câu hỏi");
        }
        setFileContent(data);
        alert(`✅ Đã tải ${data.length} câu hỏi từ file`);
      } catch (err) {
        alert("❌ File JSON không hợp lệ: " + err.message);
        console.error(err);
        setFileContent(null);
      }
    };

    reader.readAsText(file);
  };

  const handleImportFile = async () => {
    if (!selectedImportChapter) {
      alert("❌ Hãy chọn chapter trước!");
      return;
    }
    
    if (!fileContent?.length) {
      alert("❌ File rỗng hoặc không hợp lệ");
      return;
    }

    try {
      const prepared = fileContent.map(q => ({
        type: q.type || "single",
        chapter: selectedImportChapter,
        questionText: q.questionText || "",
        options: Array.isArray(q.options) ? q.options : ["", ""],
        correctAnswer: q.correctAnswer || 0,
        multipleCorrectAnswers: q.multipleCorrectAnswers || [],
        keywords: q.keywords || [],
        caseSensitive: q.caseSensitive || false,
        explanation: q.explanation || "",
        difficulty: q.difficulty || "medium",
      }));

      const res = await fetch("http://localhost:5000/api/questionbank/global/import-file", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ questions: prepared }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(`✅ Import thành công ${data.inserted.length} câu hỏi vào Global Bank!`);
        setFileContent(null);
        setSelectedImportChapter("");
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) fileInput.value = "";
        await fetchGlobalBank();

      } else {
        alert("❌ Import thất bại: " + data.message);
      }
    } catch (err) {
      console.error(err);
      alert("❌ Lỗi kết nối server");
    }
  };

  const handleSaveManualQuestions = async () => {
    if (questions.length === 0) {
      alert("❌ Thêm ít nhất 1 câu hỏi!");
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      
      if (!q.chapter.trim()) {
        alert(`❌ Câu hỏi ${i + 1}: Cần chọn chapter!`);
        return;
      }
      
      if (!q.questionText.trim()) {
        alert(`❌ Câu hỏi ${i + 1}: Nội dung câu hỏi không được để trống!`);
        return;
      }

      // Validate theo type
      if (q.type === "single" || q.type === "multiple") {
        if (q.options.some(o => !o.trim())) {
          alert(`❌ Câu hỏi ${i + 1}: Tất cả đáp án phải có nội dung!`);
          return;
        }
        if (q.type === "multiple" && q.multipleCorrectAnswers.length === 0) {
          alert(`❌ Câu hỏi ${i + 1}: Chọn ít nhất 1 đáp án đúng!`);
          return;
        }
      } else if (q.type === "text") {
        if (q.keywords.length === 0 || q.keywords.some(kw => !kw.trim())) {
          alert(`❌ Câu hỏi ${i + 1}: Cần ít nhất 1 từ khóa!`);
          return;
        }
      }
    }

    try {
      let successCount = 0;
      
      for (const q of questions) {
        const res = await fetch("http://localhost:5000/api/questionbank/global/create", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json", 
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify(q),
        });

        if (res.ok) {
          successCount++;
        } else {
          const data = await res.json();
          alert(`❌ Lỗi khi thêm câu hỏi: ${data.message}`);
          return;
        }
      }

      alert(`✅ Đã thêm thành công ${successCount} câu hỏi vào Global Bank!`);
      await fetchGlobalBank();

      setQuestions([]);
    } catch (err) {
      console.error(err);
      alert("❌ Lỗi kết nối server");
    }
  };

  return (
    <div className="global-bank-form">
      <h2>🌐 Global Question Bank</h2>
      <p className="subtitle">Ngân hàng câu hỏi dùng chung cho tất cả các khóa học</p>

      
      {/* THÊM CHAPTER MỚI */}
      <div className="add-chapter-section">
        <h3>📁 Quản lý Chapters</h3>
        <div className="existing-chapters">
          <strong>Chapters hiện có:</strong>
          {chapters.length > 0 ? (
            <div className="chapter-tags">
              {chapters.map((ch, idx) => (
                <div key={idx} className="chapter-tag-wrapper">
                  <span 
                    className="chapter-tag clickable"
                    onClick={() => setSelectedChapterView(ch)}
                    title="Click để xem câu hỏi"
                  >
                    {ch}
                  </span>
                  <span className="chapter-count">
                    {globalQuestions.filter(q => q.chapter === ch).length}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-text">Chưa có chapter nào</p>
          )}
        </div>

        {!showNewChapterInput ? (
          <button 
            className="btn-add-chapter" 
            onClick={() => setShowNewChapterInput(true)}
          >
            ➕ Thêm Chapter Mới
          </button>
        ) : (
          <div className="new-chapter-input">
            <input
              type="text"
              placeholder="Tên chapter mới..."
              value={newChapterName}
              onChange={(e) => setNewChapterName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleAddNewChapter();
                }
              }}
            />
            <button onClick={handleAddNewChapter}>✓ Thêm</button>
            <button 
              onClick={() => {
                setShowNewChapterInput(false);
                setNewChapterName("");
              }}
            >
              ✕ Hủy
            </button>
          </div>
        )}
      </div>

      {/* IMPORT FILE */}
      <div className="import-section">
        <h3>📥 Import câu hỏi từ file JSON</h3>
        
        <div className="import-form">
          <div className="form-group">
            <label>1. Chọn chapter cho câu hỏi:</label>
            <select 
              value={selectedImportChapter} 
              onChange={e => setSelectedImportChapter(e.target.value)}
            >
              <option value="">-- Chọn chapter --</option>
              {chapters.map((ch, idx) => (
                <option key={idx} value={ch}>{ch}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>2. Chọn file JSON:</label>
            <input type="file" accept=".json" onChange={handleFileChange} />
            {fileContent && (
              <p className="file-info">✓ Đã tải {fileContent.length} câu hỏi</p>
            )}
          </div>

          <button 
            className="btn-import" 
            onClick={handleImportFile}
            disabled={!selectedImportChapter || !fileContent}
          >
            📥 Import vào Global Bank
          </button>
        </div>

        <div className="import-format">
          <strong>📋 Format file JSON:</strong>
          <pre>{`[
  {
    "type": "single",
    "questionText": "Câu hỏi 1?",
    "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
    "correctAnswer": 0,
    "explanation": "Giải thích...",
    "difficulty": "medium"
  },
  {
    "type": "multiple",
    "questionText": "Câu hỏi 2 (nhiều đáp án)?",
    "options": ["Đáp án A", "Đáp án B", "Đáp án C"],
    "multipleCorrectAnswers": [0, 2],
    "explanation": "Giải thích...",
    "difficulty": "medium"
  },
  {
    "type": "text",
    "questionText": "Câu hỏi 3 (tự luận)?",
    "keywords": ["Hà Nội", "Ha Noi"],
    "caseSensitive": false,
    "explanation": "Giải thích...",
    "difficulty": "medium"
  }
]`}</pre>
        </div>
      </div>

      {/* MANUAL QUESTIONS */}
      <div className="manual-section">
        <h3>✏️ Thêm câu hỏi thủ công</h3>

        {questions.length === 0 ? (
          <p className="empty-text">Chưa có câu hỏi nào. Click "Thêm câu hỏi" để bắt đầu.</p>
        ) : (
          <div className="questions-list">
            {questions.map((q, i) => (
              <div key={i} className="manual-question">
                <div className="question-header">
                  <h4>Câu hỏi {i + 1}</h4>
                  <button 
                    className="btn-delete" 
                    onClick={() => removeManualQuestion(i)}
                  >
                    🗑️ Xóa
                  </button>
                </div>

                <div className="form-group">
                  <label>Chapter:</label>
                  <select
                    value={q.chapter}
                    onChange={e => updateManualQuestion(i, "chapter", e.target.value)}
                  >
                    <option value="">-- Chọn chapter --</option>
                    {chapters.map((ch, idx) => (
                      <option key={idx} value={ch}>{ch}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Loại câu hỏi:</label>
                  <select
                    value={q.type}
                    onChange={e => updateManualQuestion(i, "type", e.target.value)}
                  >
                    <option value="single">1 Đáp án đúng</option>
                    <option value="multiple">Nhiều đáp án đúng</option>
                    <option value="text">Tự luận (từ khóa)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Câu hỏi:</label>
                  <textarea
                    placeholder="Nhập nội dung câu hỏi..."
                    value={q.questionText}
                    onChange={e => updateManualQuestion(i, "questionText", e.target.value)}
                    rows="3"
                  />
                </div>

                {(q.type === "single" || q.type === "multiple") && (
                  <div className="form-group">
                    <label>{q.type === "single" ? "Các đáp án" : "Các đáp án (chọn 1 hoặc nhiều)"}</label>
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="option-input">
                        <input
                          type="text"
                          placeholder={`Đáp án ${String.fromCharCode(65 + oi)}`}
                          value={opt}
                          onChange={e => updateManualQuestion(i, "option", e.target.value, oi)}
                        />
                        <label className="radio-label">
                          {q.type === "single" ? (
                            <>
                              <input
                                type="radio"
                                name={`correct-${i}`}
                                checked={q.correctAnswer === oi}
                                onChange={() => updateManualQuestion(i, "correctAnswer", oi)}
                              />
                              Đúng
                            </>
                          ) : (
                            <>
                              <input
                                type="checkbox"
                                checked={q.multipleCorrectAnswers.includes(oi)}
                                onChange={() => toggleMultipleAnswer(i, oi)}
                              />
                              Đúng
                            </>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                )}

                {q.type === "text" && (
                  <div className="form-group">
                    <label>Từ khóa chấp nhận:</label>
                    {q.keywords.map((kw, ki) => (
                      <div key={ki} className="option-input">
                        <input
                          type="text"
                          placeholder={`Từ khóa ${ki + 1}`}
                          value={kw}
                          onChange={e => updateManualQuestion(i, "keyword", e.target.value, ki)}
                        />
                        <button 
                          className="btn-remove-keyword"
                          onClick={() => removeKeyword(i, ki)}
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                    <button 
                      className="btn-add-keyword"
                      onClick={() => addKeyword(i)}
                    >
                      ➕ Thêm từ khóa
                    </button>
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={q.caseSensitive}
                        onChange={e => updateManualQuestion(i, "caseSensitive", e.target.checked)}
                      />
                      Phân biệt chữ hoa/thường
                    </label>
                  </div>
                )}

                <div className="form-group">
                  <label>Giải thích (tuỳ chọn):</label>
                  <textarea
                    placeholder="Giải thích đáp án đúng..."
                    value={q.explanation}
                    onChange={e => updateManualQuestion(i, "explanation", e.target.value)}
                    rows="2"
                  />
                </div>

                <div className="form-group">
                  <label>Mức độ:</label>
                  <select
                    value={q.difficulty}
                    onChange={e => updateManualQuestion(i, "difficulty", e.target.value)}
                  >
                    <option value="easy">Dễ</option>
                    <option value="medium">Trung bình</option>
                    <option value="hard">Khó</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="manual-actions">
          <button className="btn-add-question" onClick={addManualQuestion}>
            ➕ Thêm câu hỏi
          </button>

          {questions.length > 0 && (
            <button className="btn-save" onClick={handleSaveManualQuestions}>
              💾 Lưu {questions.length} câu hỏi vào Global Bank
            </button>
          )}
        </div>
      </div>

      {/* POPUP XEM CÂUHỎI CỦA CHAPTER */}
      {selectedChapterView && (
        <div className="chapter-popup-overlay" onClick={() => setSelectedChapterView(null)}>
          <div className="chapter-popup-content" onClick={(e) => e.stopPropagation()}>
            <div className="chapter-popup-header">
              <h3>📚 Câu hỏi trong: {selectedChapterView}</h3>
              <button className="btn-close-chapter-popup" onClick={() => setSelectedChapterView(null)}>✕</button>
            </div>

            <div className="chapter-popup-body">
              {globalQuestions.filter(q => q.chapter === selectedChapterView).length > 0 ? (
                <ul className="chapter-questions-list">
                  {globalQuestions
                    .filter(q => q.chapter === selectedChapterView)
                    .map((q, idx) => (
                      <li key={q._id || idx} className="chapter-question-item">
                        <div className="question-info">
                          <span className="question-number">{idx + 1}</span>
                          <div className="question-actions">
  <button
    className="btn-edit"
    onClick={() => setEditingQuestion(q)}
  >
    ✏️ Edit
  </button>

  <button
    className="btn-delete"
    onClick={() => handleDeleteQuestion(q._id)}
  >
    🗑️ Delete
  </button>
</div>

                          <div className="question-details">
                            <p className="question-text">{q.questionText}</p>
                            <div className="question-meta">
                              <span className={`type-badge type-${q.type}`}>
                                {q.type === "single" ? "1 Đáp án" : q.type === "multiple" ? "Nhiều Đáp án" : "Tự luận"}
                              </span>
                              <span className={`difficulty-badge difficulty-${q.difficulty}`}>
                                {q.difficulty === 'easy' ? '🟢 Dễ' : q.difficulty === 'medium' ? '🟡 Trung bình' : '🔴 Khó'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                </ul>
              ) : (
                <div className="no-questions-chapter">
                  <p>😞 Không có câu hỏi nào trong chapter này</p>
                </div>
              )}
            </div>

            <div className="chapter-popup-footer">
              <span className="total-count">Tổng số: {globalQuestions.filter(q => q.chapter === selectedChapterView).length}</span>
              <button className="btn-close-chapter" onClick={() => setSelectedChapterView(null)}>✓ Đóng</button>
            </div>
          </div>
        </div>
      )}
      {editingQuestion && (
  <div className="chapter-popup-overlay">
    <div className="chapter-popup-content">
      <div className="chapter-popup-header">
        <h3>✏️ Chỉnh sửa câu hỏi</h3>
        <button onClick={() => setEditingQuestion(null)}>✕</button>
      </div>

      <div className="chapter-popup-body">

        {/* CÂU HỎI */}
        <div className="form-group">
          <label>Câu hỏi</label>
          <textarea
            rows={3}
            value={editingQuestion.questionText}
            onChange={(e) =>
              setEditingQuestion({
                ...editingQuestion,
                questionText: e.target.value,
              })
            }
          />
        </div>

        {/* SINGLE / MULTIPLE */}
        {(editingQuestion.type === "single" ||
          editingQuestion.type === "multiple") && (
          <div className="form-group">
            <label>Các đáp án</label>

            {editingQuestion.options.map((opt, i) => (
              <div key={i} className="option-input">
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => {
                    const opts = [...editingQuestion.options];
                    opts[i] = e.target.value;
                    setEditingQuestion({
                      ...editingQuestion,
                      options: opts,
                    });
                  }}
                />

                {editingQuestion.type === "single" ? (
                  <input
                    type="radio"
                    name="correct-answer"
                    checked={editingQuestion.correctAnswer === i}
                    onChange={() =>
                      setEditingQuestion({
                        ...editingQuestion,
                        correctAnswer: i,
                      })
                    }
                  />
                ) : (
                  <input
                    type="checkbox"
                    checked={(editingQuestion.multipleCorrectAnswers || []).includes(i)}
                    onChange={() => {
                      const current = editingQuestion.multipleCorrectAnswers || [];
                      const updated = current.includes(i)
                        ? current.filter(x => x !== i)
                        : [...current, i];

                      setEditingQuestion({
                        ...editingQuestion,
                        multipleCorrectAnswers: updated,
                      });
                    }}
                  />
                )}

                <button
                  className="btn-delete"
                  onClick={() => {
                    const opts = editingQuestion.options.filter((_, idx) => idx !== i);
                    const correct =
                      editingQuestion.type === "single"
                        ? (editingQuestion.correctAnswer === i ? 0 : editingQuestion.correctAnswer)
                        : editingQuestion.multipleCorrectAnswers?.filter(x => x !== i);

                    setEditingQuestion({
                      ...editingQuestion,
                      options: opts,
                      correctAnswer: correct,
                      multipleCorrectAnswers: correct,
                    });
                  }}
                >
                  🗑️
                </button>
              </div>
            ))}

            <button
              onClick={() =>
                setEditingQuestion({
                  ...editingQuestion,
                  options: [...editingQuestion.options, ""],
                })
              }
            >
              ➕ Thêm đáp án
            </button>
          </div>
        )}

        {/* TEXT */}
        {editingQuestion.type === "text" && (
          <div className="form-group">
            <label>Từ khóa</label>

            {(editingQuestion.keywords || []).map((kw, i) => (
              <div key={i} className="option-input">
                <input
                  value={kw}
                  onChange={(e) => {
                    const kws = [...editingQuestion.keywords];
                    kws[i] = e.target.value;
                    setEditingQuestion({
                      ...editingQuestion,
                      keywords: kws,
                    });
                  }}
                />
                <button
                  className="btn-delete"
                  onClick={() => {
                    const kws = editingQuestion.keywords.filter((_, idx) => idx !== i);
                    setEditingQuestion({
                      ...editingQuestion,
                      keywords: kws,
                    });
                  }}
                >
                  🗑️
                </button>
              </div>
            ))}

            <button
              onClick={() =>
                setEditingQuestion({
                  ...editingQuestion,
                  keywords: [...(editingQuestion.keywords || []), ""],
                })
              }
            >
              ➕ Thêm từ khóa
            </button>

            <label className="checkbox">
              <input
                type="checkbox"
                checked={editingQuestion.caseSensitive || false}
                onChange={(e) =>
                  setEditingQuestion({
                    ...editingQuestion,
                    caseSensitive: e.target.checked,
                  })
                }
              />
              Phân biệt hoa/thường
            </label>
          </div>
        )}

        {/* GIẢI THÍCH */}
        <div className="form-group">
          <label>Giải thích</label>
          <textarea
            rows={2}
            value={editingQuestion.explanation || ""}
            onChange={(e) =>
              setEditingQuestion({
                ...editingQuestion,
                explanation: e.target.value,
              })
            }
          />
        </div>

      </div>

      <div className="chapter-popup-footer">
        <button onClick={handleUpdateQuestion}>💾 Lưu</button>
        <button onClick={() => setEditingQuestion(null)}>Hủy</button>
      </div>
    </div>
  </div>
)}


    </div>
  );
}