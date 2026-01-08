import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";



export default function PaymentSuccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const { clearCart } = useCart();

  const [orderId, setOrderId] = useState(null);
  const [status, setStatus] = useState("checking"); // checking, completed, failed, timeout
  const [payment, setPayment] = useState(null);
  const [message, setMessage] = useState("");
  const [attempts, setAttempts] = useState(0);

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

  // ✅ Extract orderId from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get("orderId");
    setOrderId(id);
    
    if (!id) {
      setStatus("failed");
      setMessage("Không tìm thấy mã đơn hàng");
    }
  }, [location]);

  // ✅ Poll IPN status
  useEffect(() => {
    if (!orderId) return;

    const checkPaymentStatus = async () => {
      try {
        const url = `${API_URL}/payment/verify-ipn/${orderId}`;
        console.log("📡 Fetching:", url);
        
        const res = await fetch(url);
        
        // ✅ Check if response is OK
        if (!res.ok) {
          const errorText = await res.text();
          console.error("❌ API error:", {
            status: res.status,
            statusText: res.statusText,
            response: errorText.substring(0, 100)
          });
          
          if (res.status === 404) {
            setStatus("failed");
            setMessage("Không tìm thấy đơn hàng. Vui lòng kiểm tra lại mã đơn hàng.");
          }
          return;
        }

        const data = await res.json();

        console.log("🔍 Payment status check:", {
          attempt: attempts + 1,
          status: data.payment?.status,
          isCompleted: data.payment?.isCompleted
        });

        setPayment(data.payment);

        if (data.payment?.isCompleted) {
           clearCart();
          setStatus("completed");
          setMessage("✅ Thanh toán thành công! Đang chuyển hướng...");
          
          // ✅ Redirect sau 2 giây
          setTimeout(() => {
            navigate("/my-courses");
          }, 2000);
        }
      } catch (error) {
        console.error("❌ Error checking payment:", {
          error: error.message,
          name: error.name
        });
      }
    };

    // ✅ Check immediately
    checkPaymentStatus();

    // ✅ Poll mỗi 2 giây (tối đa 30 lần = 60 giây)
    let pollInterval;
    if (status === "checking" && attempts < 30) {
      pollInterval = setTimeout(() => {
        setAttempts(prev => {
          const newAttempt = prev + 1;
          
          if (newAttempt >= 30) {
            setStatus("timeout");
            setMessage(
              "⏱️ Xác nhận thanh toán chưa hoàn tất. " +
              "Vui lòng kiểm tra lại hoặc liên hệ hỗ trợ."
            );
          }
          
          return newAttempt;
        });
        
        checkPaymentStatus();
      }, 2000);
    }

    return () => clearTimeout(pollInterval);
  }, [orderId, attempts, status, API_URL, navigate]);

  // ✅ Render checking state
  if (status === "checking") {
    return (
      <div className="payment-result-container checking">
        <div className="spinner">
          <div className="spinner-circle"></div>
        </div>
        <h2>⏳ Đang xác nhận thanh toán...</h2>
        <p>Vui lòng chờ trong giây lát (lần {attempts + 1}/30)</p>
        {orderId && <p className="order-id">Mã đơn hàng: {orderId}</p>}
      </div>
    );
  }

  // ✅ Render completed state
  if (status === "completed") {
    return (
      <div className="payment-result-container completed">
        <div className="success-icon">✅</div>
        <h2>🎉 Thanh toán thành công!</h2>
        <p className="main-message">{message}</p>
        
        {payment && (
          <div className="payment-details">
            <div className="detail-row">
              <span className="label">Mã đơn hàng:</span>
              <span className="value">{payment.id}</span>
            </div>
            <div className="detail-row">
              <span className="label">Trạng thái:</span>
              <span className="value status-completed">Đã thanh toán</span>
            </div>
            {payment.transactionId && (
              <div className="detail-row">
                <span className="label">ID Giao dịch:</span>
                <span className="value">{payment.transactionId}</span>
              </div>
            )}
            <div className="detail-row">
              <span className="label">Thời gian:</span>
              <span className="value">
                {new Date(payment.completedAt).toLocaleString("vi-VN")}
              </span>
            </div>
          </div>
        )}

        <p className="redirect-message">
          🔄 Bạn sẽ được chuyển hướng đến khóa học trong giây lát...
        </p>
        
        <button 
          className="btn-primary"
          onClick={() => navigate("/my-courses")}
        >
          Vào khóa học ngay →
        </button>
      </div>
    );
  }

  // ✅ Render timeout state
  if (status === "timeout") {
    return (
      <div className="payment-result-container timeout">
        <div className="warning-icon">⏱️</div>
        <h2>⚠️ Xác nhận thanh toán chưa hoàn tất</h2>
        <p className="main-message">{message}</p>
        
        {payment && (
          <div className="payment-details">
            <div className="detail-row">
              <span className="label">Mã đơn hàng:</span>
              <span className="value">{payment.id}</span>
            </div>
            <div className="detail-row">
              <span className="label">Trạng thái:</span>
              <span className="value status-pending">Đang chờ xác nhận</span>
            </div>
          </div>
        )}

        <div className="actions">
          <button 
            className="btn-primary"
            onClick={() => window.location.reload()}
          >
            🔄 Làm mới trang
          </button>
          <button 
            className="btn-secondary"
            onClick={() => navigate("/my-courses")}
          >
            📚 Kiểm tra khóa học
          </button>
          <button 
            className="btn-secondary"
            onClick={() => navigate("/support")}
          >
            💬 Liên hệ hỗ trợ
          </button>
        </div>

        <p className="note">
          💡 Nếu bạn đã thanh toán, vui lòng chờ vài phút hoặc kiểm tra email 
          để xác nhận thanh toán thành công.
        </p>
      </div>
    );
  }

  // ✅ Render failed state
  if (status === "failed") {
    return (
      <div className="payment-result-container failed">
        <div className="error-icon">❌</div>
        <h2>Thanh toán thất bại</h2>
        <p className="main-message">{message || "Có lỗi xảy ra, vui lòng thử lại."}</p>
        
        {orderId && (
          <div className="payment-details">
            <div className="detail-row">
              <span className="label">Mã đơn hàng:</span>
              <span className="value">{orderId}</span>
            </div>
          </div>
        )}

        <div className="actions">
          <button 
            className="btn-primary"
            onClick={() => navigate("/cart")}
          >
            ← Quay lại giỏ hàng
          </button>
          <button 
            className="btn-secondary"
            onClick={() => navigate("/support")}
          >
            💬 Liên hệ hỗ trợ
          </button>
        </div>
      </div>
    );
  }

  return null;
}