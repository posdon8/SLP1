import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./CalendarPage.css";

export default function CalendarPage() {
  const navigate = useNavigate();
  const [date, setDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");

  // Lấy lịch từ backend
  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        setLoading(true);
        const res = await fetch("http://localhost:5000/api/schedules/calendar/all", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        console.log("✅ Events loaded:", data.schedules);
        if (data.success) setEvents(data.schedules);
      } catch (err) {
        console.error("❌ Lỗi lấy lịch:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedules();
  }, [token]);

  const normalizeDate = (d) => new Date(d).toDateString();

  // Lọc event theo ngày - dùng openAt hoặc closeAt
  const getEventsForDay = (dayDate) => {
    return events.filter((ev) => {
      if (ev.openAt) {
        const eventStartDate = normalizeDate(new Date(ev.openAt));
        if (eventStartDate === normalizeDate(dayDate)) return true;
      }
      if (ev.closeAt) {
        const eventEndDate = normalizeDate(new Date(ev.closeAt));
        if (eventEndDate === normalizeDate(dayDate)) return true;
      }
      return false;
    });
  };

  const eventsOfDay = selectedDate ? getEventsForDay(selectedDate) : [];

  // Trạng thái Open / Upcoming / Closed
  const getStatus = (ev) => {
    if (!ev.openAt || !ev.closeAt) return "Always Open";
    const now = new Date();
    if (now < new Date(ev.openAt)) return "Upcoming";
    if (now > new Date(ev.closeAt)) return "Closed";
    return "Open";
  };

  // Hiển thị tag (chấm hoặc số) dưới ngày có event
  const tileContent = ({ date, view }) => {
    if (view !== "month") return null;

    const dayEvents = getEventsForDay(date);
    if (dayEvents.length === 0) return null;

    // Nếu 1 event → 1 chấm, nếu > 1 → hiển thị số
    if (dayEvents.length === 1) {
      return (
        <div className="dot-container">
          <div className="dot-item"></div>
        </div>
      );
    }

    return (
      <div className="event-count-badge">
        {dayEvents.length}
      </div>
    );
  };

  // Chuyển tới course/quiz
  // CalendarPage.js
const handleGoToContent = (ev) => {
  if (ev.type === "course") {
    navigate(`/course/${ev.ownerId}`);
  } else if (ev.type === "quiz" && ev.courseId) {
    // Navigate về course, user sẽ thấy ExerciseTab với quiz list
    navigate(`/course/${ev.courseId}`);
  } else {
    alert("⚠️ Không thể mở nội dung này");
  }
};

  return (
    <div className="calendar-page">
      <h2>📅 Lịch học & bài tập</h2>

      {loading ? (
        <p>⏳ Đang tải...</p>
      ) : (
        <Calendar
          value={date}
          onClickDay={(value) => setSelectedDate(value)}
          tileContent={tileContent}
        />
      )}

      {/* Popup chi tiết */}
      {selectedDate && (
        <div className="modal-overlay" onClick={() => setSelectedDate(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>📌 {selectedDate.toLocaleDateString("vi-VN")}</h3>

            <div className="modal-content">
              {eventsOfDay.length === 0 ? (
                <p>Không có hoạt động</p>
              ) : (
                eventsOfDay.map((ev) => (
                  <div key={ev.id} className="event-item">
                    <div className="event-header">
                      <span className={`badge ${ev.type}`}>
                        {ev.type === "quiz" ? "📝 Quiz" : "📘 Course"}
                      </span>
                      <span className={`status ${getStatus(ev).replace(" ", "")}`}>
                        {getStatus(ev)}
                      </span>
                    </div>
                    <h4>{ev.title}</h4>
                    {ev.openAt && (
                      <p className="time">
                        ⏰ {new Date(ev.openAt).toLocaleString("vi-VN")} → {" "}
                        {ev.closeAt
                          ? new Date(ev.closeAt).toLocaleString("vi-VN")
                          : "Không giới hạn"}
                      </p>
                    )}
                    <button onClick={() => handleGoToContent(ev)}>
                      Đi tới →
                    </button>
                  </div>
                ))
              )}
              
            </div>

            <button className="close-btn" onClick={() => setSelectedDate(null)}>
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}