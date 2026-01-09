import React, { useEffect, useState } from "react";
import "./CourseApproval";

const API_URL = `${process.env.REACT_APP_API_URL}/categories`;

export default function CategoryManage() {
  const token = localStorage.getItem("token");
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    name: "",
    description: ""
  });
  const [editingId, setEditingId] = useState(null);

  /* =========================
     FETCH
  ========================= */
  const fetchCategories = async () => {
    const res = await fetch(`${API_URL}/admin`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) setCategories(data.data);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  /* =========================
     CREATE / UPDATE
  ========================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    const url = editingId ? `${API_URL}/${editingId}` : API_URL;
    const method = editingId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(form)
    });

    const data = await res.json();

    if (res.ok) {
      alert(editingId ? "Đã cập nhật category" : "Đã tạo category");
      setForm({ name: "", description: "" });
      setEditingId(null);
      fetchCategories();
    } else {
      alert("❌ " + data.message);
    }
  };

  /* =========================
     ACTIONS
  ========================= */
  const handleEdit = (cat) => {
    setEditingId(cat._id);
    setForm({
      name: cat.name,
      description: cat.description || ""
    });
  };

  const toggleActive = async (cat) => {
    await fetch(`${API_URL}/${cat._id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ isActive: !cat.isActive })
    });
    fetchCategories();
    window.dispatchEvent(new Event("categoriesUpdated"));
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Xóa category này?")) return;
    await fetch(`${API_URL}/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchCategories();
  };

  /* =========================
     UI
  ========================= */
  return (
    <div className="category-manage">
      <h2>Quản lý Category</h2>

      <form onSubmit={handleSubmit} className="category-form">
        <input
          placeholder="Tên category"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          placeholder="Mô tả"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <button type="submit">
          {editingId ? "💾 Cập nhật" : "➕ Tạo mới"}
        </button>
      </form>

      <table>
        <thead>
          <tr>
            <th>Tên</th>
            <th>Slug</th>
            <th>Tình trạng</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {categories.map(cat => (
            <tr key={cat._id}>
              <td>{cat.name}</td>
              <td>{cat.slug}</td>
              <td>
                <span className={cat.isActive ? "active" : "inactive"}>
                  {cat.isActive ? "ON" : "OFF"}
                </span>
              </td>
              <td>
                <button onClick={() => handleEdit(cat)}>✏️</button>
                <button onClick={() => toggleActive(cat)}>🔁</button>
                <button onClick={() => handleDelete(cat._id)}>🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
