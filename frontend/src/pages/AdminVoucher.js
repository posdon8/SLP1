import React, { useState, useEffect } from "react";
import axios from "axios";
import "./AdminVoucher.css";

export default function AdminVoucher() {
  const token = localStorage.getItem("token");
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    code: "",
    description: "",
    discountType: "percentage", // percentage | fixed
    discountValue: 0,
    maxUses: null,
    applicableCourses: [], // null = all courses
    minStudentTier: null, // null = no requirement
    startDate: new Date().toISOString().split("T")[0],
    expiresAt: "",
    isActive: true,
  });

  // ✅ Fetch courses for multi-select
  useEffect(() => {
    axios
      .get("http://localhost:5000/api/courses", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        console.log("📚 Courses loaded:", res.data);
        // Handle response data
        const coursesList = res.data.courses || res.data.data || res.data || [];
        setCourses(Array.isArray(coursesList) ? coursesList : []);
      })
      .catch((err) => console.error("❌ Error fetching courses:", err));
  }, [token]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleCourseToggle = (courseId) => {
    setFormData((prev) => {
      const courses = prev.applicableCourses || [];
      if (courses.includes(courseId)) {
        return {
          ...prev,
          applicableCourses: courses.filter((id) => id !== courseId),
        };
      } else {
        return {
          ...prev,
          applicableCourses: [...courses, courseId],
        };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    // ✅ Validate
    if (!formData.code.trim()) {
      setError("Mã voucher không được để trống");
      setLoading(false);
      return;
    }

    if (formData.discountValue <= 0) {
      setError("Giá trị giảm giá phải > 0");
      setLoading(false);
      return;
    }

    if (
      formData.discountType === "percentage" &&
      formData.discountValue > 100
    ) {
      setError("Phần trăm giảm giá không được vượt quá 100%");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        ...formData,
        maxUses: formData.maxUses ? parseInt(formData.maxUses) : null,
        discountValue:
          formData.discountType === "percentage"
            ? parseFloat(formData.discountValue)
            : parseInt(formData.discountValue),
        applicableCourses:
          formData.applicableCourses.length > 0
            ? formData.applicableCourses
            : null,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt) : null,
      };

      console.log("📤 Submitting voucher:", payload);

      const res = await axios.post(
        "http://localhost:5000/api/coupon",
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("✅ Voucher created:", res.data);
      setSuccess(`✅ Tạo voucher thành công! Code: ${res.data.coupon.code}`);

      // Reset form
      setFormData({
        code: "",
        description: "",
        discountType: "percentage",
        discountValue: 0,
        maxUses: null,
        applicableCourses: [],
        minStudentTier: null,
        startDate: new Date().toISOString().split("T")[0],
        expiresAt: "",
        isActive: true,
      });
    } catch (err) {
      console.error("❌ Error creating voucher:", err);
      setError(
        err.response?.data?.message || "Lỗi tạo voucher. Vui lòng thử lại"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-voucher-container">
      <div className="voucher-card">
        <h1>Tạo Voucher</h1>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit} className="voucher-form">
          {/* Mã Voucher */}
          <div className="form-group">
            <label htmlFor="code">📌 Mã Voucher *</label>
            <input
              type="text"
              id="code"
              name="code"
              value={formData.code}
              onChange={handleChange}
              placeholder="VD: SUMMER2024, SAVE10"
              className="form-input"
              required
            />
            <small className="hint">Mã sẽ tự động chuyển thành chữ hoa</small>
          </div>

          {/* Mô tả */}
          <div className="form-group">
            <label htmlFor="description">Mô Tả</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Mô tả chi tiết về voucher"
              className="form-textarea"
              rows="3"
            />
          </div>

          {/* Loại giảm giá */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="discountType">Loại Giảm Giá *</label>
              <select
                id="discountType"
                name="discountType"
                value={formData.discountType}
                onChange={handleChange}
                className="form-select"
              >
                <option value="percentage">% Phần trăm</option>
                <option value="fixed">Tiền cố định (VND)</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="discountValue">
                 Giá Trị Giảm {formData.discountType === "percentage" ? "(%)" : "(VND)"} *
              </label>
              <input
                type="number"
                id="discountValue"
                name="discountValue"
                value={formData.discountValue}
                onChange={handleChange}
                placeholder={
                  formData.discountType === "percentage" ? "VD: 10" : "VD: 50000"
                }
                className="form-input"
                required
              />
            </div>
          </div>

          {/* Số lần dùng */}
          <div className="form-group">
            <label htmlFor="maxUses">Số Lần Dùng Tối Đa</label>
            <input
              type="number"
              id="maxUses"
              name="maxUses"
              value={formData.maxUses || ""}
              onChange={handleChange}
              placeholder="Để trống = không giới hạn"
              className="form-input"
              min="1"
            />
          </div>

          {/* Hạn sử dụng */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startDate"> Ngày Bắt Đầu *</label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="expiresAt"> Ngày Hết Hạn</label>
              <input
                type="date"
                id="expiresAt"
                name="expiresAt"
                value={formData.expiresAt}
                onChange={handleChange}
                className="form-input"
                min={formData.startDate}
              />
            </div>
          </div>

          {/* Yêu cầu tier */}
          <div className="form-group">
            <label htmlFor="minStudentTier">Yêu Cầu Hạng Thành Viên</label>
            <select
              id="minStudentTier"
              name="minStudentTier"
              value={formData.minStudentTier || ""}
              onChange={handleChange}
              className="form-select"
            >
              <option value="">Không yêu cầu</option>
              <option value="bronze">Bronze 🥉</option>
              <option value="silver">Silver 🥈</option>
              <option value="gold">Gold 🏅</option>
              <option value="platinum">Platinum 💎</option>
            </select>
          </div>

          {/* Khóa học áp dụng */}
          <div className="form-group">
            <label>Áp Dụng Cho Khóa Học</label>
            <small className="hint">Để trống = áp dụng tất cả khóa học</small>
            <div className="courses-list">
              {courses.length > 0 ? (
                courses.map((course) => (
                  <div key={course._id} className="course-checkbox">
                    <input
                      type="checkbox"
                      id={`course-${course._id}`}
                      checked={formData.applicableCourses.includes(
                        course._id
                      )}
                      onChange={() => handleCourseToggle(course._id)}
                    />
                    <label htmlFor={`course-${course._id}`}>
                      {course.title}
                    </label>
                  </div>
                ))
              ) : (
                <p className="empty-state">📭 Chưa có khóa học nào</p>
              )}
            </div>
          </div>

          {/* Kích hoạt */}
          <div className="form-group">
            <label htmlFor="isActive" className="checkbox-label">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
              />
              <span>Kích hoạt ngay</span>
            </label>
          </div>

          {/* Submit */}
          <div className="form-actions">
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? "⏳ Đang tạo..." : "✨ Tạo Voucher"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}