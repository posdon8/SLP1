import React, { useState, useEffect } from "react";

export default function AdminLevelManage() {
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [levelInfo, setLevelInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const token = localStorage.getItem("token");

  // Fetch teachers
  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const res = await fetch(
         `${process.env.REACT_APP_API_URL}/admin/users?role=teacher&limit=50`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const data = await res.json();
      setTeachers(data.data || []);
    } catch (err) {
      console.error("❌ Error fetching teachers:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLevelInfo = async (teacherId) => {
    setLoading(true);
    try {
      const res = await fetch(
         `${process.env.REACT_APP_API_URL}/admin/users/${teacherId}/level-info`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const data = await res.json();
      setLevelInfo(data.data);
      setSelectedTeacher(teacherId);
    } catch (err) {
      console.error("❌ Error fetching level info:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLockLevel = async () => {
    if (!selectedTeacher) return;

    setLoading(true);
    try {
      const res = await fetch(
         `${process.env.REACT_APP_API_URL}/admin/users/${selectedTeacher}/lock-level`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const data = await res.json();
      
      if (res.ok) {
        alert("✅ Level đã được khóa!");
        fetchLevelInfo(selectedTeacher);
      } else {
        alert("❌ " + data.message);
      }
    } catch (err) {
      alert("❌ Lỗi: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockLevel = async () => {
    if (!selectedTeacher) return;

    if (!window.confirm("⚠️ Mở khóa sẽ bật auto-update. Level có thể thay đổi. Tiếp tục?")) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
         `${process.env.REACT_APP_API_URL}/admin/users/${selectedTeacher}/unlock-level`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const data = await res.json();
      
      if (res.ok) {
        alert("✅ Level đã được mở khóa!");
        fetchLevelInfo(selectedTeacher);
      } else {
        alert("❌ " + data.message);
      }
    } catch (err) {
      alert("❌ Lỗi: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async () => {
    if (!selectedTeacher) return;

    if (!window.confirm("Tính toán lại level dựa vào stats hiện tại?")) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
         `${process.env.REACT_APP_API_URL}/admin/users/${selectedTeacher}/recalculate-level`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const data = await res.json();
      
      if (res.ok) {
        const msg = data.data.changed 
          ? `Level thay đổi: ${data.data.oldLevel} → ${data.data.newLevel}`
          : "Level không thay đổi";
        alert("✅ " + msg);
        fetchLevelInfo(selectedTeacher);
      } else {
        alert("❌ " + data.message);
      }
    } catch (err) {
      alert("❌ Lỗi: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredTeachers = teachers.filter(t =>
    t.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getLevelColor = (level) => {
    const colors = {
      bronze: "#CD7F32",
      silver: "#C0C0C0",
      gold: "#FFD700",
      platinum: "#E5E4E2"
    };
    return colors[level] || "#999";
  };

  return (
    <div className="level-manager-container">
      <div className="level-manager">
        <h1>🎯 Quản Lý Level Giáo Viên</h1>

        <div className="manager-content">
          {/* Left: Teacher List */}
          <div className="teacher-list-section">
            <h3>Danh sách giáo viên</h3>
            <input
              type="text"
              placeholder="Tìm giáo viên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />

            <div className="teacher-list">
              {filteredTeachers.length === 0 ? (
                <p>Không có giáo viên nào</p>
              ) : (
                filteredTeachers.map((teacher) => (
                  <div
                    key={teacher._id}
                    className={`teacher-item ${
                      selectedTeacher === teacher._id ? "active" : ""
                    }`}
                    onClick={() => fetchLevelInfo(teacher._id)}
                  >
                    <div className="teacher-info">
                      <p className="name">{teacher.fullName}</p>
                      <p className="username">@{teacher.username}</p>
                    </div>
                    <div
                      className="level-badge"
                      style={{ backgroundColor: getLevelColor(teacher.level) }}
                    >
                      {teacher.level}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Level Details */}
          <div className="level-details-section">
            {selectedTeacher && levelInfo ? (
              <>
                <div className="level-header">
                  <h2>{levelInfo.fullName}</h2>
                  <p>@{levelInfo.username}</p>
                </div>

                {/* Current Status */}
                <div className="level-status">
                  <div className="status-box">
                    <label>Current Level</label>
                    <div
                      className="level-display"
                      style={{ backgroundColor: getLevelColor(levelInfo.currentLevel) }}
                    >
                      {levelInfo.currentLevel?.toUpperCase()}
                    </div>
                  </div>

                  <div className="status-box">
                    <label>Lock Status</label>
                    <div className={`lock-status ${levelInfo.manualLevelLocked ? "locked" : "unlocked"}`}>
                      {levelInfo.manualLevelLocked ? "🔒 Locked" : "🔓 Unlocked"}
                    </div>
                  </div>

                  <div className="status-box">
                    <label>Expected Level</label>
                    <div
                      className="level-display expected"
                      style={{ backgroundColor: getLevelColor(levelInfo.expectedLevel) }}
                    >
                      {levelInfo.expectedLevel?.toUpperCase()}
                    </div>
                  </div>
                </div>

                {/* Warning */}
                {levelInfo.willChangeIfUnlocked && (
                  <div className="warning-box">
                    ⚠️ Nếu bỏ khóa, level sẽ thay đổi từ <strong>{levelInfo.currentLevel}</strong> → <strong>{levelInfo.expectedLevel}</strong>
                  </div>
                )}

                {/* Stats */}
                <div className="stats-section">
                  <h4>Thống kê</h4>
                  <div className="stats-grid">
                    <div className="stat-item">
                      <label>Số học viên</label>
                      <p>{levelInfo.teacherStats.totalStudents}</p>
                    </div>
                    <div className="stat-item">
                      <label>Rating trung bình</label>
                      <p>{levelInfo.teacherStats.averageRating} ⭐</p>
                    </div>
                    <div className="stat-item">
                      <label>Tổng khóa học</label>
                      <p>{levelInfo.teacherStats.totalCourses}</p>
                    </div>
                  </div>
                </div>

                {/* Criteria */}
                <div className="criteria-section">
                  <h4>Level Criteria</h4>
                  <div className="criteria-list">
                    {Object.entries(levelInfo.criteria).map(([level, desc]) => (
                      <div
                        key={level}
                        className={`criteria-item ${
                          levelInfo.currentLevel === level ? "current" : ""
                        }`}
                      >
                        <span className="level-name">{level.toUpperCase()}</span>
                        <span className="description">{desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="actions-section">
                  {levelInfo.manualLevelLocked ? (
                    <>
                      <button
                        onClick={handleUnlockLevel}
                        className="btn btn-unlock"
                        disabled={loading}
                      >
                        🔓 Mở khóa (Auto-update)
                      </button>
                      <button
                        onClick={handleRecalculate}
                        className="btn btn-recalc"
                        disabled={loading}
                      >
                        🔄 Tính lại Level
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleLockLevel}
                      className="btn btn-lock"
                      disabled={loading}
                    >
                      🔒 Khóa Level
                    </button>
                  )}
                </div>

                {loading && <p className="loading">Đang xử lý...</p>}
              </>
            ) : (
              <div className="no-selection">
                <p>👈 Chọn giáo viên để xem thông tin</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .level-manager-container {
          padding: 20px;
          background: #f5f5f5;
          min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .level-manager {
          max-width: 1200px;
          margin: 0 auto;
        }

        .level-manager h1 {
          color: #333;
          margin-bottom: 30px;
          font-size: 28px;
        }

        .manager-content {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 20px;
        }

        /* Teacher List */
        .teacher-list-section {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .teacher-list-section h3 {
          margin-top: 0;
          color: #333;
          margin-bottom: 15px;
        }

        .search-input {
          width: 100%;
          padding: 10px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          margin-bottom: 15px;
          font-size: 14px;
        }

        .search-input:focus {
          outline: none;
          border-color: #667eea;
        }

        .teacher-list {
          max-height: 600px;
          overflow-y: auto;
        }

        .teacher-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 10px;
          background: #f9f9f9;
          cursor: pointer;
          transition: all 0.3s ease;
          border: 2px solid transparent;
        }

        .teacher-item:hover {
          background: #f0f0f0;
        }

        .teacher-item.active {
          background: #e8eaf6;
          border-color: #667eea;
        }

        .teacher-info .name {
          margin: 0;
          font-weight: 600;
          color: #333;
          font-size: 14px;
        }

        .teacher-info .username {
          margin: 4px 0 0 0;
          color: #999;
          font-size: 12px;
        }

        .level-badge {
          padding: 4px 12px;
          border-radius: 20px;
          color: white;
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
        }

        /* Level Details */
        .level-details-section {
          background: white;
          border-radius: 12px;
          padding: 30px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .no-selection {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 400px;
          color: #999;
          font-size: 16px;
        }

        .level-header h2 {
          margin: 0 0 5px 0;
          color: #333;
          font-size: 24px;
        }

        .level-header p {
          margin: 0;
          color: #999;
          font-size: 14px;
        }

        .level-header {
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #e0e0e0;
        }

        .level-status {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin-bottom: 30px;
        }

        .status-box {
          background: #f9f9f9;
          padding: 15px;
          border-radius: 8px;
          text-align: center;
        }

        .status-box label {
          display: block;
          color: #999;
          font-size: 12px;
          margin-bottom: 8px;
          text-transform: uppercase;
          font-weight: 600;
        }

        .level-display {
          padding: 10px;
          border-radius: 6px;
          color: white;
          font-weight: 700;
          font-size: 18px;
          text-transform: uppercase;
        }

        .level-display.expected {
          opacity: 0.7;
        }

        .lock-status {
          padding: 10px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 14px;
        }

        .lock-status.locked {
          background: #ffebee;
          color: #c62828;
        }

        .lock-status.unlocked {
          background: #e8f5e9;
          color: #2e7d32;
        }

        .warning-box {
          background: #fff3e0;
          border-left: 4px solid #f57c00;
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 20px;
          font-size: 14px;
          color: #e65100;
        }

        .stats-section {
          margin-bottom: 30px;
        }

        .stats-section h4 {
          margin-top: 0;
          color: #333;
          margin-bottom: 15px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
        }

        .stat-item {
          background: #f9f9f9;
          padding: 15px;
          border-radius: 8px;
          text-align: center;
        }

        .stat-item label {
          display: block;
          color: #999;
          font-size: 12px;
          margin-bottom: 8px;
        }

        .stat-item p {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
          color: #333;
        }

        .criteria-section {
          margin-bottom: 30px;
        }

        .criteria-section h4 {
          margin-top: 0;
          color: #333;
          margin-bottom: 15px;
        }

        .criteria-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .criteria-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: #f9f9f9;
          border-radius: 6px;
          border-left: 3px solid transparent;
          transition: all 0.3s ease;
        }

        .criteria-item.current {
          background: #e8eaf6;
          border-left-color: #667eea;
        }

        .criteria-item .level-name {
          font-weight: 700;
          text-transform: uppercase;
          font-size: 12px;
          color: #333;
        }

        .criteria-item .description {
          color: #999;
          font-size: 13px;
        }

        .actions-section {
          display: flex;
          gap: 10px;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 2px solid #e0e0e0;
        }

        .btn {
          flex: 1;
          padding: 12px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.3s ease;
        }

        .btn-lock {
          background: #c62828;
          color: white;
        }

        .btn-lock:hover:not(:disabled) {
          background: #b71c1c;
        }

        .btn-unlock {
          background: #2e7d32;
          color: white;
        }

        .btn-unlock:hover:not(:disabled) {
          background: #1b5e20;
        }

        .btn-recalc {
          background: #1565c0;
          color: white;
        }

        .btn-recalc:hover:not(:disabled) {
          background: #0d47a1;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .loading {
          text-align: center;
          color: #667eea;
          font-weight: 600;
          margin-top: 15px;
        }

        @media (max-width: 768px) {
          .manager-content {
            grid-template-columns: 1fr;
          }

          .level-status,
          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}