import React, { useState, useEffect } from "react";
import "./EnrollSettings.css";

export default function EnrollmentPanel({ courseId, token, enrollmentCode, enrollmentMode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("settings"); // settings | pending
  const [enrollmentModeState, setEnrollmentModeState] = useState(enrollmentMode || "auto");
  const [codeState, setCodeState] = useState(enrollmentCode || "");
  const [codeDisabled, setCodeDisabled] = useState(false);
  const [pendingStudents, setPendingStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && activeTab === "pending") {
      fetchPendingStudents();
    }
  }, [isOpen, activeTab, courseId, token]);

  const fetchPendingStudents = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/courses/${courseId}/pending-students`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.success) setPendingStudents(data.pendingStudents);
    } catch (err) {
      console.error("Fetch pending students error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeMode = async (mode) => {
    setLoading(true);
    try {
      const res = await fetch(
       `${process.env.REACT_APP_API_URL}/courses/${courseId}/enrollment-mode`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ enrollmentMode: mode }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        setEnrollmentModeState(mode);
        alert(data.message);
      } else {
        alert(`❌ ${data.message}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateCode = async () => {
    if (!window.confirm("⚠️ Mã code cũ sẽ không còn dùng được. Tiếp tục?")) return;

    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/courses/${courseId}/regenerate-code`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const data = await res.json();
      if (res.ok) {
        setCodeState(data.enrollmentCode);
        alert(data.message);
      } else {
        alert(`❌ ${data.message}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCode = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/courses/${courseId}/disable-code`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const data = await res.json();
      if (res.ok) {
        setCodeDisabled(data.codeDisabled);
        alert(data.message);
      } else {
        alert(`❌ ${data.message}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (pending) => {
    const studentId = pending.studentId?._id || pending.studentId;
    if (!window.confirm(`Duyệt ${pending.studentName}?`)) return;

    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/courses/${courseId}/pending-students/${studentId}/approve`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        fetchPendingStudents();
      } else {
        alert(`❌ ${data.message}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (pending) => {
    const studentId = pending.studentId?._id || pending.studentId;
    if (!window.confirm(`Từ chối ${pending.studentName}?`)) return;

    setLoading(true);
    try {
      const res = await fetch(
       `${process.env.REACT_APP_API_URL}
       /courses/${courseId}/pending-students/${studentId}/reject`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        fetchPendingStudents();
      } else {
        alert(`❌ ${data.message}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(codeState);
    alert("✅ Đã sao chép mã code!");
  };

  return (
    <>
      {/* BUTTON */}
      <button
        className="enrollment-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
      >
        🔧 Quản lý tham gia
      </button>

      {/* MODAL */}
      {isOpen && (
        <div className="enrollment-modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="enrollment-modal" onClick={(e) => e.stopPropagation()}>
            {/* HEADER */}
            <div className="enrollment-header">
              <h2>⚙️ Quản lý tham gia khóa học</h2>
              <button className="close-btn" onClick={() => setIsOpen(false)}>
                ✖️
              </button>
            </div>

            {/* TABS */}
            <div className="enrollment-tabs">
              <button
                className={`tab-btn ${activeTab === "settings" ? "active" : ""}`}
                onClick={() => setActiveTab("settings")}
              >
                🔑 Cài đặt Code
              </button>
              <button
                className={`tab-btn ${activeTab === "pending" ? "active" : ""}`}
                onClick={() => setActiveTab("pending")}
              >
                📋 Chờ duyệt ({pendingStudents.length})
              </button>
            </div>

            {/* CONTENT */}
            <div className="enrollment-content">
              {/* SETTINGS TAB */}
              {activeTab === "settings" && (
                <>
                  {/* ENROLLMENT MODE */}
                  <div className="settings-section">
                    <h3>📋 Chế độ tham gia</h3>
                    <div className="mode-options">
                      <div
                        className={`mode-card ${enrollmentModeState === "auto" ? "active" : ""}`}
                        onClick={() => handleChangeMode("auto")}
                      >
                        <div className="mode-icon">⚡</div>
                        <h4>Tự động (Auto)</h4>
                        <p>Join ngay lập tức</p>
                      </div>

                      <div
                        className={`mode-card ${enrollmentModeState === "manual" ? "active" : ""}`}
                        onClick={() => handleChangeMode("manual")}
                      >
                        <div className="mode-icon">📋</div>
                        <h4>Duyệt (Manual)</h4>
                        <p>Chờ phê duyệt</p>
                      </div>
                    </div>
                  </div>

                  {/* ENROLLMENT CODE */}
                  <div className="settings-section">
                    <h3>🔑 Mã tham gia</h3>
                    <div className="code-display">
                      <div className="code-box">
                        <span className="code-text">{codeState}</span>
                        <button
                          className="copy-btn"
                          onClick={copyToClipboard}
                          title="Sao chép"
                        >
                          📋
                        </button>
                      </div>
                    </div>

                    <div className="code-actions">
                      <button
                        className="action-btn regenerate"
                        onClick={handleRegenerateCode}
                        disabled={loading}
                      >
                        🔄 Tạo mã mới
                      </button>
                      <button
                        className={`action-btn ${codeDisabled ? "disabled" : ""}`}
                        onClick={handleToggleCode}
                        disabled={loading}
                      >
                        {codeDisabled ? "🔒 Kích hoạt" : "🔓 Vô hiệu"}
                      </button>
                    </div>

                    {codeDisabled && (
                      <div className="warning-box">
                        ⚠️ Mã code đã bị vô hiệu hóa
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* PENDING TAB */}
              {activeTab === "pending" && (
                <div className="pending-section">
                  {loading ? (
                    <p className="text-center">⏳ Đang tải...</p>
                  ) : pendingStudents.length === 0 ? (
                    <p className="text-center empty-message">✅ Không có yêu cầu chờ duyệt</p>
                  ) : (
                    <div className="pending-list">
                      {pendingStudents.map((pending, idx) => (
                        <div key={pending._id || idx} className="pending-item">
                          <div className="pending-info">
                            <p className="student-name">👤 {pending.studentName}</p>
                            <p className="student-email">📧 {pending.studentEmail}</p>
                            <p className="requested-time">
                              ⏰ {new Date(pending.requestedAt).toLocaleDateString("vi-VN")}
                            </p>
                          </div>
                          <div className="pending-actions">
                            <button
                              className="btn-approve"
                              onClick={() => handleApprove(pending)}
                              disabled={loading}
                            >
                              ✅
                            </button>
                            <button
                              className="btn-reject"
                              onClick={() => handleReject(pending)}
                              disabled={loading}
                            >
                              ❌
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}