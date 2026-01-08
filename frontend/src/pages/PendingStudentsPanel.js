import React, { useState, useEffect } from "react";
// import "./PendingStudentsPanel.css";

export default function PendingStudentsPanel({ courseId, token }) {
  const [pendingStudents, setPendingStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingStudents();
  }, [courseId, token]);

  const fetchPendingStudents = async () => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/courses/${courseId}/pending-students`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const data = await res.json();
      if (data.success) {
        setPendingStudents(data.pendingStudents);
      }
    } catch (err) {
      console.error("Fetch pending students error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (pending) => {
    // ⭐ Lấy ID từ object
    const studentId = pending.studentId?._id || pending.studentId;
    const studentName = pending.studentName;

    if (!window.confirm(`Bạn có chắc muốn duyệt ${studentName}?`)) return;

    try {
      const res = await fetch(
        `http://localhost:5000/api/courses/${courseId}/pending-students/${studentId}/approve`,
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
      alert("❌ Có lỗi xảy ra");
    }
  };

  const handleReject = async (pending) => {
    // ⭐ Lấy ID từ object
    const studentId = pending.studentId?._id || pending.studentId;
    const studentName = pending.studentName;

    if (!window.confirm(`Bạn có chắc muốn từ chối ${studentName}?`)) return;

    try {
      const res = await fetch(
        `http://localhost:5000/api/courses/${courseId}/pending-students/${studentId}/reject`,
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
      alert("❌ Có lỗi xảy ra");
    }
  };

  if (loading) {
    return <div className="pending-panel">⏳ Đang tải...</div>;
  }

  return (
    <div className="pending-panel">
      <h3>📋 Danh sách chờ duyệt ({pendingStudents.length})</h3>

      {pendingStudents.length === 0 ? (
        <p className="empty-message">✅ Không có yêu cầu chờ duyệt</p>
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

              <div className="action-buttons">
                <button
                  className="approve-btn"
                  onClick={() => handleApprove(pending)}
                >
                  ✅ Duyệt
                </button>
                <button
                  className="reject-btn"
                  onClick={() => handleReject(pending)}
                >
                  ❌ Từ chối
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}