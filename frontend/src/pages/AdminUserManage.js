import React, { useState, useEffect } from "react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

export default function AdminUserManage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("add"); // 'add', 'edit', 'resetPassword', 'levelManager'
  const [selectedUser, setSelectedUser] = useState(null);
  const [levelInfo, setLevelInfo] = useState(null);
  const [stats, setStats] = useState(null);
  const [showStats, setShowStats] = useState(false);

  const [filter, setFilter] = useState({
    search: "",
    role: "",
    level: "",
  });

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    fullName: "",
    roles: ["student"],
    level: "bronze",
    avatarUrl: "",
    manualLevelLocked: false,
  });

  const [resetPasswordData, setResetPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const TOKEN = localStorage.getItem("token");

  useEffect(() => {
    if (TOKEN) {
      fetchUsers();
    }
  }, [TOKEN, filter]);

  // ========================
  // FETCH DATA
  // ========================
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.search) params.append("search", filter.search);
      if (filter.role) params.append("role", filter.role);
      if (filter.level) params.append("level", filter.level);

      const response = await fetch(`${API_URL}/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${TOKEN}` },
      });

      const data = await response.json();
      if (data.success) {
        setUsers(data.data);
      } else {
        alert("❌ " + data.message);
      }
    } catch (error) {
      console.error("Fetch error:", error);
      alert("❌ Lỗi kết nối server");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/stats/overview`, {
        headers: { Authorization: `Bearer ${TOKEN}` },
      });

      const data = await response.json();
      if (data.success) {
        setStats(data.data);
        setShowStats(true);
      } else {
        alert("❌ " + data.message);
      }
    } catch (error) {
      console.error("Stats error:", error);
      alert("❌ Lỗi kết nối server");
    }
  };

  const fetchLevelInfo = async (userId) => {
    try {
      const response = await fetch(`${API_URL}/admin/users/${userId}/level-info`, {
        headers: { Authorization: `Bearer ${TOKEN}` },
      });

      const data = await response.json();
      if (data.success) {
        setLevelInfo(data.data);
        return true;
      } else {
        alert("❌ " + data.message);
        return false;
      }
    } catch (error) {
      console.error("Level info error:", error);
      alert("❌ Lỗi lấy thông tin level");
      return false;
    }
  };

  // ========================
  // MODAL FUNCTIONS
  // ========================
  const openAddModal = () => {
    resetForm();
    setModalType("add");
    setSelectedUser(null);
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setModalType("edit");
    setSelectedUser(user);
    setFormData({
      username: user.username,
      email: user.email || "",
      password: "",
      fullName: user.fullName,
      roles: user.roles,
      level: user.level,
      avatarUrl: user.avatarUrl || "",
      manualLevelLocked: user.manualLevelLocked || false,
    });
    setShowModal(true);
  };

  const openResetPasswordModal = (user) => {
    setModalType("resetPassword");
    setSelectedUser(user);
    setResetPasswordData({
      newPassword: "",
      confirmPassword: "",
    });
    setShowModal(true);
  };

  const openLevelManagerModal = async (user) => {
    if (!user.roles.includes("teacher")) {
      alert("⚠️ Chỉ có thể quản lý level của giáo viên");
      return;
    }

    setModalType("levelManager");
    setSelectedUser(user);
    setLoading(true);
    const success = await fetchLevelInfo(user._id);
    setLoading(false);

    if (success) {
      setShowModal(true);
    }
  };

  // ========================
  // HANDLE SAVE
  // ========================
  const handleSave = async () => {
    if (modalType === "add") {
      await handleCreateUser();
    } else if (modalType === "edit") {
      await handleUpdateUser();
    } else if (modalType === "resetPassword") {
      await handleResetPassword();
    }
  };

  const handleCreateUser = async () => {
    if (!formData.username.trim()) {
      alert("⚠️ Username không được để trống!");
      return;
    }

    if (!formData.password || formData.password.length < 6) {
      alert("⚠️ Password phải có ít nhất 6 ký tự!");
      return;
    }

    if (!formData.fullName.trim()) {
      alert("⚠️ Họ tên không được để trống!");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TOKEN}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        alert("✅ Tạo user thành công");
        setShowModal(false);
        fetchUsers();
      } else {
        alert("❌ " + data.message);
      }
    } catch (error) {
      console.error("Create error:", error);
      alert("❌ Lỗi kết nối server");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    setLoading(true);
    try {
      const updateData = {
        fullName: formData.fullName,
        email: formData.email,
        roles: formData.roles,
        level: formData.level,
        avatarUrl: formData.avatarUrl,
        manualLevelLocked: formData.manualLevelLocked,
      };

      const response = await fetch(`${API_URL}/admin/users/${selectedUser._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TOKEN}`,
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();
      if (data.success) {
        alert("✅ Cập nhật user thành công");
        setShowModal(false);
        fetchUsers();
      } else {
        alert("❌ " + data.message);
      }
    } catch (error) {
      console.error("Update error:", error);
      alert("❌ Lỗi kết nối server");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;

    if (!resetPasswordData.newPassword || resetPasswordData.newPassword.length < 6) {
      alert("⚠️ Password phải có ít nhất 6 ký tự!");
      return;
    }

    if (resetPasswordData.newPassword !== resetPasswordData.confirmPassword) {
      alert("⚠️ Password không khớp!");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/users/${selectedUser._id}/reset-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TOKEN}`,
        },
        body: JSON.stringify({ newPassword: resetPasswordData.newPassword }),
      });

      const data = await response.json();
      if (data.success) {
        alert("✅ Reset password thành công");
        setShowModal(false);
      } else {
        alert("❌ " + data.message);
      }
    } catch (error) {
      console.error("Reset password error:", error);
      alert("❌ Lỗi kết nối server");
    } finally {
      setLoading(false);
    }
  };

  // ========================
  // LEVEL MANAGEMENT
  // ========================
  const handleLockLevel = async () => {
    if (!selectedUser || !levelInfo) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/admin/users/${selectedUser._id}/lock-level`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${TOKEN}` },
        }
      );

      const data = await response.json();
      if (data.success) {
        alert("✅ Level đã được khóa");
        fetchLevelInfo(selectedUser._id);
        fetchUsers();
      } else {
        alert("❌ " + data.message);
      }
    } catch (error) {
      console.error("Lock error:", error);
      alert("❌ Lỗi khóa level");
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockLevel = async () => {
    if (!selectedUser || !levelInfo) return;

    if (!window.confirm("⚠️ Mở khóa sẽ bật auto-update. Level có thể thay đổi. Tiếp tục?")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/admin/users/${selectedUser._id}/unlock-level`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${TOKEN}` },
        }
      );

      const data = await response.json();
      if (data.success) {
        alert(`✅ Level đã được mở khóa. Level mới: ${data.data.level}`);
        fetchLevelInfo(selectedUser._id);
        fetchUsers();
      } else {
        alert("❌ " + data.message);
      }
    } catch (error) {
      console.error("Unlock error:", error);
      alert("❌ Lỗi mở khóa level");
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculateLevel = async () => {
    if (!selectedUser) return;

    if (!window.confirm("Tính toán lại level dựa vào stats hiện tại?")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/admin/users/${selectedUser._id}/recalculate-level`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${TOKEN}` },
        }
      );

      const data = await response.json();
      if (data.success) {
        const msg = data.data.changed
          ? `Level thay đổi: ${data.data.oldLevel} → ${data.data.newLevel}`
          : "Level không thay đổi";
        alert("✅ " + msg);
        fetchLevelInfo(selectedUser._id);
        fetchUsers();
      } else {
        alert("❌ " + data.message);
      }
    } catch (error) {
      console.error("Recalculate error:", error);
      alert("❌ Lỗi tính toán lại level");
    } finally {
      setLoading(false);
    }
  };

  // ========================
  // OTHER FUNCTIONS
  // ========================
  const handleDelete = async (userId, username) => {
    if (!window.confirm(`⚠️ Bạn có chắc muốn xóa user "${username}"?`)) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${TOKEN}` },
      });

      const data = await response.json();
      if (data.success) {
        alert("✅ Xóa user thành công");
        fetchUsers();
      } else {
        alert("❌ " + data.message);
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("❌ Lỗi kết nối server");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      username: "",
      email: "",
      password: "",
      fullName: "",
      roles: ["student"],
      level: "bronze",
      avatarUrl: "",
      manualLevelLocked: false,
    });
  };

  const toggleRole = (role) => {
    setFormData((prev) => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role],
    }));
  };

  // ========================
  // RENDER HELPERS
  // ========================
  const getRoleBadge = (roles) => {
    if (!roles || !Array.isArray(roles)) return null;
    return roles.map((role) => (
      <span
        key={role}
        style={{
          padding: "4px 8px",
          borderRadius: "4px",
          fontSize: "11px",
          marginRight: "4px",
          backgroundColor:
            role === "admin" ? "#f44336" : role === "teacher" ? "#2196F3" : "#4caf50",
          color: "white",
        }}
      >
       {role}
      </span>
    ));
  };

  const getLevelBadge = (level, locked) => {
    const colors = {
      bronze: "#cd7f32",
      silver: "#c0c0c0",
      gold: "#ffd700",
      platinum: "#e5e4e2",
    };

    return (
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span
          style={{
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "11px",
            backgroundColor: colors[level] || "#999",
            color: level === "platinum" ? "#000" : "#fff",
          }}
        >
          {level}
        </span>
        {locked ? (
          <span title="Admin khóa level">🔒</span>
        ) : (
          <span title="Auto update">⚙️</span>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: "20px", maxWidth: "1400px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h1 style={{ margin: 0 }}>Manage users</h1>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => (showStats ? setShowStats(false) : fetchStats())}
            style={{
              padding: "10px 20px",
              backgroundColor: "#9c27b0",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {showStats ? " Ẩn thống kê" : " Thống kê"}
          </button>
          <button
            onClick={openAddModal}
            style={{
              padding: "10px 20px",
              backgroundColor: "#4caf50",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            ➕ Thêm user
          </button>
        </div>
      </div>

      {showStats && stats && (
        <div
          style={{
            backgroundColor: "#ffd0be9c",
            padding: "20px",
            borderRadius: "8px",
            marginBottom: "20px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "15px",
          }}
        >
          <div style={{ padding: "15px", backgroundColor: "white", borderRadius: "4px" }}>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#666" }}>Tổng users</h3>
            <p style={{ fontSize: "24px", fontWeight: "bold", margin: 0 }}>{stats.totalUsers}</p>
          </div>
          <div style={{ padding: "15px", backgroundColor: "white", borderRadius: "4px" }}>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#666" }}> Students</h3>
            <p style={{ fontSize: "24px", fontWeight: "bold", margin: 0 }}>{stats.students}</p>
          </div>
          <div style={{ padding: "15px", backgroundColor: "white", borderRadius: "4px" }}>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#666" }}> Teachers</h3>
            <p style={{ fontSize: "24px", fontWeight: "bold", margin: 0 }}>{stats.teachers}</p>
          </div>
          <div style={{ padding: "15px", backgroundColor: "white", borderRadius: "4px" }}>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#666" }}> Admins</h3>
            <p style={{ fontSize: "24px", fontWeight: "bold", margin: 0 }}>{stats.admins}</p>
          </div>
        </div>
      )}

      <div
        style={{
          backgroundColor: "white",
          padding: "15px",
          borderRadius: "8px",
          marginBottom: "20px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "10px" }}>
          <input
            type="text"
            placeholder="🔍 Tìm theo username, email, họ tên..."
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            style={{
              padding: "10px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "14px",
            }}
          />

          <select
            value={filter.role}
            onChange={(e) => setFilter({ ...filter, role: e.target.value })}
            style={{
              padding: "10px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "14px",
            }}
          >
            <option value="">Tất cả roles</option>
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="admin">Admin</option>
          </select>

          <select
            value={filter.level}
            onChange={(e) => setFilter({ ...filter, level: e.target.value })}
            style={{
              padding: "10px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "14px",
            }}
          >
            <option value="">Tất cả levels</option>
            <option value="bronze">Bronze</option>
            <option value="silver">Silver</option>
            <option value="gold">Gold</option>
            <option value="platinum">Platinum</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <p>⏳ Đang tải...</p>
        </div>
      ) : users.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", backgroundColor: "#f5f5f5", borderRadius: "8px" }}>
          <p>Không có user nào</p>
        </div>
      ) : (
        <div style={{ backgroundColor: "white", borderRadius: "8px", overflow: "hidden", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f5f5f5", borderBottom: "2px solid #ddd" }}>
                <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600" }}>Avatar</th>
                <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600" }}>Username</th>
                <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600" }}>Họ tên</th>
                <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600" }}>Email</th>
                <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600" }}>Roles</th>
                <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600" }}>Level</th>
                <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600" }}>Ngày tạo</th>
                <th style={{ padding: "12px", textAlign: "center", fontSize: "13px", fontWeight: "600" }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "12px" }}>
                    <img
                      src={user.avatarUrl || "https://cdn-icons-png.flaticon.com/512/847/847969.png"}
                      alt="avatar"
                      style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover" }}
                    />
                  </td>
                  <td style={{ padding: "12px", fontSize: "14px" }}>{user.username}</td>
                  <td style={{ padding: "12px", fontSize: "14px" }}>{user.fullName}</td>
                  <td style={{ padding: "12px", fontSize: "14px", color: "#666" }}>{user.email || "-"}</td>
                  <td style={{ padding: "12px" }}>{getRoleBadge(user.roles)}</td>
                  <td style={{ padding: "12px" }}>{getLevelBadge(user.level, user.manualLevelLocked)}</td>
                  <td style={{ padding: "12px", fontSize: "13px", color: "#666" }}>
                    {new Date(user.createdAt).toLocaleDateString("vi-VN")}
                  </td>
                  <td style={{ padding: "12px" }}>
                    <div style={{ display: "flex", gap: "5px", justifyContent: "center", flexWrap: "wrap" }}>
                      <button
                        onClick={() => openEditModal(user)}
                        style={{
                          padding: "5px 10px",
                          backgroundColor: "#2196F3",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
                        title="Sửa"
                      >
                        ✏️
                      </button>
                      {user.roles.includes("teacher") && (
                        <button
                          onClick={() => openLevelManagerModal(user)}
                          style={{
                            padding: "5px 10px",
                            backgroundColor: "#ff9800",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px",
                          }}
                          title="Quản lý level"
                        >
                          ⭐
                        </button>
                      )}
                      <button
                        onClick={() => openResetPasswordModal(user)}
                        style={{
                          padding: "5px 10px",
                          backgroundColor: "#9c27b0",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
                        title="Reset password"
                      >
                        🔑
                      </button>
                      <button
                        onClick={() => handleDelete(user._id, user.username)}
                        style={{
                          padding: "5px 10px",
                          backgroundColor: "#f44336",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
                        title="Xóa"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "8px",
              padding: "24px",
              maxWidth: "500px",
              width: "90%",
              maxHeight: "80vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0 }}>
              {modalType === "add" && "➕ Thêm User Mới"}
              {modalType === "edit" && "✏️ Chỉnh sửa User"}
              {modalType === "resetPassword" && "🔑 Reset Password"}
              {modalType === "levelManager" && "⭐ Quản lý Level"}
            </h2>

            {/* RESET PASSWORD MODAL */}
            {modalType === "resetPassword" ? (
              <div>
                <div style={{ marginBottom: "15px" }}>
                  <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                    User: <strong>{selectedUser?.username}</strong>
                  </label>
                </div>

                <div style={{ marginBottom: "15px" }}>
                  <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                    Password mới *
                  </label>
                  <input
                    type="password"
                    value={resetPasswordData.newPassword}
                    onChange={(e) => setResetPasswordData({ ...resetPasswordData, newPassword: e.target.value })}
                    style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px", boxSizing: "border-box" }}
                    placeholder="Nhập password mới (min 6 ký tự)"
                  />
                </div>

                <div style={{ marginBottom: "15px" }}>
                  <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                    Xác nhận password *
                  </label>
                  <input
                    type="password"
                    value={resetPasswordData.confirmPassword}
                    onChange={(e) => setResetPasswordData({ ...resetPasswordData, confirmPassword: e.target.value })}
                    style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px", boxSizing: "border-box" }}
                    placeholder="Nhập lại password"
                  />
                </div>
              </div>
            ) 
            // LEVEL MANAGER MODAL
            : modalType === "levelManager" && levelInfo ? (
              <div>
                <div style={{ marginBottom: "20px", padding: "15px", backgroundColor: "#f9f9f9", borderRadius: "6px" }}>
                  <p style={{ margin: "0 0 10px 0" }}><strong>Giáo viên:</strong> {levelInfo.fullName}</p>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                    <div>
                      <p style={{ margin: "0 0 5px 0", fontSize: "12px", color: "#666" }}>Level hiện tại</p>
                      <div style={{ padding: "8px", backgroundColor: "#fff", border: "1px solid #ddd", borderRadius: "4px", textAlign: "center" }}>
                        <strong>{levelInfo.currentLevel.toUpperCase()}</strong>
                      </div>
                    </div>
                    <div>
                      <p style={{ margin: "0 0 5px 0", fontSize: "12px", color: "#666" }}>Trạng thái khóa</p>
                      <div style={{ padding: "8px", backgroundColor: levelInfo.manualLevelLocked ? "#ffebee" : "#e8f5e9", border: "1px solid #ddd", borderRadius: "4px", textAlign: "center" }}>
                        <strong>{levelInfo.manualLevelLocked ? "🔒 Locked" : "🔓 Unlocked"}</strong>
                      </div>
                    </div>
                  </div>

                  {levelInfo.willChangeIfUnlocked && (
                    <div style={{ padding: "10px", backgroundColor: "#fff3e0", borderRadius: "4px", borderLeft: "3px solid #ff9800" }}>
                      <p style={{ margin: 0, fontSize: "13px", color: "#e65100" }}>
                        ⚠️ Nếu mở khóa, level sẽ đổi: <strong>{levelInfo.currentLevel} → {levelInfo.expectedLevel}</strong>
                      </p>
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: "20px", padding: "15px", backgroundColor: "#f9f9f9", borderRadius: "6px" }}>
                  <p style={{ margin: "0 0 10px 0", fontWeight: "600", fontSize: "13px" }}> Thống kê:</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                    <div>
                      <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>Số học viên</p>
                      <p style={{ margin: "5px 0 0 0", fontSize: "16px", fontWeight: "bold" }}>{levelInfo.teacherStats.totalStudents}</p>
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>Rating</p>
                      <p style={{ margin: "5px 0 0 0", fontSize: "16px", fontWeight: "bold" }}>{levelInfo.teacherStats.averageRating} ⭐</p>
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>Khóa học</p>
                      <p style={{ margin: "5px 0 0 0", fontSize: "16px", fontWeight: "bold" }}>{levelInfo.teacherStats.totalCourses}</p>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: "20px", padding: "15px", backgroundColor: "#f9f9f9", borderRadius: "6px" }}>
                  <p style={{ margin: "0 0 10px 0", fontWeight: "600", fontSize: "13px" }}> Tiêu chí Level:</p>
                  {Object.entries(levelInfo.criteria).map(([level, desc]) => (
                    <div key={level} style={{ marginBottom: "8px", padding: "8px", backgroundColor: "#fff", borderRadius: "4px", borderLeft: `3px solid ${levelInfo.currentLevel === level ? "#667eea" : "#ddd"}` }}>
                      <p style={{ margin: 0, fontSize: "13px" }}>
                        <strong>{level.toUpperCase()}</strong> - {desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )
            // ADD/EDIT MODAL
            : (
              <div>
                {modalType === "add" && (
                  <>
                    <div style={{ marginBottom: "15px" }}>
                      <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                        Username *
                      </label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px", boxSizing: "border-box" }}
                        placeholder="Nhập username"
                      />
                    </div>

                    <div style={{ marginBottom: "15px" }}>
                      <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                        Password *
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px", boxSizing: "border-box" }}
                        placeholder="Nhập password (min 6 ký tự)"
                      />
                    </div>
                  </>
                )}

                <div style={{ marginBottom: "15px" }}>
                  <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                    Họ tên *
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px", boxSizing: "border-box" }}
                    placeholder="Nhập họ tên"
                  />
                </div>

                <div style={{ marginBottom: "15px" }}>
                  <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px", boxSizing: "border-box" }}
                    placeholder="Nhập email (optional)"
                  />
                </div>

                <div style={{ marginBottom: "15px" }}>
                  <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                    Avatar URL
                  </label>
                  <input
                    type="text"
                    value={formData.avatarUrl}
                    onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                    style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px", boxSizing: "border-box" }}
                    placeholder="https://..."
                  />
                </div>

                <div style={{ marginBottom: "15px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
                    Roles
                  </label>
                  <div style={{ display: "flex", gap: "10px" }}>
                    {["student", "teacher", "admin"].map((role) => (
                      <label key={role} style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={formData.roles.includes(role)}
                          onChange={() => toggleRole(role)}
                        />
                        <span style={{ fontSize: "14px" }}>{role}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {formData.roles.includes("teacher") && (
                  <>
                    <div style={{ marginBottom: "15px" }}>
                      <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                        Level (Teacher)
                      </label>
                      <select
                        value={formData.level}
                        disabled={formData.manualLevelLocked}
                        onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                        style={{
                          width: "100%",
                          padding: "10px",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                          boxSizing: "border-box",
                          backgroundColor: formData.manualLevelLocked ? "#f5f5f5" : "white",
                        }}
                      >
                        <option value="bronze">Bronze</option>
                        <option value="silver">Silver</option>
                        <option value="gold">Gold</option>
                        <option value="platinum">Platinum</option>
                      </select>
                    </div>

                    <div style={{ marginBottom: "15px", padding: "10px", backgroundColor: "#f9f9f9", borderRadius: "6px" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={formData.manualLevelLocked}
                          onChange={(e) => setFormData({ ...formData, manualLevelLocked: e.target.checked })}
                        />
                        <span style={{ fontSize: "14px", fontWeight: "500" }}>
                          🔒 Khóa level (tắt auto update)
                        </span>
                      </label>
                      <small style={{ color: "#666", marginLeft: "22px", display: "block", marginTop: "5px" }}>
                        {formData.manualLevelLocked
                          ? "Admin đang kiểm soát level này"
                          : "Level sẽ tự động cập nhật theo hoạt động của giáo viên"}
                      </small>
                    </div>
                  </>
                )}
              </div>
            )}

            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  flex: 1,
                  padding: "10px",
                  backgroundColor: "#f5f5f5",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                ❌ Hủy
              </button>

              {modalType === "levelManager" ? (
                <>
                  {levelInfo?.manualLevelLocked ? (
                    <>
                      <button
                        onClick={handleUnlockLevel}
                        disabled={loading}
                        style={{
                          flex: 1,
                          padding: "10px",
                          backgroundColor: "#2196F3",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: loading ? "not-allowed" : "pointer",
                          opacity: loading ? 0.7 : 1,
                        }}
                      >
                        {loading ? "⏳" : "🔓"} Mở khóa
                      </button>
                      <button
                        onClick={handleRecalculateLevel}
                        disabled={loading}
                        style={{
                          flex: 1,
                          padding: "10px",
                          backgroundColor: "#ff9800",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: loading ? "not-allowed" : "pointer",
                          opacity: loading ? 0.7 : 1,
                        }}
                      >
                        {loading ? "⏳" : "🔄"} Tính lại
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleLockLevel}
                      disabled={loading}
                      style={{
                        flex: 1,
                        padding: "10px",
                        backgroundColor: "#f44336",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: loading ? "not-allowed" : "pointer",
                        opacity: loading ? 0.7 : 1,
                      }}
                    >
                      {loading ? "⏳" : "🔒"} Khóa
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: "10px",
                    backgroundColor: "#4caf50",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? "⏳ Đang lưu..." : "✅ Lưu"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}