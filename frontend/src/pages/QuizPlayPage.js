import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import QuizPlayView from "../components/QuizPlayView";

export default function QuizPlayPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  // LOAD QUIZ
  useEffect(() => {
    const loadQuiz = async () => {
      const res = await fetch(
        `http://localhost:5000/api/quiz/${quizId}/play`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || "Không thể mở quiz");
        navigate(-1);
        return;
      }

      setSelectedQuiz(data.quiz);
      setTimeLeft(
        data.quiz.timeLimit
          ? data.quiz.timeLimit * 60
          : data.quiz.questions.length * 30
      );
    };

    loadQuiz();
  }, [quizId, token, navigate]);

  // SUBMIT
  const handleSubmit = useCallback(async () => {
    const res = await fetch(
      `http://localhost:5000/api/quiz/submit/${selectedQuiz._id}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ answers }),
      }
    );

    const data = await res.json();
    if (data.success) {
      setScore(`${data.correct}/${data.total}`);
      setSubmitted(true);
    } else {
      alert(data.error || "Lỗi nộp bài");
    }
  }, [selectedQuiz, answers, token]);

  // TIMER
  useEffect(() => {
    if (!selectedQuiz || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [selectedQuiz, timeLeft, handleSubmit]);

  if (!selectedQuiz) return <p>⏳ Đang tải quiz...</p>;

  return (
    <QuizPlayView
      selectedQuiz={selectedQuiz}
      timeLeft={timeLeft}
      handleSubmit={handleSubmit}
      setSelectedQuiz={() => navigate(-1)}
      setAnswers={setAnswers}
      setScore={setScore}
      setSubmitted={setSubmitted}
      answers={answers}
      submitted={submitted}
      score={score}
      token={token}
    />
  );
}
