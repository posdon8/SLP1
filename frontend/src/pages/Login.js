import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import './Login.css';
import { GoogleLogin } from "@react-oauth/google";
import { AuthContext } from "../context/AuthContext";

export default function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();
  const { login } = useContext(AuthContext);

    const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password ) {
            alert("⚠️ Please fill in all fields!");
            return;
        }
    const res = await fetch(`${process.env.REACT_APP_API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    console.log(data);
    if (res.ok) {
      localStorage.setItem("token", data.token);
window.dispatchEvent(new Event("tokenChanged")); 
       login(data.user, data.token);
        alert("Login thành công!");
        navigate("/dashboard");
    } else {
        alert(data.error);
    }
};
const handleGoogleLogin = async (credentialResponse) => {
  try {
    console.log("🔄 Sending credential...");
    
    const res = await fetch(
      `${process.env.REACT_APP_API_URL}/auth/google-login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          credential: credentialResponse.credential  // ⭐ Chính xác
        })
      }
    );

    const data = await res.json();
    console.log("📦 Response:", data);

    if (res.ok) {
      localStorage.setItem("token", data.token);
      window.dispatchEvent(new Event("tokenChanged"));
      login(data.user, data.token);
      navigate("/");
      alert("✅ Đăng nhập Google thành công!");
    } else {
      console.error("❌ Backend error:", data.error);
      alert("❌ " + (data.error || "Đăng nhập thất bại"));
    }
  } catch (err) {
    console.error("❌ Network error:", err);
    alert("❌ Lỗi kết nối server");
  }
};

return (

    <div className="auth-container">
        <span className="shape circle"></span>
        <span className="shape square"></span>
         <span className="shape square2"></span>
        <span className="shape circle2"></span>
        <span className="shape square1"></span>
        <span className="shape circle small"></span>
      
        <div className="auth-box">
            <h2>SLP</h2>
            <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
            />
            <br />
            <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />
            <br />
            <button onClick={handleLogin}>Sign in</button>
            <button onClick={() => navigate("/register")}>Sign up</button>
            <div style={{ marginTop: "20px" }}>
               <div className="forgot-password-link">
        <a onClick={() => navigate("/forgot-password")} href="/forgot-password">
          Quên mật khẩu?
        </a>
      </div>
            <GoogleLogin
              onSuccess={handleGoogleLogin}
              onError={() => alert("Đăng nhập Google thất bại")}
            />
          </div>
    </div></div>
);
}
