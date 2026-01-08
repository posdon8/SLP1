import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import "./PaymentModal.css";
import { calculateDiscount, formatCurrencyVND } from "../utils/discount";

export default function PaymentModal({ 
  mode = "single",
  courseIds = [],
  courses = [],
  course,
  voucherApplied: initialVoucher = null,
  discount: initialDiscount = null,
  onClose, 
  token, 
  studentTier
}) {
  const [step, setStep] = useState("info");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [checkoutData, setCheckoutData] = useState(null);
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherApplied, setVoucherApplied] = useState(initialVoucher);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherError, setVoucherError] = useState("");
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const formRef = useRef(null);

  // ✅ API Configuration
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

  // ✅ Fetch available coupons on mount
  useEffect(() => {
    const fetchAvailableCoupons = async () => {
      if (!token) {
        console.log("⚠️ No token, skipping coupon fetch");
        return;
      }

      try {
        console.log("📍 Fetching available coupons from:", `${API_URL}/coupon/available`);
        
        const res = await axios.get(`${API_URL}/coupon/available`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        console.log("✅ Coupons response:", res.data);
        
        if (res.data.success && Array.isArray(res.data.coupons)) {
          console.log("✅ Loaded coupons:", res.data.coupons.length);
          setAvailableCoupons(res.data.coupons);
        } else {
          console.warn("⚠️ No coupons in response or not successful");
          setAvailableCoupons([]);
        }
      } catch (err) {
        console.error("❌ Error fetching coupons:", err.message);
        console.error("❌ Status:", err.response?.status);
        console.error("❌ Error data:", err.response?.data);
        setAvailableCoupons([]);
      }
    };

    fetchAvailableCoupons();
  }, [token, API_URL]);

  // Detect mode
  const isMulti = mode === "cart" && courseIds.length > 0;
  const items = isMulti ? courses : (course ? [course] : []);
  const totalPrice = items.reduce(
  (sum, c) => sum + (c.price || 0),
  0
);
  // ✅ Use initial discount if provided, otherwise calculate
  let discountResult;
  if (initialDiscount && isMulti) {
    // Use discount from Cart (already calculated)
    discountResult = {
      originalPrice: initialDiscount.originalTotal || 0,
      couponDiscount: initialDiscount.couponDiscountTotal || 0,
      tierDiscount: initialDiscount.tierDiscountTotal || 0,
      finalPrice: initialDiscount.finalTotal || 0
    };
  } else {
    // Calculate for single course
    const totalPrice = items.reduce((sum, c) => sum + (c.price || 0), 0);
    discountResult = calculateDiscount(totalPrice, voucherApplied, studentTier);
  }

  // ✅ Handle Apply Voucher
  const handleApplyVoucher = async () => {
    // Validate input
    if (!voucherCode.trim()) {
      setVoucherError("Vui lòng nhập mã voucher");
      return;
    }

    if (voucherCode.length > 50) {
      setVoucherError("Mã voucher quá dài");
      return;
    }

    setVoucherLoading(true);
    setVoucherError("");

    try {
      const payload = isMulti 
        ? { code: voucherCode, courseIds, coursePrice: totalPrice }
        : { code: voucherCode, courseId: course._id, coursePrice: totalPrice };

      console.log("📍 Applying voucher:", payload);

      const res = await axios.post(
        `${API_URL}/coupon/apply`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("✅ Voucher response:", res.data);

      if (res.data.success && res.data.discount) {
        setVoucherApplied({
          code: res.data.discount.coupon.code,
          discountType: res.data.discount.coupon.type,
          discountValue: res.data.discount.coupon.value,
          finalPrice: res.data.discount.finalPrice, // ✅ Lấy final price từ server
        });
        setVoucherError("");
        setVoucherCode(""); // Clear input
      } else {
        setVoucherError(res.data.message || "Mã voucher không hợp lệ");
      }
    } catch (err) {
      console.error("❌ Voucher error:", err);
      setVoucherError(err.response?.data?.message || "Lỗi áp dụng voucher");
    } finally {
      setVoucherLoading(false);
    }
  };

  // ✅ Handle Checkout
  const handleCheckout = async () => {
    if (items.length === 0) {
      setError("Không có khóa học để thanh toán");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        courseIds: isMulti ? courseIds : [course._id],
        couponCode: voucherApplied?.code || null,
      };

      console.log("📍 Checkout payload:", payload);

      const res = await axios.post(
        `${API_URL}/payment/checkout`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("✅ Checkout response:", res.data);

      if (res.data.success && res.data.checkoutUrl && res.data.checkoutFields) {
        setCheckoutData({ 
          url: res.data.checkoutUrl, 
          fields: res.data.checkoutFields 
        });
        setStep("processing");
      } else {
        setError(res.data.error || "Lỗi tạo đơn hàng");
        setStep("failed");
      }
    } catch (err) {
      console.error("❌ Checkout error:", err);
      setError(err.response?.data?.message || err.message || "Lỗi thanh toán");
      setStep("failed");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Auto-submit form khi checkout
  useEffect(() => {
    if (step === "processing" && checkoutData && formRef.current) {
      console.log("📍 Submitting checkout form...");
      setTimeout(() => {
        formRef.current?.submit();
      }, 500);
    }
  }, [step, checkoutData]);

  return (
    <div className="payment-overlay" onClick={onClose}>
      <div className="payment-modal" onClick={(e) => e.stopPropagation()}>

        {/* ============ INFO STEP ============ */}
        {step === "info" && (
          <>
            <div className="modal-header">
              <h2>💳 {isMulti ? `${items.length} khóa học` : "Mua khóa học"}</h2>
              <button className="close-btn" onClick={onClose}>✕</button>
            </div>

            <div className="modal-body">
              {/* Courses List */}
              <div className="courses-list">
                {items.map((item) => (
                  <div key={item._id} className="course-item">
                    <img 
                      src={item.thumbnail || "https://via.placeholder.com/50"} 
                      alt={item.title}
                      onError={(e) => {
                        e.target.src = "https://via.placeholder.com/50";
                      }}
                    />
                    <div>
                      <h4>{item.title}</h4>
                      <p>{item.teacherName || item.teacher?.fullName || "Chưa cập nhật"}</p>
                    </div>
                    <span>{formatCurrencyVND(item.price)}</span>
                  </div>
                ))}
              </div>

              {/* Price & Voucher Section */}
              <div className="price-section">
                {/* Voucher Input */}
                <div className="voucher-box">
                  <input
                    type="text"
                    placeholder="Mã voucher (tùy chọn)"
                    value={voucherCode}
                    onChange={(e) => {
                      setVoucherCode(e.target.value.toUpperCase());
                      setVoucherError(""); // Clear error khi input thay đổi
                    }}
                    disabled={voucherApplied !== null}
                    maxLength="50"
                  />
                  {!voucherApplied ? (
                    <button 
                      onClick={handleApplyVoucher} 
                      disabled={voucherLoading || !voucherCode.trim()}
                      className="btn-apply-voucher"
                      type="button"
                    >
                      {voucherLoading ? "⏳" : "Áp dụng"}
                    </button>
                  ) : (
                    <button 
                      onClick={() => { 
                        setVoucherApplied(null); 
                        setVoucherCode("");
                        setVoucherError("");
                      }}
                      className="btn-remove-voucher"
                      title="Xóa mã voucher áp dụng"
                      type="button"
                    >
                      ❌ Xóa
                    </button>
                  )}
                </div>

                {/* Error/Success Messages */}
                {voucherError && <p className="error-msg">❌ {voucherError}</p>}
                {voucherApplied && (
                  <p className="success-msg">
                    ✅ Áp dụng mã {voucherApplied.code} 
                    {voucherApplied.discountType === "percentage" 
                      ? ` (${voucherApplied.discountValue}%)`
                      : ` (${formatCurrencyVND(voucherApplied.discountValue)})`
                    }
                  </p>
                )}

                {/* Available Coupons Dropdown */}
                {availableCoupons.length > 0 && !voucherApplied && (
                  <div className="available-coupons">
                    <button
                      className="btn-show-coupons"
                      onClick={() => setShowDropdown(!showDropdown)}
                      type="button"
                    >
                      💡 Xem mã voucher có sẵn ({availableCoupons.length})
                    </button>

                    {showDropdown && (
                      <ul className="voucher-dropdown">
                        {availableCoupons.map((coupon) => (
                          <li 
                            key={coupon._id}
                            onClick={() => {
                              setVoucherCode(coupon.code);
                              setShowDropdown(false);
                            }}
                            className="voucher-item"
                          >
                            <div className="coupon-code">{coupon.code}</div>
                            <div className="coupon-detail">
                              {coupon.discountType === "percentage" 
                                ? `Giảm ${coupon.discountValue}%`
                                : `Giảm ${formatCurrencyVND(coupon.discountValue)}`
                              }
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Price Breakdown */}
                <div className="price-breakdown">
                  <div className="row">
                    <span>Giá gốc</span>
                    <span>{formatCurrencyVND(discountResult.originalPrice)}</span>
                  </div>

                  {discountResult.couponDiscount > 0 && (
                    <div className="row discount">
                      <span>Voucher ({voucherApplied?.code})</span>
                      <span className="discount-amount">
                        -{formatCurrencyVND(discountResult.couponDiscount)}
                      </span>
                    </div>
                  )}

                  {discountResult.tierDiscount > 0 && (
                    <div className="row discount">
                      <span>Hạng thành viên</span>
                      <span className="discount-amount">
                        -{formatCurrencyVND(discountResult.tierDiscount)}
                      </span>
                    </div>
                  )}

                  <hr />

                  <div className="row total">
                    <strong>Thanh toán</strong>
                    <strong className="total-amount">
                      {formatCurrencyVND(discountResult.finalPrice)}
                    </strong>
                  </div>

                  {(discountResult.couponDiscount + discountResult.tierDiscount) > 0 && (
                    <p className="savings-text">
                      💰 Tiết kiệm: {formatCurrencyVND(
                        discountResult.couponDiscount + discountResult.tierDiscount
                      )}
                    </p>
                  )}
                </div>
              </div>

              {/* Buttons */}
              <div className="modal-footer">
                <button className="btn-cancel" onClick={onClose}>Hủy</button>
                <button 
                  className="btn-pay" 
                  onClick={handleCheckout} 
                  disabled={loading || items.length === 0}
                >
                  {loading ? "⏳ Đang xử lý..." : `💳 Thanh toán ${formatCurrencyVND(discountResult.finalPrice)}`}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ============ PROCESSING STEP ============ */}
        {step === "processing" && checkoutData && (
          <>
            <div className="processing">
              <div className="spinner"></div>
              <h2>⏳ Chuyển hướng...</h2>
              <p>Đang chuyển sang cổng thanh toán</p>
            </div>
            <form 
              ref={formRef} 
              action={checkoutData.url} 
              method="POST" 
              style={{ display: "none" }}
            >
              {Object.entries(checkoutData.fields || {}).map(([key, val]) => (
                <input key={key} type="hidden" name={key} value={val} />
              ))}
            </form>
          </>
        )}

        {/* ============ FAILED STEP ============ */}
        {step === "failed" && (
          <div className="failed">
            <h2>❌ Thanh toán thất bại</h2>
            <p className="error-details">{error}</p>
            <div className="modal-footer">
              <button 
                className="btn-cancel" 
                onClick={() => { 
                  setStep("info"); 
                  setError(null); 
                }}
              >
                Thử lại
              </button>
              <button className="btn-pay" onClick={onClose}>Đóng</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}