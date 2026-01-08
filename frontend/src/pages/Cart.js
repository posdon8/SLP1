import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Cart.css";
import { calculateDiscount, formatCurrencyVND } from "../utils/discount";
import PaymentModal from "./PaymentModal";

import { useCart } from "../context/CartContext";

export default function Cart() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
  const BASE_URL = API_URL.replace("/api", ""); // http://localhost:5000
  // ✅ Lấy từ hook (KHÔNG khái báo thêm state)
  const { cartItems, loading, error, removeFromCart, clearCart } = useCart();

  // ✅ State khác
  const [user, setUser] = useState(null);
  const [openPayment, setOpenPayment] = useState(false);
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherApplied, setVoucherApplied] = useState(null);
  const [voucherError, setVoucherError] = useState("");
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // ✅ Load data on mount (KHÔNG cần loadCart nữa)
  useEffect(() => {
    fetchUser();
    fetchAvailableCoupons();
  }, [token]);

  // ✅ Fetch User Profile
  const fetchUser = async () => {
    if (!token) return;

    try {
      const res = await axios.get(`${API_URL}/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data) {
        setUser(res.data);
      }
    } catch (err) {
      console.error("❌ Error fetching user:", err);
    }
  };

  // ✅ Fetch Available Coupons
  const fetchAvailableCoupons = async () => {
    if (!token) return;

    try {
      const res = await axios.get(`${API_URL}/coupon/available`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success && Array.isArray(res.data.coupons)) {
        setAvailableCoupons(res.data.coupons);
      }
    } catch (err) {
      console.error("❌ Error fetching coupons:", err);
    }
  };

  // ✅ Calculate Totals with Voucher & Tier Discount
  const totals = useMemo(() => {
    let originalTotal = 0;
    let couponDiscountTotal = 0;
    let tierDiscountTotal = 0;

    cartItems.forEach((item) => {
      const itemPrice = item.price || 0;
      originalTotal += itemPrice;

      const discount = calculateDiscount(
        itemPrice,
        voucherApplied,
        user?.studentTier
      );

      couponDiscountTotal += discount.couponDiscount || 0;
      tierDiscountTotal += discount.tierDiscount || 0;
    });

    const totalDiscount = couponDiscountTotal + tierDiscountTotal;
    const finalTotal = Math.max(0, originalTotal - totalDiscount);

    return {
      originalTotal,
      couponDiscountTotal,
      tierDiscountTotal,
      totalDiscount,
      finalTotal,
    };
  }, [cartItems, voucherApplied, user]);

  // ✅ Apply Voucher
  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) {
      setVoucherError("Vui lòng nhập mã voucher");
      return;
    }

    if (!token) {
      setVoucherError("Vui lòng đăng nhập để áp dụng voucher");
      return;
    }

    setVoucherLoading(true);
    setVoucherError("");

    try {
      const payload = {
        code: voucherCode.trim(),
        coursePrice: totals.originalTotal,
      };

      const res = await axios.post(
        `${API_URL}/coupon/apply`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.data.success && res.data.discount) {
        setVoucherApplied({
          code: res.data.discount.coupon.code,
          discountType: res.data.discount.coupon.type,
          discountValue: res.data.discount.coupon.value,
        });
        setVoucherError("");
        setShowDropdown(false);
        setVoucherCode("");
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

  // ✅ Quick Select Voucher from Dropdown
  const handleQuickSelectVoucher = (coupon) => {
    setVoucherCode(coupon.code);
    setShowDropdown(false);
  };

  // ✅ Remove Applied Voucher
  const handleRemoveVoucher = () => {
    setVoucherApplied(null);
    setVoucherCode("");
    setVoucherError("");
  };

  // ✅ Handle Clear Cart (dùng hook)
  const handleClearCart = async () => {
    if (window.confirm("Bạn chắc chắn muốn xóa tất cả khóa học khỏi giỏ hàng?")) {
      await clearCart();
      setVoucherApplied(null);
      setVoucherCode("");
      setVoucherError("");
    }
  };

  // ============ LOADING STATE ============
  if (loading) {
    return (
      <div className="cart-container">
        <div className="empty-cart">
          <h2>⏳ Đang tải giỏ hàng...</h2>
        </div>
      </div>
    );
  }

  // ============ ERROR STATE ============
  if (error) {
    return (
      <div className="cart-container">
        <div className="empty-cart">
          <h2>❌ Lỗi</h2>
          <p>{error}</p>
          <button 
            onClick={() => navigate("/dashboard")} 
            className="btn-primary"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  // ============ EMPTY CART ============
  if (cartItems.length === 0) {
    return (
      <div className="cart-container">
        <div className="empty-cart">
          <h2>Giỏ hàng trống</h2>
          <p>Chưa có khóa học nào trong giỏ hàng</p>
          <button 
            onClick={() => navigate("/dashboard")} 
            className="btn-primary"
          >
            Khám phá khóa học
          </button>
        </div>
      </div>
    );
  }

  // ============ CART WITH ITEMS ============
  return (
    <div className="cart-container">
      {/* Header */}
      <header className="cart-header">
        <h1>Giỏ hàng ({cartItems.length} khóa học)</h1>
        <button onClick={handleClearCart} className="btn-clear">
          ✕ Xóa tất cả
        </button>
      </header>

      <div className="cart-layout">
        {/* ========== LEFT: ITEMS ========== */}
        <div className="cart-items">
          <div className="items-header">
            <span>Khóa học</span>
            <span>Giá</span>
            <span></span>
          </div>

          {cartItems.map((item) => (
            <div key={item._id} className="cart-item">
              <div className="item-info">
                <img 
                  src={item.thumbnail || "https://via.placeholder.com/60"} 
                  alt={item.title}
                  className="item-thumbnail"
                  onError={(e) => {
                    e.target.src = "https://via.placeholder.com/60";
                  }}
                />
                <div className="item-details">
                  <h3>{item.title}</h3>
                  <p className="teacher-name">
                    {item.teacher.fullName || "Chưa xác định"}
                  </p>
                </div>
              </div>

              <div className="item-price">
                <span className="price-value">
                  {formatCurrencyVND(item.price || 0)}
                </span>
              </div>

              <button 
                onClick={() => removeFromCart(item._id)}
                className="btn-remove"
                title="Xóa khỏi giỏ hàng"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* ========== RIGHT: SUMMARY ========== */}
        <div className="cart-summary">
          <h2>Tóm tắt đơn hàng</h2>

          {/* Price Breakdown */}
          <div className="summary-section">
            <div className="summary-row">
              <span>Tổng giá gốc</span>
              <span className="price-original">
                {formatCurrencyVND(totals.originalTotal)}
              </span>
            </div>

            {voucherApplied && (
              <div className="summary-row discount-row">
                <span>
                  <img
          src={`${BASE_URL}/uploads/images/voucher.png`}
          alt="Hero"
          style={{height: "20px", marginBottom: "-4px"}}
          onError={(e) => {
            e.target.style.display = "none";
          }}
        /> Voucher ({voucherApplied.code})
                  {voucherApplied.discountType === "percentage" && ` (${voucherApplied.discountValue}%)`}
                </span>
                <span className="price-discount">
                  -{formatCurrencyVND(totals.couponDiscountTotal)}
                </span>
              </div>
            )}

            {totals.tierDiscountTotal > 0 && (
              <div className="summary-row discount-row">
                <span> Ưu đãi hạng {user?.studentTier?.level?.toUpperCase()}</span>
                <span className="price-discount">
                  -{formatCurrencyVND(totals.tierDiscountTotal)}
                </span>
              </div>
            )}

            <hr className="summary-divider" />

            <div className="summary-row final-price">
              <strong>Thanh toán</strong>
              <strong className="price-final">
                {formatCurrencyVND(totals.finalTotal)}
              </strong>
            </div>

            {totals.totalDiscount > 0 && (
              <p className="savings-text">
                Tiết kiệm: {formatCurrencyVND(totals.totalDiscount)}
              </p>
            )}
          </div>

          {/* Voucher Section */}
          <div className="voucher-section">
            <h3><img
          src={`${BASE_URL}/uploads/images/voucher.png`}
          alt="Hero"
          style={{height: "20px", marginBottom: "-4px"}}
          onError={(e) => {
            e.target.style.display = "none";
          }}
        /> Mã giảm giá</h3>

            <div className="voucher-input-group">
              <input
                type="text"
                placeholder="Nhập hoặc chọn mã voucher"
                value={voucherCode}
                onChange={(e) => {
                  setVoucherCode(e.target.value.toUpperCase());
                  setVoucherError("");
                }}
                onFocus={() => {
                  if (!voucherApplied && availableCoupons.length > 0) {
                    setShowDropdown(true);
                  }
                }}
                onBlur={() => {
                  setTimeout(() => setShowDropdown(false), 200);
                }}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !voucherApplied) {
                    handleApplyVoucher();
                  }
                }}
                disabled={voucherApplied !== null}
                maxLength="50"
              />

              {voucherApplied ? (
                <button 
                  className="btn-voucher-applied"
                  onClick={handleRemoveVoucher}
                >
                  ✓ 
                </button>
              ) : (
                <button 
                  onClick={handleApplyVoucher} 
                  disabled={voucherLoading || !voucherCode.trim()}
                  className="btn-apply-voucher"
                >
                  {voucherLoading ? "⏳" : "Áp dụng"}
                </button>
              )}
            </div>

            {/* Error/Success Messages */}
            {voucherError && (
              <p className="voucher-error">❌ {voucherError}</p>
            )}

            {/* Available Coupons Dropdown */}
            {availableCoupons.length > 0 && !voucherApplied && showDropdown && (
              <div className="voucher-dropdown">
                <p className="dropdown-title"> Mã voucher có sẵn:</p>
                <ul>
                  {availableCoupons.map((coupon) => (
                    <li 
                      key={coupon._id}
                      onClick={() => handleQuickSelectVoucher(coupon)}
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
              </div>
            )}
          </div>

          {/* Checkout Button */}
          <button
            className="btn-checkout"
            onClick={() => setOpenPayment(true)}
            disabled={cartItems.length === 0}
          >
            Thanh toán ({cartItems.length} khóa học)
          </button>

          <p className="checkout-note">
            Bằng cách thanh toán, bạn đồng ý với điều khoản dịch vụ
          </p>
        </div>
      </div>

      {/* ========== PAYMENT MODAL ========== */}
      {openPayment && (
        <PaymentModal
          mode="cart"
          courseIds={cartItems.map(c => c._id)}
          courses={cartItems}
          voucherApplied={voucherApplied}
          studentTier={user?.studentTier}
          discount={totals}
          token={token}
          onClose={() => setOpenPayment(false)}
        />
      )}
    </div>
  );
}