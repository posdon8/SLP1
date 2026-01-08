import React, { useEffect, useState } from "react";
import "./NewsBanner.css"
const API_URL = "http://localhost:5000/api";

export default function NewsBanner({ onSelectNews }) {
  const [news, setNews] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        
        const headers = {
          "Content-Type": "application/json",
        };
        
        // ✅ Gửi token nếu có
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const res = await fetch(`${API_URL}/news?status=published`, {
          headers,
        });

        if (!res.ok) {
          // Nếu 401 và không có token, thử lại không token
          if (res.status === 401 && !token) {
            const res2 = await fetch(`${API_URL}/news?status=published`);
            if (!res2.ok) throw new Error(`API Error: ${res2.status}`);
            const data = await res2.json();
            if (data.success && data.data && Array.isArray(data.data)) {
              setNews(data.data.slice(0, 5));
              setError(null);
            }
            setLoading(false);
            return;
          }
          throw new Error(`API Error: ${res.status}`);
        }

        const data = await res.json();

        if (data.success && data.data && Array.isArray(data.data)) {
          setNews(data.data.slice(0, 5));
          setError(null);
        } else {
          console.warn("⚠️ No news data:", data);
          setNews([]);
        }
      } catch (err) {
        console.error("❌ Fetch news error:", err);
        setError(err.message);
        setNews([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  // Auto slide
  useEffect(() => {
    if (news.length === 0) return;

    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % news.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [news]);

  // Không có tin
  if (loading) {
    return (
      <div className="news-banner-loading">
        <p>⏳ Đang tải tin tức...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="news-banner-error">
        <p>❌ Lỗi: {error}</p>
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div className="news-banner-empty">
        <p>Chưa có tin tức nào</p>
      </div>
    );
  }

  const current = news[index];

 return (
  <div
    className="news-banner"
    onClick={() => onSelectNews?.(current._id)}
  >
    {/* LEFT – solid color + content */}
   
      <div className="news-banner-content">
        <span className="news-tag">{current.category}</span>
        <h2>{current.title}</h2>
        <p>
  {String(current.description || "")
    .slice(0, 60)}
  {String(current.description || "").length > 60 && "..."}
</p>



        <div className="news-indicators">
          {news.map((_, i) => (
            <span
              key={i}
              className={i === index ? "dot active" : "dot"}
              onClick={(e) => {
                e.stopPropagation();
                setIndex(i);
              }}
            />
          ))}
        </div>
      </div>


    {/* RIGHT – image + fade sang trái */}
    <div
      className="news-banner-right"
      style={{ backgroundImage: `url(${current.thumbnail})` }}
    />
  </div>
);
}