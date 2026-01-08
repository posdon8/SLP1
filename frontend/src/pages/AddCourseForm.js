import React, { useEffect, useState } from "react";
import styles from "./AddCourseForm.module.css";

export default function AddCourseForm({ token, onCourseAdded }) {
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

  const [course, setCourse] = useState({
    title: "",
    description: "",
    price: "",
    isFree: false,
    thumbnail: "",
    accessType: "public",
  });

  /* ================= FETCH CATEGORIES ================= */
  useEffect(() => {
    fetch("http://localhost:5000/api/categories")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setCategories(data.data);
        }
      })
      .catch(() => console.error("❌ Lỗi load category"));
  }, []);

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
      alert("❌ Vui lòng chọn file ảnh!");
      return;
    }

    setUploadingThumbnail(true);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("http://localhost:5000/api/upload/image", {
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
        alert("✅ Upload ảnh thành công!");
      } else {
        alert("❌ Upload thất bại: " + (data.message || "Lỗi server"));
      }
    } catch (error) {
      alert("❌ Lỗi upload: " + error.message);
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
      alert("❗ Vui lòng chọn ít nhất 1 danh mục");
      return;
    }

    const payload = {
      ...course,
      categories: selectedCategories,
    };

    try {
      const res = await fetch("http://localhost:5000/api/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        alert("✅ Tạo khóa học thành công!");
        onCourseAdded(data.course);

        setCourse({
          title: "",
          description: "",
          price: "",
          isFree: false,
          thumbnail: "",
          accessType: "public",
        });
        setSelectedCategories([]);
      } else {
        alert("❌ " + data.message);
      }
    } catch {
      alert("❌ Lỗi kết nối server");
    }
  };

  /* ================= UI ================= */
  return (
    <div className={styles.addCourseForm}>
      <h3>Thêm khóa học mới</h3>

      <input
        name="title"
        placeholder="Tên khóa học"
        value={course.title}
        onChange={handleChange}
        required
      />

      <textarea
        name="description"
        placeholder="Mô tả khóa học"
        value={course.description}
        onChange={handleChange}
        required
      />

      {/* ===== CATEGORY CHECKBOX ===== */}
      <div className={styles.categoryGroup}>
        <p> Chọn danh mục</p>
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
            {cat.name}
          </label>
        ))}
      </div>

      {/* ===== DRAG & DROP THUMBNAIL ===== */}
      <div
        className={`${styles.thumbnailDropZone} ${isDragging ? styles.dragging : ""}`}
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
            <div className={styles.uploadingText}>⏳ Đang upload...</div>
          ) : (
            <>
              <div className={styles.dropIcon}>📸</div>
              <div className={styles.dropText}>Kéo ảnh vào đây hoặc click để chọn</div>
            </>
          )}
        </label>
      </div>

      {/* ===== HOẶC PASTE URL ===== */}
      <label className={styles.urlLabel}>
        Hoặc dán link ảnh:
        <input
          name="thumbnail"
          placeholder="https://example.com/image.jpg"
          value={course.thumbnail}
          onChange={handleChange}
        />
      </label>

      {/* ===== PREVIEW ===== */}
      {course.thumbnail && (
        <div className={styles.thumbnailPreview}>
          <img
            src={course.thumbnail}
            alt="preview"
            onError={() => alert("❌ Không thể load ảnh từ URL này")}
          />
          <button
            type="button"
            className={styles.removeBtn}
            onClick={() => setCourse({ ...course, thumbnail: "" })}
          >
            ❌ Xóa ảnh
          </button>
        </div>
      )}

      <label>
        🔐 Loại khóa học
        <select
          name="accessType"
          value={course.accessType}
          onChange={handleChange}
        >
          <option value="public">🌍 Public</option>
          <option value="private">🔒 Private</option>
        </select>
      </label>

      {course.accessType === "public" && (
        <label>
          <input
            type="checkbox"
            name="isFree"
            checked={course.isFree}
            onChange={handleChange}
          />
          Miễn phí
        </label>
      )}

      {course.accessType === "public" && !course.isFree && (
        <input
          type="number"
          name="price"
          placeholder="Giá (VNĐ)"
          value={course.price}
          onChange={handleChange}
          min="0"
        />
      )}

      <button 
        type="button" 
        className={styles.submitBtn}
        onClick={handleSubmit} 
        disabled={uploadingThumbnail}
      >
        ➕ Tạo khóa học
      </button>
    </div>
  );
}