import React, { useState } from "react";
import axios from "axios";
import { calculateDiscount, getTierInfo, formatCurrencyVND } from "../utils/discount";
import "./CourseCheckout.css";

export default function CourseCheckout({ course, student }) {
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [discountBreakdown, setDiscountBreakdown] = useState(null);

  const token = localStorage.getItem("token");
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

  // ✅ Apply coupon
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setError("Nhập mã coupon");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await axios.post(
        `${API_URL}/coupon/apply`,
        {
          code: couponCode,
          coursePrice: course.price,
          courseId: course._id
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (res.data.success) {
        setAppliedCoupon(res.data.discount.coupon);
        setDiscountBreakdown(res.data.discount);
      } else {
        setError(res.data.message);
      }
    } catch (err) {
      setError("Coupon không hợp lệ");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Calculate final price
  const discount = calculateDiscount(
    course.price,
    appliedCoupon,
    student?.studentTier?.level
  );

  const tierInfo = getTierInfo(student?.studentTier?.level || 'bronze');

  return (
    <div className="checkout-container">
      <div className="checkout-card">
        <h2>{course.title}</h2>

        {/* Course Price */}
        <div className="price-section">
          <div className="price-row">
            <span>Giá khóa học:</span>
            <span className="price-original">
              {formatCurrencyVND(course.price)}
            </span>
          </div>

          {/* Student Tier Discount */}
          {student?.studentTier?.discountPercentage > 0 && (
            <div className="price-row discount-row">
              <span>
                {tierInfo.name} ({student.studentTier.discountPercentage}%)
              </span>
              <span className="price-discount">
                -{formatCurrencyVND(discount.tierDiscount)}
              </span>
            </div>
          )}

          {/* Coupon Section */}
          <div className="coupon-section">
            <div className="coupon-input-group">
              <input
                type="text"
                placeholder="Nhập mã coupon..."
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                disabled={loading}
              />
              <button
                onClick={handleApplyCoupon}
                disabled={loading || !couponCode.trim()}
                className="btn-apply-coupon"
              >
                {loading ? "Kiểm tra..." : "Áp dụng"}
              </button>
            </div>

            {error && <p className="error-msg">{error}</p>}

            {appliedCoupon && (
              <div className="coupon-applied">
                <p>
                  ✅ Coupon <strong>{appliedCoupon.code}</strong> đã áp dụng
                </p>
                <p>
                  Giảm:{" "}
                  <strong>
                    {appliedCoupon.discountType === 'percentage'
                      ? `${appliedCoupon.discountValue}%`
                      : formatCurrencyVND(appliedCoupon.discountValue)}
                  </strong>
                </p>
              </div>
            )}
          </div>

          {/* Coupon Discount */}
          {discount.couponDiscount > 0 && (
            <div className="price-row discount-row">
              <span>Coupon</span>
              <span className="price-discount">
                -{formatCurrencyVND(discount.couponDiscount)}
              </span>
            </div>
          )}

          {/* Total Discount */}
          {discount.totalDiscount > 0 && (
            <div className="price-row total-savings">
              <span>Tiết kiệm:</span>
              <span className="price-saving">
                -{formatCurrencyVND(discount.totalDiscount)} ({discount.savingPercent}%)
              </span>
            </div>
          )}

          {/* Final Price */}
          <div className="price-row final-price">
            <span>Tổng cộng:</span>
            <span className="price-final">
              {formatCurrencyVND(discount.finalPrice)}
            </span>
          </div>
        </div>

        {/* Checkout Button */}
        <button className="btn-checkout">
          💳 Thanh toán {formatCurrencyVND(discount.finalPrice)}
        </button>

        {/* Student Tier Info */}
        {student && (
          <div className="student-info">
            <p>
              Bạn là <strong>{tierInfo.name}</strong> - Nhận{" "}
              <strong>{student.studentTier?.discountPercentage || 0}%</strong> discount
            </p>
            {student.studentTier?.level !== 'platinum' && (
              <p>
                Mua {tierInfo.next - (student.studentTier?.enrolledCount || 0)} khóa nữa để lên
                cấp cao hơn
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}