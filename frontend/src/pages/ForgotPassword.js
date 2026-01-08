import React, { useState, useEffect } from "react";

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: "",
    resetCode: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    setError("");
  };

  // ========== STEP 1: Send reset code ==========
  const handleSendResetCode = async () => {
    if (!formData.email) {
      setError("Vui lòng nhập email");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError("Email không hợp lệ");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/auth/send-reset-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email })
      });

      const data = await res.json();

      if (res.ok) {
        setCountdown(60);
        setStep(2);
        setError("");
      } else {
        setError(data.error || "Không thể gửi mã");
      }
    } catch (err) {
      setError("❌ Lỗi kết nối server");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ========== STEP 2: Verify reset code ==========
  const handleVerifyResetCode = async () => {
    if (!formData.resetCode) {
      setError("Vui lòng nhập mã xác thực");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/auth/verify-reset-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          code: formData.resetCode
        })
      });

      const data = await res.json();

      if (res.ok) {
        setStep(3);
        setError("");
      } else {
        setError(data.error || "Mã xác thực không đúng");
      }
    } catch (err) {
      setError("❌ Lỗi kết nối server");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ========== STEP 3: Reset password ==========
  const handleResetPassword = async () => {
    if (!formData.newPassword || !formData.confirmPassword) {
      setError("Vui lòng điền đầy đủ mật khẩu");
      return;
    }
    if (formData.newPassword.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setError("Mật khẩu không khớp");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          newPassword: formData.newPassword
        })
      });

      const data = await res.json();

      if (res.ok) {
        alert("✅ Đặt lại mật khẩu thành công!");
        window.location.href = "/login";
      } else {
        setError(data.error || "Đặt lại mật khẩu thất bại");
      }
    } catch (err) {
      setError("❌ Lỗi kết nối server");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
        <span className="shape circle"></span>
        <span className="shape square"></span>
         <span className="shape square2"></span>
        <span className="shape circle2"></span>
        <span className="shape square1"></span>
      <div className="forgot-password-box">
        <div className="forgot-password-header">
          <h1>Quên mật khẩu?</h1>
          <p>Step {step}/3</p>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${(step / 3) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* STEP 1: Email */}
        {step === 1 && (
          <div className="step-content">
            <h2>Nhập email tài khoản của bạn</h2>
            <p className="step-desc">
              Chúng tôi sẽ gửi mã xác thực để bạn đặt lại mật khẩu
            </p>
            <input
              type="email"
              placeholder="Email của bạn"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className="input-field"
              onKeyPress={(e) => e.key === "Enter" && handleSendResetCode()}
            />
            {error && <p className="error-msg">{error}</p>}
            <button 
              onClick={handleSendResetCode} 
              className="btn-next"
              disabled={loading}
            >
              {loading ? "Đang gửi..." : "Gửi mã xác thực →"}
            </button>
            <div className="back-to-login">
              <p>Nhớ mật khẩu rồi? <a href="/login">Quay lại đăng nhập</a></p>
            </div>
          </div>
        )}

        {/* STEP 2: Verify Code */}
        {step === 2 && (
          <div className="step-content">
            <h2>Nhập mã xác thực</h2>
            <p className="step-desc">
              Nhập mã 6 ký tự được gửi đến {formData.email}
            </p>
            <input
              type="text"
              placeholder="Nhập mã (ví dụ: 123456)"
              value={formData.resetCode}
              onChange={(e) => handleInputChange("resetCode", e.target.value.slice(0, 6))}
              className="input-field code-input"
              maxLength="6"
              onKeyPress={(e) => e.key === "Enter" && handleVerifyResetCode()}
            />
            {error && <p className="error-msg">{error}</p>}
            
            <div className="button-group">
              <button onClick={() => setStep(1)} className="btn-back">
                ← Thay đổi email
              </button>
              <button 
                onClick={handleVerifyResetCode} 
                className="btn-next"
                disabled={loading || formData.resetCode.length < 6}
              >
                {loading ? "Đang xác thực..." : "Xác thực"}
              </button>
            </div>

            <div className="resend-code">
              {countdown > 0 ? (
                <p>Gửi lại mã trong {countdown}s</p>
              ) : (
                <button onClick={handleSendResetCode} className="resend-btn">
                  Gửi lại mã
                </button>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: New Password */}
        {step === 3 && (
          <div className="step-content">
            <h2>Tạo mật khẩu mới</h2>
            <p className="step-desc">
              Tạo mật khẩu mạnh (ít nhất 6 ký tự)
            </p>
            <input
              type="password"
              placeholder="Mật khẩu mới"
              value={formData.newPassword}
              onChange={(e) => handleInputChange("newPassword", e.target.value)}
              className="input-field"
            />
            <input
              type="password"
              placeholder="Xác nhận mật khẩu"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
              className="input-field"
              onKeyPress={(e) => e.key === "Enter" && handleResetPassword()}
            />
            {error && <p className="error-msg">{error}</p>}
            
            <div className="button-group">
              <button onClick={() => setStep(2)} className="btn-back">
                ← Quay lại
              </button>
              <button 
                onClick={handleResetPassword} 
                className="btn-next"
                disabled={loading}
              >
                {loading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
              </button>
            </div>
          </div>
        )}

        <div className="auth-footer">
          <p><a href="/login">← Quay lại đăng nhập</a></p>
        </div>
      </div>

      <style>{`
        .forgot-password-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #ffffff69, #dadada9d);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 20px;
        }

        .forgot-password-box {
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          padding: 40px;
          width: 100%;
          max-width: 500px;
          animation: slideUp 0.5s ease-out;
          z-index:100;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .forgot-password-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .forgot-password-header h1 {
          font-size: 28px;
          color: #333;
          margin: 0 0 10px 0;
        }

        .forgot-password-header p {
          color: #999;
          font-size: 14px;
          margin: 0 0 10px 0;
        }

        .progress-bar {
          width: 100%;
          height: 4px;
          background: #eee;
          border-radius: 2px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: orange;
          transition: width 0.4s ease;
        }

        .step-content {
          animation: fadeIn 0.3s ease-in;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .step-content h2 {
          font-size: 24px;
          color: #333;
          margin: 0 0 10px 0;
        }

        .step-desc {
          color: #666;
          font-size: 14px;
          margin: 0 0 20px 0;
        }

        .input-field {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 16px;
          margin-bottom: 15px;
          box-sizing: border-box;
          transition: border-color 0.3s ease;
        }

        .input-field:focus {
          outline: none;
          border-color: #ec7c12ff;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .code-input {
          letter-spacing: 8px;
          font-size: 20px;
          text-align: center;
          font-weight: 600;
        }

        .button-group {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }

        .btn-back,
        .btn-next {
          flex: 1;
          padding: 12px 20px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-back {
          background: #f0f0f0;
          color: #333;
        }

        .btn-back:hover {
          background: #e0e0e0;
        }

        .btn-next {
          background: linear-gradient(90deg, #eb8d35, #a8640a);
          color: white;
        }

        .btn-next:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
        }

        .btn-next:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .error-msg {
          color: #e74c3c;
          font-size: 14px;
          margin-bottom: 15px;
          padding: 10px;
          background: #fadbd8;
          border-radius: 6px;
          text-align: center;
        }

        .resend-code {
          text-align: center;
          margin-top: 15px;
        }

        .resend-code p {
          color: #999;
          font-size: 14px;
          margin: 0;
        }

        .resend-btn {
          background: none;
          border: none;
          color: #667eea;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          padding: 0;
          text-decoration: underline;
        }

        .resend-btn:hover {
          color: #764ba2;
        }

        .back-to-login {
          text-align: center;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
        }

        .back-to-login p {
          color: #666;
          font-size: 14px;
          margin: 0;
        }

        .back-to-login a {
          color: #667eea;
          text-decoration: none;
          font-weight: 600;
        }

        .back-to-login a:hover {
          text-decoration: underline;
        }

        .auth-footer {
          text-align: center;
          margin-top: 20px;
        }

        .auth-footer a {
          color: #667eea;
          text-decoration: none;
          font-weight: 600;
        }

        .auth-footer a:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}