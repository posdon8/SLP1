import React, { useState, useEffect } from "react";
import ScheduleForm from "../ScheduleForm";

const API_URL = "http://localhost:5000/api";

export default function CodeSettingsModal({
  exercise,
  token,
  onClose,
  onSaveSuccess,
}) {
  const [activeTab, setActiveTab] = useState("status");
  const [status, setStatus] = useState(exercise?.status || "draft");
  const [maxAttempts, setMaxAttempts] = useState(exercise?.maxAttempts || 0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // ✅ Save status & attempts
  const handleSave = async () => {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(`${API_URL}/exercises/${exercise._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status,
          maxAttempts: parseInt(maxAttempts),
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage("✅ Lưu thành công!");
        setTimeout(() => {
          onSaveSuccess();
          onClose();
        }, 1500);
      } else {
        setMessage("❌ " + (data.message || "Lỗi khi lưu"));
      }
    } catch (err) {
      console.error("Error:", err);
      setMessage("❌ Lỗi kết nối server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "8px",
          maxWidth: "600px",
          width: "90%",
          maxHeight: "80vh",
          overflowY: "auto",
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "20px",
            borderBottom: "1px solid #eee",
            position: "sticky",
            top: 0,
            backgroundColor: "white",
          }}
        >
          <h2 style={{ margin: 0 }}>⚙️ Cấu hình bài tập</h2>
          <button
            onClick={onClose}
            style={{
              backgroundColor: "transparent",
              border: "none",
              fontSize: "24px",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid #eee",
            backgroundColor: "#f5f5f5",
          }}
        >
          <button
            onClick={() => setActiveTab("status")}
            style={{
              flex: 1,
              padding: "12px",
              border: "none",
              backgroundColor: activeTab === "status" ? "white" : "transparent",
              borderBottom:
                activeTab === "status" ? "3px solid #2196F3" : "none",
              color: activeTab === "status" ? "#2196F3" : "#666",
              cursor: "pointer",
              fontWeight: activeTab === "status" ? "bold" : "normal",
            }}
          >
            📌 Trạng thái
          </button>
          <button
            onClick={() => setActiveTab("attempts")}
            style={{
              flex: 1,
              padding: "12px",
              border: "none",
              backgroundColor:
                activeTab === "attempts" ? "white" : "transparent",
              borderBottom:
                activeTab === "attempts" ? "3px solid #2196F3" : "none",
              color: activeTab === "attempts" ? "#2196F3" : "#666",
              cursor: "pointer",
              fontWeight: activeTab === "attempts" ? "bold" : "normal",
            }}
          >
            🔄 Số lần làm
          </button>
          <button
            onClick={() => setActiveTab("schedule")}
            style={{
              flex: 1,
              padding: "12px",
              border: "none",
              backgroundColor:
                activeTab === "schedule" ? "white" : "transparent",
              borderBottom:
                activeTab === "schedule" ? "3px solid #2196F3" : "none",
              color: activeTab === "schedule" ? "#2196F3" : "#666",
              cursor: "pointer",
              fontWeight: activeTab === "schedule" ? "bold" : "normal",
            }}
          >
            ⏰ Lịch
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "20px" }}>
          {/* Status Tab */}
          {activeTab === "status" && (
            <div>
              <h3>📌 Trạng thái bài tập</h3>
              <p style={{ color: "#666", marginBottom: "16px" }}>
                Chọn trạng thái để kiểm soát visibility của bài tập
              </p>

              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "12px",
                    border: "2px solid #ddd",
                    borderRadius: "4px",
                    cursor: "pointer",
                    marginBottom: "10px",
                    backgroundColor: status === "draft" ? "#f5f5f5" : "white",
                    borderColor: status === "draft" ? "#2196F3" : "#ddd",
                  }}
                >
                  <input
                    type="radio"
                    name="status"
                    value="draft"
                    checked={status === "draft"}
                    onChange={(e) => setStatus(e.target.value)}
                    style={{ marginRight: "12px", cursor: "pointer" }}
                  />
                  <div>
                    <strong>📝 Draft (Nháp)</strong>
                    <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#666" }}>
                      Chỉ teacher thấy được
                    </p>
                  </div>
                </label>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "12px",
                    border: "2px solid #ddd",
                    borderRadius: "4px",
                    cursor: "pointer",
                    backgroundColor: status === "published" ? "#f5f5f5" : "white",
                    borderColor: status === "published" ? "#2196F3" : "#ddd",
                  }}
                >
                  <input
                    type="radio"
                    name="status"
                    value="published"
                    checked={status === "published"}
                    onChange={(e) => setStatus(e.target.value)}
                    style={{ marginRight: "12px", cursor: "pointer" }}
                  />
                  <div>
                    <strong>✅ Published (Công khai)</strong>
                    <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#666" }}>
                      Student có thể xem và làm bài
                    </p>
                  </div>
                </label>
              </div>

              {message && (
                <div
                  style={{
                    padding: "12px",
                    backgroundColor: message.includes("✅") ? "#e8f5e9" : "#ffebee",
                    color: message.includes("✅") ? "#388e3c" : "#d32f2f",
                    borderRadius: "4px",
                    marginBottom: "16px",
                    fontSize: "14px",
                  }}
                >
                  {message}
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px",
                  backgroundColor: loading ? "#ccc" : "#4CAF50",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontWeight: "bold",
                }}
              >
                {loading ? "⏳ Đang lưu..." : "💾 Lưu trạng thái"}
              </button>
            </div>
          )}

          {/* Attempts Tab */}
          {activeTab === "attempts" && (
            <div>
              <h3>🔄 Giới hạn số lần làm</h3>
              <p style={{ color: "#666", marginBottom: "16px" }}>
                Nhập số lần tối đa student được nộp bài (0 = vô hạn)
              </p>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
                  Số lần làm tối đa:
                </label>
                <input
                  type="number"
                  min="0"
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(Math.max(0, parseInt(e.target.value) || 0))}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
                <small style={{ color: "#666", marginTop: "8px", display: "block" }}>
                  💡 Mặc định: 0 = Không giới hạn
                </small>
              </div>

              <div
                style={{
                  padding: "12px",
                  backgroundColor: "#e3f2fd",
                  borderRadius: "4px",
                  marginBottom: "16px",
                  fontSize: "13px",
                  color: "#1565c0",
                }}
              >
                <strong>ℹ️ Thông tin:</strong> Nếu set giới hạn, student sẽ thấy "Số lần còn lại"
                trong danh sách bài tập
              </div>

              {message && (
                <div
                  style={{
                    padding: "12px",
                    backgroundColor: message.includes("✅") ? "#e8f5e9" : "#ffebee",
                    color: message.includes("✅") ? "#388e3c" : "#d32f2f",
                    borderRadius: "4px",
                    marginBottom: "16px",
                    fontSize: "14px",
                  }}
                >
                  {message}
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px",
                  backgroundColor: loading ? "#ccc" : "#4CAF50",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontWeight: "bold",
                }}
              >
                {loading ? "⏳ Đang lưu..." : "💾 Lưu giới hạn"}
              </button>
            </div>
          )}

          {/* Schedule Tab */}
          {activeTab === "schedule" && (
            <div>
              <h3>⏰ Lên lịch mở/đóng bài tập</h3>
              <p style={{ color: "#666", marginBottom: "16px" }}>
                Thiết lập thời gian student được truy cập bài tập
              </p>
              <ScheduleForm
                ownerType="code"
                ownerId={exercise._id}
                onSaveSuccess={() => {
                  setTimeout(() => {
                    onSaveSuccess();
                    onClose();
                  }, 1000);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}