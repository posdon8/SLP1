import React, { useState, useEffect } from "react";

export default function Register() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: "",
    fullName: "",
    password: "",
    confirmPassword: "",
    verificationCode: ""
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

  // ========== STEP 1: Send verification code ==========
  const handleSendCode = async () => {
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
      const res = await fetch(`${process.env.REACT_APP_API_URL}/auth/send-verification-code`, {
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

  // ========== STEP 2: Verify code ==========
  const handleVerifyCode = async () => {
    if (!formData.verificationCode) {
      setError("Vui lòng nhập mã xác thực");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/auth/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: formData.email, 
          code: formData.verificationCode 
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

  // ========== STEP 3: Create password ==========
  const handleStep3 = () => {
    if (!formData.password || !formData.confirmPassword) {
      setError("Vui lòng điền đầy đủ mật khẩu");
      return;
    }
    if (formData.password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Mật khẩu không khớp");
      return;
    }
    setStep(4);
  };

  // ========== STEP 4: Full name ==========
  const handleStep4 = () => {
    if (!formData.fullName) {
      setError("Vui lòng nhập tên của bạn");
      return;
    }
    setStep(5);
  };

  // ========== STEP 5: Register ==========
  const handleRegister = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.email.split("@")[0],
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          roles: ["student"]
        })
      });

      const data = await res.json();

      if (res.ok) {
        alert("✅ Đăng ký thành công!");
        window.location.href = "/login";
      } else {
        setError(data.error || "Đăng ký thất bại");
      }
    } catch (err) {
      setError("❌ Lỗi kết nối server");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
        <span className="shape circle"></span>
        <span className="shape square"></span>
         <span className="shape square2"></span>
        <span className="shape circle2"></span>
        <span className="shape square1"></span>
        <span className="shape circle small"></span>
      <div className="register-box">
        <div className="register-header">
          <h1>SLP</h1>
          <p>Step {step}/5</p>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${(step / 5) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* STEP 1: Email */}
        {step === 1 && (
          <div className="step-content">
            <h2>Nhập email của bạn</h2>
            <p className="step-desc">
              Chúng tôi sẽ gửi mã xác thực đến email này
            </p>
            <input
              type="email"
              placeholder="Email của bạn"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className="input-field"
              onKeyPress={(e) => e.key === "Enter" && handleSendCode()}
            />
            {error && <p className="error-msg">{error}</p>}
            <button 
              onClick={handleSendCode} 
              className="btn-next"
              disabled={loading}
            >
              {loading ? "Đang gửi..." : "Tiếp tục →"}
            </button>
          </div>
        )}

        {/* STEP 2: Verify Code */}
        {step === 2 && (
          <div className="step-content">
            <h2>Xác thực email</h2>
            <p className="step-desc">
              Nhập mã 6 ký tự được gửi đến {formData.email}
            </p>
            <input
              type="text"
              placeholder="Nhập mã (ví dụ: 123456)"
              value={formData.verificationCode}
              onChange={(e) => handleInputChange("verificationCode", e.target.value.slice(0, 6))}
              className="input-field code-input"
              maxLength="6"
              onKeyPress={(e) => e.key === "Enter" && handleVerifyCode()}
            />
            {error && <p className="error-msg">{error}</p>}
            
            <div className="button-group">
              <button onClick={() => setStep(1)} className="btn-back">
                ← Thay đổi email
              </button>
              <button 
                onClick={handleVerifyCode} 
                className="btn-next"
                disabled={loading || formData.verificationCode.length < 6}
              >
                {loading ? "Đang xác thực..." : "Xác thực"}
              </button>
            </div>

            <div className="resend-code">
              {countdown > 0 ? (
                <p>Gửi lại mã trong {countdown}s</p>
              ) : (
                <button onClick={handleSendCode} className="resend-btn">
                  Gửi lại mã
                </button>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: Password */}
        {step === 3 && (
          <div className="step-content">
            <h2>Tạo mật khẩu</h2>
            <p className="step-desc">
              Tạo mật khẩu mạnh (ít nhất 6 ký tự)
            </p>
            <input
              type="password"
              placeholder="Mật khẩu"
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
              className="input-field"
            />
            <input
              type="password"
              placeholder="Xác nhận mật khẩu"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
              className="input-field"
              onKeyPress={(e) => e.key === "Enter" && handleStep3()}
            />
            {error && <p className="error-msg">{error}</p>}
            <div className="button-group">
              <button onClick={() => setStep(2)} className="btn-back">
                ← Quay lại
              </button>
              <button onClick={handleStep3} className="btn-next">
                Tiếp tục →
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Full Name */}
        {step === 4 && (
          <div className="step-content">
            <h2>Xin chào! Tên bạn là gì?</h2>
            <p className="step-desc">
              Đây là tên sẽ hiển thị trong hồ sơ của bạn
            </p>
            <input
              type="text"
              placeholder="Tên đầy đủ"
              value={formData.fullName}
              onChange={(e) => handleInputChange("fullName", e.target.value)}
              className="input-field"
              onKeyPress={(e) => e.key === "Enter" && handleStep4()}
            />
            {error && <p className="error-msg">{error}</p>}
            <div className="button-group">
              <button onClick={() => setStep(3)} className="btn-back">
                ← Quay lại
              </button>
              <button onClick={handleStep4} className="btn-next">
                Tiếp tục →
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Confirmation */}
        {step === 5 && (
          <div className="step-content">
            <h2>Xác nhận thông tin</h2>
            <div className="confirmation-box">
              <div className="confirm-item">
                <span className="label">📧 Email:</span>
                <span className="value">{formData.email}</span>
              </div>
              <div className="confirm-item">
                <span className="label">👤 Tên:</span>
                <span className="value">{formData.fullName}</span>
              </div>
              <div className="confirm-item">
                <span className="label">👨‍🎓 Vai trò:</span>
                <span className="value">Học viên</span>
              </div>
            </div>
            {error && <p className="error-msg">{error}</p>}
            <div className="button-group">
              <button onClick={() => setStep(4)} className="btn-back">
                ← Quay lại
              </button>
              <button 
                onClick={handleRegister} 
                className="btn-register"
                disabled={loading}
              >
                {loading ? "Đang xử lý..." : "✅ Hoàn tất đăng ký"}
              </button>
            </div>
            <p className="terms">
              Bằng việc đăng ký, bạn đồng ý với Điều khoản dịch vụ của chúng tôi
            </p>
          </div>
        )}

        <div className="auth-footer">
          <p>Đã có tài khoản? <a href="/login">Đăng nhập</a></p>
        </div>
      </div>

      <style>{`
        .register-container {
        position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #ffffff69, #dadada9d);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 20px;
         overflow: hidden; /* tránh shape tràn */
        }
        .shape {
  position: absolute;
  z-index: 1;           /* ✅ nằm sau */
  opacity: 0.25;
  pointer-events: none; /* không block click */
}

        .register-box {
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          padding: 40px;
          width: 100%;
          max-width: 500px;
          animation: slideUp 0.5s ease-out;
          z-index: 10;
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

        .register-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .register-header h1 {
          font-size: 32px;
          color: #333;
          margin: 0 0 10px 0;
          font-weight: 700;
        }

        .register-header p {
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
          border-color:orange;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .code-input {
          letter-spacing: 8px;
          font-size: 20px;
          text-align: center;
          font-weight: 600;
        }

        .confirmation-box {
          background: #f5f5f5;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .confirm-item {
          display: flex;
          justify-content: space-between;
          margin: 12px 0;
          color: #333;
        }

        .confirm-item .label {
          font-weight: 500;
        }

        .confirm-item .value {
          text-align: right;
          font-weight: 600;
          color: #667eea;
        }

        .button-group {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }

        .btn-back,
        .btn-next,
        .btn-register {
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

        .btn-next,
        .btn-register {
          background: linear-gradient(90deg, #eb8d35, #a8640a);
          color: white;
        }

        .btn-next:hover:not(:disabled),
        .btn-register:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
        }

        .btn-next:disabled,
        .btn-register:disabled {
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

        .terms {
          text-align: center;
          color: #999;
          font-size: 12px;
          margin: 15px 0 0 0;
        }

        .auth-footer {
          text-align: center;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
        }

        .auth-footer p {
          color: #666;
          margin: 0;
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