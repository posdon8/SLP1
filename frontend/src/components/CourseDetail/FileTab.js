import React, { useState } from "react";
import axios from "axios";
import './FileTab.css';

export default function FileTab({ course, onResourceAdded, isEditMode }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState("PDF");
  const [draggedFile, setDraggedFile] = useState(false);
  const [uploading, setUploading] = useState(false);

  const user = JSON.parse(localStorage.getItem("user"));
const isTeacher = user?.roles?.includes("teacher");
  const isOwner =
    course.teacher &&
    (course.teacher._id
      ? course.teacher._id.toString() === user._id
      : course.teacher.toString() === user._id);

  // ✅ Xử lý kéo thả file
  const handleFileDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedFile(true);
  };

  const handleFileDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedFile(false);
  };

  const handleFileDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedFile(false);

    const file = e.dataTransfer.files[0];
    if (!file) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Upload file lên server
      const token = localStorage.getItem("token");
      const uploadRes = await axios.post(
        `${process.env.REACT_APP_API_URL}/upload/file`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (uploadRes.data.success) {
        // Tự động fill thông tin từ file uploaded
        const fileName = file.name.split('.')[0];
        const fileExt = file.name.split('.').pop().toUpperCase();

        setName(fileName);
        setUrl(uploadRes.data.fileUrl);
        setType(fileExt || "FILE");

        alert("✅ Upload file thành công!");
      } else {
        alert("❌ " + (uploadRes.data.message || "Lỗi upload file"));
      }
    } catch (err) {
      console.error(err);
      alert("❌ Lỗi upload file: " + (err.response?.data?.message || err.message));
    } finally {
      setUploading(false);
    }
  };

  const handleAddResource = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    if (!name || !url || !type) {
      alert("⚠️ Vui lòng nhập đầy đủ thông tin tài liệu!");
      return;
    }

    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_URL}/courses/${course._id}/add-resource`,
        { name, url, type },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert("✅ Thêm tài liệu thành công!");

      if (onResourceAdded) onResourceAdded(res.data.course);

      setName("");
      setUrl("");
      setType("PDF");
    } catch (err) {
      alert("❌ Lỗi khi thêm tài liệu: " + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteResource = async (resourceId) => {
    if (!window.confirm("Bạn có chắc muốn xoá tài liệu này không?")) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/courses/${course._id}/resources/${resourceId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert("🗑️ Xoá tài liệu thành công!");
      if (onResourceAdded) onResourceAdded();
    } catch (err) {
      alert("❌ Lỗi khi xoá tài liệu: " + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="course-file"> 
    {course.resources && course.resources.length > 0 && (
        <div className="course-resources">
          <h3> Tài liệu khóa học ({course.resources.length})</h3>
          <ul className="resources-list">
            {course.resources.map((res, i) => (
              <li key={i} className="resource-item">
                <a 
                href={
                  res.url?.startsWith("http")
                    ? res.url
                    : `${process.env.REACT_APP_API_URL.replace("/api", "")}/${res.url.replace(/^\//, "")}`
                }
                target="_blank"
                rel="noreferrer"
              >
                  📄 {res.name}
                </a>
                <span className="resource-type">{res.type}</span>
                {isTeacher && isOwner && (
                  <button
                    onClick={() => handleDeleteResource(res._id)}
                    className="btn-delete-resource"
                  >
                    🗑️
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {isEditMode && isTeacher && isOwner && (
        <>
          {/* ✅ Kéo thả file */}
          <div
            className={`file-drop-zone ${draggedFile ? "dragging" : ""} ${uploading ? "uploading" : ""}`}
            onDragOver={handleFileDragOver}
            onDragLeave={handleFileDragLeave}
            onDrop={handleFileDrop}
          >
            {uploading ? (
              <span>⏳ Đang upload...</span>
            ) : (
              <>
                <span className="drop-icon">📄</span>
                <span className="drop-text">
                  {url ? "✅ File đã chọn" : "Kéo thả file tài liệu vào đây"}
                </span>
              </>
            )}
          </div>

          {url && (
            <div className="file-preview">
              <p><strong>📋 File đã chọn:</strong> {url.split('/').pop()}</p>
              <button
                type="button"
                onClick={() => {
                  setUrl("");
                  setName("");
                }}
                className="btn-remove"
              >
                ✖️ Xóa file
              </button>
            </div>
          )}

          {/* Form thêm tài liệu */}
          <form onSubmit={handleAddResource} className="add-resource-form">
            <input
              type="text"
              placeholder="Tên tài liệu *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="URL tài liệu (tự động điền khi upload) *"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              readOnly
            />
            <input
              type="text"
              placeholder="Loại file (PDF, DOCX, ZIP...) *"
              value={type}
              onChange={(e) => setType(e.target.value)}
              required
            />
            <button type="submit" disabled={uploading}>
              ➕ Thêm tài liệu
            </button>
          </form>
        </>
      )}

      {/* Danh sách tài liệu */}
     

      {(!course.resources || course.resources.length === 0) && !isTeacher && (
        <div className="empty-resources">
          <p>📭 Chưa có tài liệu nào cho khóa học này.</p>
        </div>
      )}
    </div>
  );
}