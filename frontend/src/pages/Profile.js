import React, { useEffect, useState } from "react";
import axios from "axios";
import { getLevelInfo, COMMISSION_RATES } from "../utils/commission";
import { getTierInfo } from "../utils/discount";
import "./Profile.css";

export default function Profile() {
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    avatarUrl: "",
  });
  const [successMsg, setSuccessMsg] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("You are not logged in.");
      setLoading(false);
      return;
    }

    axios
      .get(`${API_URL}/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setUser(res.data);
        setFormData({
          fullName: res.data.fullName || "",
          email: res.data.email || "",
          avatarUrl: res.data.avatarUrl || "",
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Unable to load user information.");
        setLoading(false);
      });
  }, [API_URL]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Handle avatar upload
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must not exceed 5MB.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setError("You are not logged in.");
      return;
    }

    setUploadingAvatar(true);
    setError("");

    try {
      const formDataObj = new FormData();
      formDataObj.append("image", file);

      const response = await axios.post(
        `${API_URL}/upload/avatar`,
        formDataObj,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.success) {
        const newAvatarUrl = response.data.imageUrl;
        setFormData((prev) => ({
          ...prev,
          avatarUrl: newAvatarUrl,
        }));

        if (user) {
          setUser((prev) => ({
            ...prev,
            avatarUrl: newAvatarUrl,
          }));
        }

        setSuccessMsg("✅ Avatar updated successfully!");
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        setError(response.data.message || "Avatar upload failed.");
      }
    } catch (err) {
      console.error("Avatar upload error:", err);
      setError(
        err.response?.data?.message || "Avatar upload failed. Please try again."
      );
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  const handleSave = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("You are not logged in.");
      return;
    }

    setError("");
    setSuccessMsg("");

    try {
      const res = await axios.put(`${API_URL}/user/profile`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUser(res.data.user);
      setFormData({
        fullName: res.data.user.fullName || "",
        email: res.data.user.email || "",
        avatarUrl: res.data.user.avatarUrl || "",
      });
      setIsEditing(false);
      setSuccessMsg(res.data.message || "Profile updated successfully!");

      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error(err);
      if (err.response) {
        setError(
          err.response.data.message || "Update failed. Please try again."
        );
      } else {
        setError("Update failed. Please try again.");
      }
    }
  };

  if (loading) return <p className="profile-loading">Loading...</p>;
  if (error && !user) return <p className="profile-error">{error}</p>;
  if (!user) return null;

  // Teacher info
  const levelInfo = user.roles?.includes("teacher") ? getLevelInfo(user.level) : null;
  const commissionRate = user.roles?.includes("teacher") ? COMMISSION_RATES[user.level] : null;
  const stats = user.roles?.includes("teacher") ? user.teacherStats : null;

  // Student info
  const tierInfo = user.roles?.includes("student") ? getTierInfo(user.studentTier?.level) : null;
  const studentTier = user.roles?.includes("student") ? user.studentTier : null;

  const renderStars = (rating) => {
    const rate = Math.round(rating || 0);
    return "★".repeat(rate) + "☆".repeat(5 - rate);
  };

  return (
    <div className="profile-page">
      <div className="profile-card">
        {error && <p className="profile-error">{error}</p>}

        {/* Avatar */}
        <div className="avatar-section">
          <img
            src={
              formData.avatarUrl ||
              "https://cdn-icons-png.flaticon.com/512/847/847969.png"
            }
            alt="avatar"
            className="profile-avatar"
          />

          {!isEditing && (
            <label className="avatar-upload-label">
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={uploadingAvatar}
                className="avatar-file-input"
                title="Select avatar"
              />
              <span className="upload-icon">
                {uploadingAvatar ? "⏳" : "📷"}
              </span>
              
            </label>
          )}
        </div>

        {isEditing ? (
          <>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Full Name"
            />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Email"
            />
            <input
              type="text"
              name="avatarUrl"
              value={formData.avatarUrl}
              onChange={handleChange}
              placeholder="Avatar URL (optional)"
            />
            <div className="profile-buttons">
              <button onClick={handleSave} className="save-btn">
                Save
              </button>
              <button onClick={() => setIsEditing(false)} className="cancel-btn">
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <h2>{user.fullName}</h2>
            <p>
              <strong>Username:</strong> {user.username}
            </p>
            <p>
              <strong>Email:</strong> {user.email}
            </p>
            <p>
              <strong>Joined:</strong>{" "}
              {new Date(user.createdAt).toLocaleDateString("en-US")}
            </p>

            {/* Teacher stats */}
            {user.roles?.includes("teacher") && levelInfo && commissionRate && stats && (
              <div className="teacher-stats">
                <h3>Teaching Level</h3>

                <div
                  className="level-badge"
                  style={{ borderColor: commissionRate.color }}
                >
                  <span className="level-icon">{levelInfo.icon}</span>
                  <div className="level-content">
                    <span className="level-name">{levelInfo.name}</span>
                    <span className="level-desc">{levelInfo.description}</span>
                  </div>
                </div>

                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-label">Students Purchased</span>
                    <span className="stat-value">{stats.totalStudents || 0}</span>
                  </div>

                  <div className="stat-item rating-item">
                    <span className="stat-label"> Rating</span>
                    <span className="stat-value">
                      {(stats.averageRating || 0).toFixed(1)}
                    </span>
                    <span className="rating-stars">
                      {renderStars(stats.averageRating)}
                    </span>
                  </div>

                  <div className="stat-item">
                    <span className="stat-label"> Courses</span>
                    <span className="stat-value">{stats.totalCourses || 0}</span>
                  </div>

                  <div className="stat-item">
                    <span className="stat-label"> Total Earnings</span>
                    <span className="stat-value">
                      {(stats.totalEarnings || 0).toLocaleString("en-US")} $
                    </span>
                  </div>
                </div>

                <div className="commission-info">
                  <h4>Commission Info</h4>
                  <p>When a student purchases your course:</p>
                  <div className="commission-breakdown">
                    <div className="breakdown-item">
                      <span className="label">Platform fee:</span>
                      <span className="value" style={{ color: "#e74c3c" }}>
                        {Math.round(commissionRate.platformFee * 100)}%
                      </span>
                    </div>
                    <div className="breakdown-item">
                      <span className="label">You earn:</span>
                      <span className="value" style={{ color: "#27ae60" }}>
                        {Math.round(commissionRate.teacherEarns * 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rating-progress">
                  <h4>Upgrade Progress</h4>
                  <div className="progress-content">
                    <div className="progress-stat">
                      <span className="label">Current Rating:</span>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${
                              Math.min((stats.averageRating || 0) / 5, 1) * 100
                            }%`,
                          }}
                        />
                      </div>
                      <span className="progress-text">
                        {(stats.averageRating || 0).toFixed(1)}/5.0
                      </span>
                    </div>

                    <div className="progress-stat">
                      <span className="label">Total Students:</span>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${Math.min(
                              (stats.totalStudents || 0) / 20000,
                              1
                            ) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="progress-text">
                        {stats.totalStudents || 0}/20,000
                      </span>
                    </div>
                  </div>
                </div>

                <div className="level-requirements">
                  <h4>Upgrade Requirements</h4>
                  <div className="requirements-grid">
                    {[
                      { level: "Silver", students: 1000, rating: 4.0 },
                      { level: "Gold", students: 5000, rating: 4.5 },
                      { level: "Platinum", students: 20000, rating: 4.8 },
                    ].map((req) => {
                      const canUpgrade =
                        (stats.totalStudents || 0) >= req.students &&
                        (stats.averageRating || 0) >= req.rating;

                      return (
                        <div
                          key={req.level}
                          className={`requirement-item ${
                            canUpgrade ? "eligible" : ""
                          }`}
                        >
                          <span className="level-badge-small">{req.level}</span>
                          <small>
                            👥 {req.students}+ | ⭐ {req.rating}+
                          </small>
                          {canUpgrade && (
                            <span className="eligible-badge">✅ Eligible</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Student stats */}
            {user.roles?.includes("student") && tierInfo && studentTier && (
              <div className="student-stats">
                <h3> Study Rank</h3>

                <div className="tier-badge" style={{ borderColor: tierInfo.color }}>
                  <span className="tier-name">{tierInfo.name}</span>
                  <span className="discount-badge">
                    Discount {studentTier.discountPercentage}%
                  </span>
                </div>

                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-label"> Courses Purchased</span>
                    <span className="stat-value">{studentTier.enrolledCount || 0}</span>
                  </div>

                  <div className="stat-item">
                    <span className="stat-label"> Total Spent</span>
                    <span className="stat-value">
                      {(studentTier.totalSpent || 0).toLocaleString("en-US")} $
                    </span>
                  </div>

                  <div className="stat-item">
                    <span className="stat-label"> Membership Tier</span>
                    <span className="stat-value">{tierInfo.name}</span>
                  </div>
                </div>

                <div className="tier-progress">
                  <h4>📈 Upgrade Progress</h4>
                  <div className="progress-content">
                    <div className="progress-stat">
                      <span className="label">
                        Courses: {studentTier.enrolledCount} / {tierInfo.next || "∞"}
                      </span>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${
                              tierInfo.next
                                ? Math.min(
                                    (studentTier.enrolledCount / tierInfo.next) * 100,
                                    100
                                  )
                                : 100
                            }%`,
                          }}
                        />
                      </div>
                      <span className="progress-text">
                        {tierInfo.next
                          ? `${tierInfo.next - studentTier.enrolledCount} more courses to upgrade`
                          : "🏆 Max tier reached"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="tier-benefits">
                  <h4>🎁 Membership Benefits</h4>
                  <ul className="benefits-list">
                    <li>✅ {studentTier.discountPercentage}% discount on all courses</li>
                    <li>✅ Priority support from instructors</li>
                    <li>✅ Access to exclusive learning materials</li>
                    <li>✅ Completion certificates</li>
                  </ul>
                </div>

                <div className="tier-requirements">
                  <h4>🎯 Upgrade Requirements</h4>
                  <div className="requirements-grid">
                    {[
                 
                      { tier: "Silver 🥈", courses: 5, discount: 5 },
                      { tier: "Gold 🏅", courses: 15, discount: 10 },
                      { tier: "Platinum 💎", courses: 30, discount: 15 },
                    ].map((req) => {
                      const canUpgrade = (studentTier.enrolledCount || 0) >= req.courses;

                      return (
                        <div
                          key={req.tier}
                          className={`requirement-item ${
                            canUpgrade ? "eligible" : ""
                          }`}
                        >
                          <span className="tier-badge-small">{req.tier}</span>
                          <small>
                            {req.courses} courses | 💰 -{req.discount}%
                          </small>
                          {canUpgrade && (
                            <span className="eligible-badge">✅ Eligible</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <button onClick={() => setIsEditing(true)} className="edit-btn">
              Edit Profile
            </button>
          </>
        )}

        {successMsg && <p className="success-message">{successMsg}</p>}
      </div>
    </div>
  );
}
