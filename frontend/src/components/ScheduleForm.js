import React, { useEffect, useState } from "react";

export default function ScheduleForm({ ownerType, ownerId, onSaveSuccess }) {
  const [enabled, setEnabled] = useState(false);
  const [openAt, setOpenAt] = useState("");
  const [closeAt, setCloseAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const token = localStorage.getItem("token");

  // Hàm chuyển ISO datetime sang datetime-local format (YYYY-MM-DDTHH:mm)
  const formatDatetime = (isoDate) => {
    if (!isoDate) return "";
    try {
      const date = new Date(isoDate);
      const offset = date.getTimezoneOffset() * 60000;
      const localDate = new Date(date.getTime() - offset);
      return localDate.toISOString().slice(0, 16);
    } catch (e) {
      console.error("Error formatting date:", e);
      return "";
    }
  };

  // Load schedule hiện tại
  useEffect(() => {
    if (!ownerType || !ownerId || !token) return;

    setInitialLoading(true);
    setError("");

    const fetchSchedule = async () => {
      try {
        console.log(`📥 Fetching schedule: ${ownerType}/${ownerId}`);
        
        const res = await fetch(
          `${process.env.REACT_APP_API_URL}/schedules/${ownerType}/${ownerId}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        const data = await res.json();
        console.log("📦 Schedule data received:", data);

        if (data.success && data.schedule) {
          console.log("✅ Schedule found, setting form data");
          setEnabled(true);
          setOpenAt(formatDatetime(data.schedule.openAt) || "");
          setCloseAt(formatDatetime(data.schedule.closeAt) || "");
        } else {
          console.log("ℹ️ No schedule found, will create new one");
          setEnabled(false);
          setOpenAt("");
          setCloseAt("");
        }
      } catch (err) {
        console.error("❌ Error fetching schedule:", err);
        setError("Không thể tải lịch");
      } finally {
        setInitialLoading(false);
      }
    };

    fetchSchedule();
  }, [ownerType, ownerId, token]);

  // Validate dates
  const validateDates = () => {
    setError("");

    if (!enabled) {
      return true;
    }

    if (openAt && closeAt) {
      const open = new Date(openAt);
      const close = new Date(closeAt);

      if (open >= close) {
        setError("❌ Thời gian mở phải sớm hơn thời gian đóng");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    setError("");
    setSuccess("");

    if (!validateDates()) {
      return;
    }

    setLoading(true);
    console.log("💾 Saving schedule...");

    try {
      const payload = {
        ownerType,
        ownerId,
        openAt: enabled && openAt ? new Date(openAt).toISOString() : null,
        closeAt: enabled && closeAt ? new Date(closeAt).toISOString() : null
      };

      console.log("📤 Sending payload:", payload);

      const res = await fetch(`${process.env.REACT_APP_API_URL}/schedules`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      console.log("📥 Server response:", data);

      if (data.success) {
        console.log("✅ Schedule saved successfully");
        setSuccess("✅ Lưu lịch thành công");

        // Gọi callback sau 1 giây
        setTimeout(() => {
          if (onSaveSuccess && typeof onSaveSuccess === "function") {
            console.log("🔄 Calling onSaveSuccess callback");
            onSaveSuccess();
          }
        }, 1000);
      } else {
        setError(`❌ ${data.message || "Lỗi khi lưu lịch"}`);
      }
    } catch (err) {
      console.error("❌ Fetch error:", err);
      setError("❌ Lỗi kết nối server");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div style={{ padding: "20px", textAlign: "center", color: "#666" }}>
        ⏳ Đang tải dữ liệu lịch...
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "20px",
        border: "1px solid #ddd",
        borderRadius: "8px",
        backgroundColor: "#fff"
      }}
    >
      <h3 style={{ marginTop: 0 }}>⏰ Quản lý lịch thời gian</h3>

      {error && (
        <div
          style={{
            backgroundColor: "#ffebee",
            color: "#d32f2f",
            padding: "12px",
            borderRadius: "4px",
            marginBottom: "15px",
            fontSize: "14px"
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            backgroundColor: "#e8f5e9",
            color: "#388e3c",
            padding: "12px",
            borderRadius: "4px",
            marginBottom: "15px",
            fontSize: "14px"
          }}
        >
          {success}
        </div>
      )}

      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "20px",
          cursor: "pointer",
          fontSize: "15px",
          fontWeight: "500"
        }}
      >
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          style={{ width: "18px", height: "18px", cursor: "pointer" }}
        />
        <span>Giới hạn thời gian truy cập</span>
      </label>

      {enabled && (
        <div
          style={{
            backgroundColor: "#f5f5f5",
            padding: "15px",
            borderRadius: "6px",
            marginBottom: "20px"
          }}
        >
          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "500",
                fontSize: "14px"
              }}
            >
              📅 Mở từ:
            </label>
            <input
              type="datetime-local"
              value={openAt}
              onChange={(e) => setOpenAt(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "4px",
                border: "1px solid #ccc",
                fontSize: "14px",
                boxSizing: "border-box"
              }}
            />
            <small style={{ color: "#666", marginTop: "4px", display: "block" }}>
              (Để trống = mở ngay từ đầu)
            </small>
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "500",
                fontSize: "14px"
              }}
            >
              🚪 Đóng lúc:
            </label>
            <input
              type="datetime-local"
              value={closeAt}
              onChange={(e) => setCloseAt(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "4px",
                border: "1px solid #ccc",
                fontSize: "14px",
                boxSizing: "border-box"
              }}
            />
            <small style={{ color: "#666", marginTop: "4px", display: "block" }}>
              (Để trống = không đóng)
            </small>
          </div>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          width: "100%",
          padding: "12px 20px",
          backgroundColor: loading ? "#ccc" : "#1976d2",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.6 : 1,
          fontWeight: "bold",
          fontSize: "14px",
          transition: "background-color 0.3s"
        }}
        onMouseEnter={(e) => {
          if (!loading) e.target.style.backgroundColor = "#1565c0";
        }}
        onMouseLeave={(e) => {
          if (!loading) e.target.style.backgroundColor = "#1976d2";
        }}
      >
        {loading ? "⏳ Đang lưu..." : "💾 Lưu lịch"}
      </button>
    </div>
  );
}