import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "./CourseReview.css";
import PaymentModal from "./PaymentModal";
import { useCart } from "../context/CartContext";


export default function CourseReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const { addToCart, removeFromCart, cartItems } = useCart();
  
  const [course, setCourse] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  // ✅ Track nếu course đã trong giỏ
  const [inCart, setInCart] = useState(false);

  // ✅ API URL
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    // ✅ Fetch user profile (lấy studentTier)
    axios.get(`${API_URL}/user/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      console.log("✅ User loaded:", res.data);
      setUser(res.data);
    })
    .catch(err => console.error("❌ Error fetching user:", err));

    // ✅ Fetch course
    if (id) {
      axios.get(`${API_URL}/courses/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        console.log("✅ Course loaded:", res.data);
        setCourse(res.data.course || res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("❌ Error fetching course:", err);
        setLoading(false);
      });
    }
  }, [id, token, API_URL]);

  // ✅ Update inCart state khi cartItems thay đổi
  useEffect(() => {
    if (course && cartItems) {
      const courseInCart = cartItems.some(item => item._id === course._id);
      setInCart(courseInCart);
      console.log(`🛒 Course ${course._id} in cart:`, courseInCart);
    }
  }, [cartItems, course]);

  // ✅ Lắng nghe event cartUpdated
  useEffect(() => {
    const handleCartUpdate = () => {
      if (course) {
        const courseInCart = cartItems.some(item => item._id === course._id);
        setInCart(courseInCart);
      }
    };

    window.addEventListener("cartUpdated", handleCartUpdate);
    return () => window.removeEventListener("cartUpdated", handleCartUpdate);
  }, [course, cartItems]);

  const sampleLesson = course?.lessons?.[0] || null;

  if (loading) {
    return (
      <div className="course-review-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Đang tải khóa học...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="course-review-container">
        <div className="error-state">
          <h2>❌ Không tìm thấy khóa học</h2>
          <button className="btn-back" onClick={() => navigate(-1)}>⬅️ Quay lại</button>
        </div>
      </div>
    );
  }

  const renderStars = (rating) => {
    if (!rating || rating === 0) return "Chưa có đánh giá";
    return (
      <span className="stars-display">
        {"⭐".repeat(Math.round(rating))}
        <span className="rating-value">({rating}/5)</span>
      </span>
    );
  };

  // ✅ Handle add to cart
  const handleAddToCart = () => {
    addToCart(course);
    setInCart(true);
    console.log("✅ Added to cart:", course.title);
  };

  // ✅ Handle remove from cart
  const handleRemoveFromCart = () => {
    removeFromCart(course._id);
    setInCart(false);
    console.log("✅ Removed from cart:", course.title);
  };

  return (
    <div className="course-review-container">
      {/* BANNER */}
      <div className="review-banner">
        <img
          src={course.thumbnail || "/default-banner.jpg"}
          alt={course.title}
          className="banner-image"
          onError={(e) => {
            e.target.src = "https://via.placeholder.com/800x400";
          }}
        />
        <div className="banner-overlay"></div>
        <div className="banner-content">
          <h1 className="course-title">{course.title}</h1>
          <div className="course-meta">
            <p className="meta-item">👨‍🏫 <span>{course.teacher?.fullName || "Chưa cập nhật"}</span></p>
            <p className="meta-item">⭐ <span>{renderStars(course.rating)}</span></p>
            <p className="meta-item">⏱️ <span>{course.totalDuration || 0} phút</span></p>
            <p className="meta-item">💪 <span>{course.level || "Mọi trình độ"}</span></p>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="review-content">
        <div className="review-main">
          {/* Giới thiệu */}
          <section className="content-section">
            <h2 className="section-title">📖 Giới thiệu khóa học</h2>
            <p className="section-description">{course.description}</p>
          </section>

          {/* Bài học mẫu */}
          <section className="content-section">
            <h2 className="section-title">🎬 Xem trước bài học</h2>
            {sampleLesson ? (
              <div className="sample-lesson">
                <div className="lesson-header">
                  <h3>{sampleLesson.title}</h3>
                  <span className="badge-sample">Mẫu</span>
                </div>
                <video src={sampleLesson.videoUrl} controls className="lesson-video" />
              </div>
            ) : (
              <p className="empty-state">📭 Khóa học chưa có bài học mẫu</p>
            )}
          </section>

          {/* Đánh giá */}
          <section className="content-section">
            <h2 className="section-title">💬 Đánh giá từ học viên</h2>
            {course.reviews && course.reviews.length > 0 ? (
              <div className="reviews-list">
                {course.reviews.map((review, idx) => (
                  <div key={idx} className="review-card">
                    <div className="review-header">
                      <strong className="reviewer-name">{review.user}</strong>
                      <span className="review-rating">{"⭐".repeat(review.stars)}</span>
                    </div>
                    <p className="review-text">{review.comment}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-state">📭 Chưa có đánh giá nào</p>
            )}
          </section>
        </div>

        {/* SIDEBAR */}
        <div className="review-sidebar">
          <div className="purchase-card">
            <div className="price-section">
              <label className="price-label">Giá khóa học</label>
              <div className="price-amount">{course.price?.toLocaleString()}đ</div>
            </div>

            <div className="button-group">
              <button className="btn btn-primary" onClick={() => setShowPaymentModal(true)}>
                💳 Mua ngay
              </button>

              {/* ✅ FIX: Sử dụng state inCart thay vì isInCart() */}
              {inCart ? (
                <button 
                  className="btn btn-secondary" 
                  onClick={handleRemoveFromCart}
                >
                  ✓ Đã thêm vào giỏ
                </button>
              ) : (
                <button 
                  className="btn btn-primary" 
                  onClick={handleAddToCart}
                >
                  🛒 Thêm vào giỏ
                </button>
              )}

              <button className="btn btn-secondary" onClick={() => navigate(-1)}>
                ⬅️ Quay lại
              </button>
            </div>

            <div className="benefits">
              <h3 className="benefits-title">✨ Bạn sẽ nhận được</h3>
              <ul className="benefits-list">
                <li>✅ Truy cập vĩnh viễn</li>
                <li>✅ Cập nhật nội dung mới</li>
                <li>✅ Hỗ trợ từ giảng viên</li>
                <li>✅ Chứng chỉ hoàn thành</li>
              </ul>
            </div>

            <div className="guarantee">
              <p>🛡️ Đảm bảo hoàn tiền 30 ngày nếu không hài lòng</p>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Payment Modal - Pass user object & course */}
      {showPaymentModal && (
        <PaymentModal 
          mode="single"
          course={course}
          courses={[course]}
          courseIds={[course._id]}
          token={token}
          studentTier={user?.studentTier}
          onClose={() => setShowPaymentModal(false)}
        />
      )}
    </div>
  );
}