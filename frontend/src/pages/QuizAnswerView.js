import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function QuizAnswerView() {
  const { quizId } = useParams();
  const token = localStorage.getItem("token");
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(`http://localhost:5000/api/quiz/${quizId}/answers`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(res => {
        if (res.success) setData(res);
        else alert(res.message);
      });
  }, [quizId]);

  if (!data) return <p>⏳ Đang tải đáp án...</p>;

  return (
    <div className="quiz-answer-view">
      <h2>📘 Đáp án – {data.quizTitle}</h2>

     {data.answers.map((q, idx) => (
  <div key={q.questionId} className="answer-block">
    <h4>{idx + 1}. {q.questionText}</h4>

    {/* ===== SINGLE / MULTIPLE ===== */}
    {(q.type === "single" || q.type === "multiple") && (
      <ul>
        {q.options.map((opt, i) => {
          const isCorrect =
            q.type === "multiple"
              ? q.correctAnswer.includes(i)
              : q.correctAnswer === i;

          return (
            <li
              key={i}
              style={{
                color: isCorrect ? "green" : "",
                fontWeight: isCorrect ? "bold" : "normal",
              }}
            >
              {opt}
            </li>
          );
        })}
      </ul>
    )}

    {/* ===== TEXT ===== */}
    {q.type === "text" && (
      <div className="text-answer">
        <p>
          ✅ <strong>Từ khóa chấp nhận:</strong>{" "}
          {q.keywords && q.keywords.length > 0
            ? q.keywords.join(", ")
            : "Không có"}
        </p>
      </div>
    )}

    {/* ===== EXPLANATION ===== */}
    {q.explanation && (
      <div className="explanation">
        💡 <strong>Giải thích:</strong> {q.explanation}
      </div>
    )}
  </div>
))}

    </div>
  );
}
