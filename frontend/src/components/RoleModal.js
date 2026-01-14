import React, { useState, useEffect, useRef } from "react";
import "./RoleModal.css";
import { useNavigate } from "react-router-dom";

export default function RoleModal({ isOpen, onClose }) {
  const [agreed, setAgreed] = useState(false);
  const modalRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  const handleContinue = () => {
    if (!agreed) {
      alert("⚠️ Please read and agree to the instructor responsibilities");
      return;
    }

    // ✅ Check token before navigating
    const token = localStorage.getItem("token");
    
    console.log("🔍 RoleModal - Checking token:", {
      hasToken: !!token,
      isValid: token && token !== "null" && token !== "undefined",
      preview: token ? token.substring(0, 20) + "..." : "MISSING"
    });

    if (!token || token === "null" || token === "undefined") {
      alert("⚠️ Your session has expired. Please login again.");
      localStorage.clear();
      navigate("/login");
      return;
    }

    onClose();
    navigate("/teacher-dashboard"); // ✅ Navigate to dashboard to create course
  };

  if (!isOpen) return null;

  return (
    <div className="role-modal-overlay" onClick={onClose}>
      <div 
        className="role-modal" 
        onClick={(e) => e.stopPropagation()}
        ref={modalRef}
        tabIndex={-1}
      >
        <button className="modal-close-btn" onClick={onClose}>✕</button>
        
        <div className="modal-header">
          <h2>Become an Instructor</h2>
          <p className="modal-subtitle">
            Create your first course and start teaching today!
          </p>
        </div>

        <div className="modal-body">
          {/* Benefits Section */}
          <div className="benefits-section">
            <h3>✨ Instructor Benefits</h3>
            <ul className="benefits-list">
              <li>
            
                <span>Create and manage your own courses</span>
              </li>
              <li>
            
                <span>Earn revenue from student enrollments</span>
              </li>
              <li>
          
                <span>Access detailed analytics and statistics</span>
              </li>
              <li>
            
                <span>Build your community of learners</span>
              </li>
              <li>
        
                <span>Keep all your student privileges</span>
              </li>
            </ul>
          </div>

          {/* Responsibilities Section */}
          <div className="responsibilities-section">
            <h3>📋 Instructor Responsibilities</h3>
            <ul className="responsibilities-list">
              <li>
                <strong>Quality Content:</strong> Provide accurate, high-quality educational materials that don't violate copyright
              </li>
              <li>
                <strong>Legal Compliance:</strong> Ensure all content complies with laws and community standards
              </li>
              <li>
                <strong>Student Support:</strong> Respond to student questions and provide assistance within your course scope
              </li>
              <li>
                <strong>Professional Standards:</strong> Maintain professionalism and ethical teaching practices
              </li>
              <li>
                <strong>Accountability:</strong> Take full responsibility for your course content and teaching outcomes
              </li>
            </ul>
          </div>

          {/* Agreement Checkbox */}
          <div className="agreement-box">
            <label className="agreement-checkbox">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span className="checkmark"></span>
              <span className="agreement-text">
                I have read and agree to the instructor responsibilities and terms
              </span>
            </label>
          </div>

          {/* Info Note */}
          <div className="info-note">
            <span className="info-icon">ℹ️</span>
            <p>
              Your first course will be submitted for admin review. Once approved, 
              you'll be upgraded to instructor status automatically.
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button 
            className={`btn-confirm ${!agreed ? 'disabled' : ''}`}
            onClick={handleContinue}
            disabled={!agreed}
          >
            Continue to Create Course →
          </button>
        </div>
      </div>
    </div>
  );
}