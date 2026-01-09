import React, { useState, useEffect } from "react";

export default function MiniCalendar({ courseId, token }) {
  const [events, setEvents] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayEvents, setDayEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !courseId) return;

    // Fetch all events và filter cho course này
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${process.env.REACT_APP_API_URL}/schedules/calendar/all`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.success && Array.isArray(data.schedules)) {
          console.log("📅 All schedules:", data.schedules);
          console.log("🎯 Current courseId:", courseId);

          // ✅ Filter events cho course này - hỗ trợ course, quiz, code
          const courseEvents = data.schedules.filter(ev => {
            // Nếu là course, kiểm tra ownerId
            if (ev.type === "course") {
              const match = ev.ownerId === courseId;
              if (match) console.log("✅ Course event matched:", ev.title);
              return match;
            }
            
            // Nếu là quiz hoặc code, kiểm tra courseId
            if (ev.type === "quiz" || ev.type === "code") {
              const match = ev.courseId === courseId;
              if (match) console.log(`✅ ${ev.type} event matched:`, ev.title);
              return match;
            }
            
            return false;
          });

          console.log(`📊 Filtered ${courseEvents.length} events for course ${courseId}`);
          setEvents(courseEvents);
        }
      } catch (err) {
        console.error("❌ Error fetching events:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [token, courseId]);

  const normalizeDate = (d) => new Date(d).toDateString();

  // Get events for a specific day (cả openAt và closeAt)
  const getEventsForDay = (date) => {
    return events.filter(ev => {
      const dateStr = normalizeDate(date);
      
      // Check openAt
      if (ev.openAt && normalizeDate(new Date(ev.openAt)) === dateStr) {
        return true;
      }
      
      // Check closeAt
      if (ev.closeAt && normalizeDate(new Date(ev.closeAt)) === dateStr) {
        return true;
      }
      
      return false;
    });
  };

  // Check if day has events (cả openAt và closeAt)
  const hasEvents = (date) => {
    const dateStr = normalizeDate(date);
    return events.some(ev => {
      return (ev.openAt && normalizeDate(new Date(ev.openAt)) === dateStr) ||
             (ev.closeAt && normalizeDate(new Date(ev.closeAt)) === dateStr);
    });
  };

  // Generate calendar days
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleDateClick = (day) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    setSelectedDate(date);
    setDayEvents(getEventsForDay(date));
  };

  // ✅ Get icon và color theo type
  const getEventIcon = (type) => {
    switch (type) {
      case "course":
        return "📘";
      case "quiz":
        return "📝";
      case "code":
        return "💻";
      default:
        return "📌";
    }
  };

  const getEventColor = (type) => {
    switch (type) {
      case "course":
        return "#2196f3";
      case "quiz":
        return "#ff9800";
      case "code":
        return "#4CAF50";
      default:
        return "#666";
    }
  };

  if (loading) {
    return (
      <div style={{
        backgroundColor: "white",
        border: "1px solid #ddd",
        borderRadius: "8px",
        padding: "16px",
        maxWidth: "350px",
        textAlign: "center",
        color: "#999"
      }}>
        ⏳ Đang tải lịch...
      </div>
    );
  }

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const monthName = currentMonth.toLocaleString("vi-VN", { month: "long", year: "numeric" });

  // Create array of calendar days
  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  return (
    <div
      style={{
        backgroundColor: "white",
        border: "1px solid #a0a0a0ff",
        borderRadius: "8px",
        padding: "16px",
        maxWidth: "520px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px"
        }}
      >
        <button
          onClick={handlePrevMonth}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "24px"
          }}
        >
          ⬅
        </button>
        <h4 style={{ margin: 0, fontSize: "18px", fontWeight: "bold" }}>
          📅 {monthName}
        </h4>
        <button
          onClick={handleNextMonth}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "24px"
          }}
        >
          ➡
        </button>
      </div>

      {/* Weekday headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "2px",
          marginBottom: "8px"
        }}
      >
        {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((day) => (
          <div
            key={day}
            style={{
              textAlign: "center",
              fontSize: "11px",
              fontWeight: "bold",
              color: "#666",
              padding: "4px"
            }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "2px",
          marginBottom: "12px"
        }}
      >
        {calendarDays.map((day, idx) => {
          const isEvent = day && hasEvents(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
          const isSelected = day && selectedDate && normalizeDate(selectedDate) === normalizeDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));

          return (
            <button
              key={idx}
              onClick={() => day && handleDateClick(day)}
              style={{
                padding: "6px",
                border: isSelected ? "2px solid #1976d2" : "1px solid #eee",
                borderRadius: "4px",
                backgroundColor: isSelected ? "#e3f2fd" : isEvent ? "#fff9c4" : "white",
                cursor: day ? "pointer" : "default",
                fontSize: "12px",
                fontWeight: isEvent ? "bold" : "normal",
                color: isEvent ? "#ff9800" : "#333",
                position: "relative"
              }}
            >
              {day}
              {isEvent && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "1px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "4px",
                    height: "4px",
                    backgroundColor: "#ff9800",
                    borderRadius: "50%"
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Events for selected day */}
      {selectedDate && (
        <div style={{ borderTop: "1px solid #eee", paddingTop: "12px" }}>
          <h5 style={{ margin: "0 0 8px 0", fontSize: "12px", color: "#666" }}>
            📌 {selectedDate.toLocaleDateString("vi-VN")}
          </h5>

          {dayEvents.length === 0 ? (
            <p style={{ margin: 0, fontSize: "12px", color: "#999" }}>
              Không có sự kiện
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {dayEvents.map((ev) => {
                const dateStr = normalizeDate(selectedDate);
                const isOpenAt = ev.openAt && normalizeDate(new Date(ev.openAt)) === dateStr;
                const isCloseAt = ev.closeAt && normalizeDate(new Date(ev.closeAt)) === dateStr;
                const eventColor = getEventColor(ev.type);
                const eventIcon = getEventIcon(ev.type);

                return (
                  <div
                    key={`${ev.id}-${isOpenAt ? 'open' : 'close'}`}
                    style={{
                      backgroundColor: isOpenAt ? "#e8f5e9" : "#ffebee",
                      padding: "8px",
                      borderRadius: "4px",
                      fontSize: "11px",
                      borderLeft: `3px solid ${eventColor}`
                    }}
                  >
                    <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
                      {eventIcon} {ev.title}
                    </div>

                    {/* ✅ Show type badge */}
                    <div style={{
                      display: "inline-block",
                      padding: "2px 6px",
                      backgroundColor: eventColor,
                      color: "white",
                      borderRadius: "3px",
                      fontSize: "9px",
                      fontWeight: "bold",
                      marginBottom: "4px",
                      marginRight: "6px"
                    }}>
                      {ev.type === "course" ? "Khóa học" : ev.type === "quiz" ? "Quiz" : "Bài tập"}
                    </div>
                    
                    {/* Show which action this is */}
                    {isOpenAt && (
                      <div style={{ color: "#4caf50", fontSize: "10px", fontWeight: "bold" }}>
                        🟢 MỞ LÀM BÀI
                      </div>
                    )}
                    {isCloseAt && (
                      <div style={{ color: "#f44336", fontSize: "10px", fontWeight: "bold" }}>
                        🔴 HẾT HẠN
                      </div>
                    )}
                    
                    {/* Show time */}
                    {isOpenAt && ev.openAt && (
                      <div style={{ color: "#666", fontSize: "10px", marginTop: "2px" }}>
                        Lúc: {new Date(ev.openAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    )}
                    {isCloseAt && ev.closeAt && (
                      <div style={{ color: "#666", fontSize: "10px", marginTop: "2px" }}>
                        Lúc: {new Date(ev.closeAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div
        style={{
          marginTop: "12px",
          paddingTop: "12px",
          borderTop: "1px solid #eee",
          fontSize: "11px",
          color: "#999",
          textAlign: "center"
        }}
      >
        {events.length > 0 ? (
          <>
            <div>{events.length} sự kiện</div>
            <div style={{ fontSize: "10px", marginTop: "4px" }}>
              {events.filter(e => e.type === "course").length > 0 && (
                <span> {events.filter(e => e.type === "course").length} Khóa học | </span>
              )}
              {events.filter(e => e.type === "quiz").length > 0 && (
                <span> {events.filter(e => e.type === "quiz").length} Quiz | </span>
              )}
              {events.filter(e => e.type === "code").length > 0 && (
                <span> {events.filter(e => e.type === "code").length} Bài tập | </span>
              )}
              <br />
              🟢 {events.filter(e => e.openAt).length} mở | 
              🔴 {events.filter(e => e.closeAt).length} đóng
            </div>
          </>
        ) : (
          "Không có sự kiện nào"
        )}
      </div>
    </div>
  );
}