import React, { useEffect, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./CalendarPopup.css";

export default function CalendarPopup({ token }) {
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          "http://localhost:5000/api/schedules/calendar/all",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await res.json();
        if (data.success) {
          console.log("📅 All events loaded:", data.schedules);
          setEvents(data.schedules);
        }
      } catch (err) {
        console.error("Error fetching schedules:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedules();
  }, [token]);

  const normalizeDate = (d) => new Date(d).toDateString();

  // ✅ Get events for a specific day
  const getEventsForDay = (dayDate) =>
    events.filter(
      (ev) =>
        (ev.openAt &&
          normalizeDate(new Date(ev.openAt)) ===
            normalizeDate(dayDate)) ||
        (ev.closeAt &&
          normalizeDate(new Date(ev.closeAt)) ===
            normalizeDate(dayDate))
    );

  // ✅ Get icon theo type
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

  // ✅ Get color theo type
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

  // ✅ Get label theo type
  const getEventLabel = (type) => {
    switch (type) {
      case "course":
        return "Khóa học";
      case "quiz":
        return "Quiz";
      case "code":
        return "Bài tập";
      default:
        return "Sự kiện";
    }
  };

  // ✅ Tile content - hiển thị dot nếu có events
  const tileContent = ({ date, view }) => {
    if (view !== "month") return null;
    const count = getEventsForDay(date).length;
    if (!count) return null;
    return (
      <div style={{ position: "relative", width: "100%" }}>
        <span
          className="calendar-dot"
          style={{
            position: "absolute",
            bottom: "2px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "4px",
            height: "4px",
            backgroundColor: "#ff9800",
            borderRadius: "50%",
            display: "inline-block"
          }}
        />
      </div>
    );
  };

  return (
    <div className="calendar-popup">
      {loading ? (
        <div style={{ padding: "20px", textAlign: "center", color: "#999" }}>
          ⏳ Đang tải lịch...
        </div>
      ) : (
        <>
          <Calendar
            onClickDay={(d) => setSelectedDate(d)}
            tileContent={tileContent}
          />

          {selectedDate && (
            <div className="calendar-events">
              <strong style={{
                display: "block",
                marginBottom: "12px",
                fontSize: "14px",
                color: "#333"
              }}>
                📅 {selectedDate.toLocaleDateString("vi-VN")}
              </strong>

              {getEventsForDay(selectedDate).length === 0 ? (
                <p style={{
                  margin: 0,
                  fontSize: "12px",
                  color: "#999"
                }}>
                  Không có hoạt động
                </p>
              ) : (
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px"
                }}>
                  {getEventsForDay(selectedDate).map((ev) => {
                    const dateStr = normalizeDate(selectedDate);
                    const isOpenAt = ev.openAt && normalizeDate(new Date(ev.openAt)) === dateStr;
                    const isCloseAt = ev.closeAt && normalizeDate(new Date(ev.closeAt)) === dateStr;
                    const color = getEventColor(ev.type);
                    const icon = getEventIcon(ev.type);
                    const label = getEventLabel(ev.type);

                    return (
                      <div
                        key={`${ev.id}-${isOpenAt ? 'open' : 'close'}`}
                        className="popup-event"
                        style={{
                          backgroundColor: isOpenAt ? "#e8f5e9" : "#ffebee",
                          padding: "10px",
                          borderRadius: "4px",
                          borderLeft: `3px solid ${color}`,
                          fontSize: "12px"
                        }}
                      >
                        <div style={{
                          fontWeight: "bold",
                          marginBottom: "6px",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px"
                        }}>
                          <span>{icon}</span>
                          <span>{ev.title}</span>
                        </div>

                        {/* ✅ Type badge */}
                        <div style={{
                          display: "inline-block",
                          padding: "2px 6px",
                          backgroundColor: color,
                          color: "white",
                          borderRadius: "3px",
                          fontSize: "10px",
                          fontWeight: "bold",
                          marginBottom: "6px",
                          marginRight: "6px"
                        }}>
                          {label}
                        </div>

                        {/* ✅ Action status */}
                        {isOpenAt && (
                          <div style={{
                            color: "#4caf50",
                            fontSize: "10px",
                            fontWeight: "bold",
                            marginBottom: "4px"
                          }}>
                            🟢 MỞ LÀM BÀI
                          </div>
                        )}
                        {isCloseAt && (
                          <div style={{
                            color: "#f44336",
                            fontSize: "10px",
                            fontWeight: "bold",
                            marginBottom: "4px"
                          }}>
                            🔴 HẾT HẠN
                          </div>
                        )}

                        {/* ✅ Time */}
                        {isOpenAt && ev.openAt && (
                          <div style={{
                            color: "#666",
                            fontSize: "10px"
                          }}>
                            Lúc: {new Date(ev.openAt).toLocaleTimeString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </div>
                        )}
                        {isCloseAt && ev.closeAt && (
                          <div style={{
                            color: "#666",
                            fontSize: "10px"
                          }}>
                            Lúc: {new Date(ev.closeAt).toLocaleTimeString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ✅ Stats */}
              <div style={{
                marginTop: "12px",
                paddingTop: "12px",
                borderTop: "1px solid #eee",
                fontSize: "11px",
                color: "#999"
              }}>
                <div style={{ marginBottom: "4px" }}>
                  📅 {getEventsForDay(selectedDate).length} sự kiện hôm nay
                </div>
              </div>
            </div>
          )}

          {/* ✅ Overall stats */}
          <div style={{
            marginTop: "12px",
            paddingTop: "12px",
            borderTop: "1px solid #ddd",
            fontSize: "11px",
            color: "#999",
            textAlign: "center"
          }}>
            {events.length > 0 ? (
              <>
                <div style={{ marginBottom: "4px" }}>
                  📅 Tổng: {events.length} sự kiện
                </div>
                <div style={{ fontSize: "10px" }}>
                  {events.filter(e => e.type === "course").length > 0 && (
                    <span style={{ marginRight: "8px" }}>📘 {events.filter(e => e.type === "course").length}</span>
                  )}
                  {events.filter(e => e.type === "quiz").length > 0 && (
                    <span style={{ marginRight: "8px" }}>📝 {events.filter(e => e.type === "quiz").length}</span>
                  )}
                  {events.filter(e => e.type === "code").length > 0 && (
                    <span style={{ marginRight: "8px" }}>💻 {events.filter(e => e.type === "code").length}</span>
                  )}
                </div>
              </>
            ) : (
              <div>Không có sự kiện nào</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}