import React, { useEffect, useState } from "react";
import styles from "./AddCourseForm.module.css";

export default function AddCourseForm({ token, onCourseAdded }) {
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [course, setCourse] = useState({
    title: "",
    description: "",
    price: "",
    isFree: false,
    thumbnail: "",
    accessType: "public",
  });

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

  /* ================= FETCH CATEGORIES ================= */
  useEffect(() => {
    fetch(`${API_URL}/categories`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setCategories(data.data);
        }
      })
      .catch((err) => console.error("❌ Error loading categories:", err));
  }, [API_URL]);

  /* ================= HANDLE CHANGE ================= */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "accessType" && value === "private") {
      setCourse({
        ...course,
        accessType: "private",
        isFree: true,
        price: "",
      });
      return;
    }

    setCourse({
      ...course,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  /* ================= HANDLE THUMBNAIL UPLOAD ================= */
  const handleThumbnailUpload = async (file) => {
    if (!file || !file.type.startsWith("image/")) {
      alert("❌ Please select an image file!");
      return;
    }

    setUploadingThumbnail(true);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch(`${API_URL}/upload/image`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.imageUrl) {
        setCourse({
          ...course,
          thumbnail: data.imageUrl,
        });
        alert("✅ Image uploaded successfully!");
      } else {
        alert("❌ Upload failed: " + (data.message || "Server error"));
      }
    } catch (error) {
      alert("❌ Upload error: " + error.message);
    } finally {
      setUploadingThumbnail(false);
    }
  };

  /* ================= DRAG & DROP ================= */
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleThumbnailUpload(files[0]);
    }
  };

  /* ================= FILE INPUT ================= */
  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleThumbnailUpload(file);
    }
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedCategories.length === 0) {
      alert("❗ Please select at least 1 category");
      return;
    }

    if (!course.title.trim()) {
      alert("❗ Course title is required");
      return;
    }

    if (!course.description.trim()) {
      alert("❗ Course description is required");
      return;
    }

    setSubmitting(true);

    const payload = {
      ...course,
      categories: selectedCategories,
    };

    try {
      const res = await fetch(`${API_URL}/courses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // ✅ Check if user became teacher
        if (data.becameTeacher) {
          const user = JSON.parse(localStorage.getItem("user"));
          if (user && !user.roles.includes("teacher")) {
            user.roles.push("teacher");
            user.isInstructor = true;
            localStorage.setItem("user", JSON.stringify(user));
            
            // Show congratulations message
            alert(`🎉 ${data.message}\n\nYour course has been submitted for admin review. Once approved, you'll officially become an instructor!`);
          }
        } else {
          alert("✅ Course created successfully! Pending admin approval.");
        }

        // Call parent callback
        if (onCourseAdded) {
          onCourseAdded(data.course);
        }

        // Reset form
        setCourse({
          title: "",
          description: "",
          price: "",
          isFree: false,
          thumbnail: "",
          accessType: "public",
        });
        setSelectedCategories([]);

        // Optional: Redirect or refresh
        // window.location.reload();
      } else {
        alert("❌ " + (data.message || data.error || "Failed to create course"));
      }
    } catch (error) {
      console.error("❌ Error creating course:", error);
      alert("❌ Network error: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  /* ================= UI ================= */
  return (
    <div className={styles.addCourseForm}>
      <div className={styles.formHeader}>
        <h3>Create New Course</h3>
        <p className={styles.formSubtitle}>
          Create your first course and become an instructor!
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label htmlFor="title">Course Title *</label>
          <input
            id="title"
            name="title"
            placeholder="e.g., Complete Web Development Bootcamp"
            value={course.title}
            onChange={handleChange}
            required
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="description">Course Description *</label>
          <textarea
            id="description"
            name="description"
            placeholder="Describe what students will learn in this course..."
            value={course.description}
            onChange={handleChange}
            required
            rows={6}
            className={styles.textarea}
          />
        </div>

        {/* ===== CATEGORY CHECKBOX ===== */}
        <div className={styles.formGroup}>
          <label>Select Categories *</label>
          <div className={styles.categoryGroup}>
            {categories.map((cat) => (
              <label key={cat._id} className={styles.categoryCheckbox}>
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(cat._id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedCategories((prev) => [...prev, cat._id]);
                    } else {
                      setSelectedCategories((prev) =>
                        prev.filter((id) => id !== cat._id)
                      );
                    }
                  }}
                />
                <span className={styles.checkboxLabel}>{cat.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* ===== DRAG & DROP THUMBNAIL ===== */}
        <div className={styles.formGroup}>
          <label>Course Thumbnail</label>
          <div
            className={`${styles.thumbnailDropZone} ${
              isDragging ? styles.dragging : ""
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="thumbnail-input"
              className={styles.hiddenInput}
              accept="image/*"
              onChange={handleFileInputChange}
              disabled={uploadingThumbnail}
            />
            <label htmlFor="thumbnail-input" className={styles.dropLabel}>
              {uploadingThumbnail ? (
                <div className={styles.uploadingText}>
                  <div className={styles.spinner}></div>
                  <span>Uploading...</span>
                </div>
              ) : (
                <>
                  <div className={styles.dropIcon}>📸</div>
                  <div className={styles.dropText}>
                    Drag & drop image or click to select
                  </div>
                  <div className={styles.dropHint}>
                    Supported: JPG, PNG, GIF (Max 5MB)
                  </div>
                </>
              )}
            </label>
          </div>

          {/* ===== OR PASTE URL ===== */}
          <div className={styles.urlInputGroup}>
            <label htmlFor="thumbnail-url">Or paste image URL:</label>
            <input
              id="thumbnail-url"
              name="thumbnail"
              type="url"
              placeholder="https://example.com/image.jpg"
              value={course.thumbnail}
              onChange={handleChange}
              className={styles.input}
            />
          </div>

          {/* ===== PREVIEW ===== */}
          {course.thumbnail && (
            <div className={styles.thumbnailPreview}>
              <img
                src={course.thumbnail}
                alt="Course thumbnail preview"
                onError={() => {
                  alert("❌ Cannot load image from this URL");
                  setCourse({ ...course, thumbnail: "" });
                }}
              />
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => setCourse({ ...course, thumbnail: "" })}
              >
                ✕ Remove
              </button>
            </div>
          )}
        </div>

        {/* ===== ACCESS TYPE ===== */}
        <div className={styles.formGroup}>
          <label htmlFor="accessType">Course Access Type</label>
          <select
            id="accessType"
            name="accessType"
            value={course.accessType}
            onChange={handleChange}
            className={styles.select}
          >
            <option value="public">🌍 Public (Anyone can enroll)</option>
            <option value="private">🔒 Private (Requires approval)</option>
          </select>
          <p className={styles.hint}>
            {course.accessType === "private"
              ? "Private courses are always free and require your approval for enrollment"
              : "Public courses can be free or paid"}
          </p>
        </div>

        {/* ===== PRICING (Only for public courses) ===== */}
        {course.accessType === "public" && (
          <>
            <div className={styles.formGroup}>
              <label className={styles.checkboxLabelInline}>
                <input
                  type="checkbox"
                  name="isFree"
                  checked={course.isFree}
                  onChange={handleChange}
                />
                <span>This course is free</span>
              </label>
            </div>

            {!course.isFree && (
              <div className={styles.formGroup}>
                <label htmlFor="price">Course Price (VND)</label>
                <input
                  id="price"
                  type="number"
                  name="price"
                  placeholder="e.g., 500000"
                  value={course.price}
                  onChange={handleChange}
                  min="0"
                  step="1000"
                  required={!course.isFree}
                  className={styles.input}
                />
              </div>
            )}
          </>
        )}

        {/* ===== SUBMIT BUTTON ===== */}
        <button
          type="submit"
          className={styles.submitBtn}
          disabled={uploadingThumbnail || submitting}
        >
          {submitting ? (
            <>
              <span className={styles.spinner}></span>
              Creating Course...
            </>
          ) : (
            <>✨ Create Course</>
          )}
        </button>
      </form>
    </div>
  );
}