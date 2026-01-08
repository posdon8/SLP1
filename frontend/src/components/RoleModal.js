import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./RoleModal.css";

export default function RoleModal({ isOpen, onClose, token, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
const modalRef = useRef(null);

useEffect(() => {
  if (isOpen && modalRef.current) {
    modalRef.current.focus(); // 🔥 focus vào modal
  }
}, [isOpen]);

  const handleAddTeacherRole = async () => {
    setLoading(true);
    setError("");

    try {
      const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
      
      const res = await axios.post(
        `${API_URL}/auth/add-teacher-role`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (res.data.success) {
        console.log("✅ Added teacher role:", res.data.user);
        
        // ✅ Update localStorage
        const user = JSON.parse(localStorage.getItem("user"));
        user.roles = res.data.user.roles;  // ← Update roles array
        localStorage.setItem("user", JSON.stringify(user));
        
        // ✅ Callback để update parent component
        onSuccess && onSuccess(user);
        
        // ✅ Close modal
        onClose();
        
        // ✅ Optional: redirect
        setTimeout(() => {
          window.location.href = "/teacher-dashboard";
        }, 500);
      } else {
        setError(res.data.message || "Failed to add teacher role");
      }
    } catch (err) {
      console.error("❌ Error:", err);
      setError(err.response?.data?.message || "Error adding teacher role");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="role-modal-overlay" onClick={onClose}>
      <div className="role-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Become an instructor?</h2>
      

        <div className="benefits-list">
          <h4> Quyền lợi của Giảng viên</h4>
          <ul>
          <li> Tạo và quản lý khóa học riêng</li>
          <li> Nhận thu nhậli từ học viên</li>
          <li> Quản lý stats (sinh viên, đánh giá)</li>
          <li> Giữ lại quyền lợi Student</li>
          </ul>
        </div>
        <div className="responsibility-box">
  <h4> Trách nhiệm của Giảng viên</h4>
  <ul>
    <li>Cung cấp nội dung khóa học chính xác, không vi phạm bản quyền</li>
    <li>Đảm bảo bài giảng và bài tập có chất lượng, đúng chuyên môn</li>
    <li>Không đăng tải nội dung vi phạm pháp luật hoặc thuần phong mỹ tục</li>
    <li>Hỗ trợ, giải đáp thắc mắc của học viên trong phạm vi khóa học</li>
    <li>Chịu trách nhiệm về nội dung và kết quả giảng dạy của mình</li>
  </ul>

  <p className="responsibility-note">
    Bằng việc tiếp tục, bạn xác nhận đã đọc và đồng ý với các trách nhiệm trên.
  </p>
</div>
        {error && <p className="error-msg">❌ {error}</p>}

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            Hủy
          </button>
          <button 
            className="btn-confirm" 
            onClick={handleAddTeacherRole}
            disabled={loading}
          >
            {loading ? "⏳ Đang xử lý..." : "Join with us"}
          </button>
        </div>
      </div>
    </div>
  );
}
