// components/TeacherPayoutRequest.jsx - WITH REFRESH CALLBACK

import React, { useState, useEffect } from "react";

export default function TeacherPayoutRequest({ onRequestSubmitted }) {
  // ========================
  // State
  // ========================
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkLimit, setCheckLimit] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [formData, setFormData] = useState({
    amount: "",
    bankName: "",
    accountNumber: "",
    accountHolder: ""
  });

  const token = localStorage.getItem("token");
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

  useEffect(() => {
    fetchData();
  }, []);

  // ========================
  // Fetch Data
  // ========================
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Check limit
      const limitRes = await fetch(`${API_URL}/payout-request/check-limit`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const limitData = await limitRes.json();
      setCheckLimit(limitData);

      // Get requests
      const res = await fetch(`${API_URL}/payout-request/my-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setRequests(data.requests);
      }
    } catch (err) {
      console.error("Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ========================
  // Handle Form Submit
  // ========================
  const handleSubmit = async (e) => {
  e.preventDefault();

  const amount = parseInt(formData.amount);

  if (amount > checkLimit.availableAmount) {
    setError("Amount exceeds available balance");
    return;
  }

  setSubmitting(true);
  setError(null);
  setSuccess(null);

  try {
    const res = await fetch(`${API_URL}/payout-request/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        amount,
        bankAccount: {
          bankName: formData.bankName,
          accountNumber: formData.accountNumber,
          accountHolder: formData.accountHolder
        }
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    setFormData({
      amount: "",
      bankName: "",
      accountNumber: "",
      accountHolder: ""
    });

    setShowForm(false);
    setSuccess("✅ Payout request submitted successfully!");

    await fetchData();

    onRequestSubmitted?.();

  } catch (err) {
    setError(err.message);
  } finally {
    setSubmitting(false);
  }
};

  // ========================
  // Format Functions
  // ========================
  const formatCurrency = (amount) => {
    return (amount || 0).toLocaleString("vi-VN") + "đ";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  // ========================
  // Loading State
  // ========================
  if (loading) {
    return (
      <div style={{ padding: "20px" }}>
        <div>Loading...</div>
      </div>
    );
  }

  // ========================
  // Render
  // ========================
  return (
    <div style={{ padding: "20px" }}>
      <h2> Payout Requests</h2>

      {checkLimit && (
        <div style={{
          background: "#f0f8ff",
          border: "1px solid #007bff",
          padding: "15px",
          borderRadius: "8px",
          marginBottom: "20px"
        }}>
          <p><strong>Requests this month:</strong> {checkLimit.requestCount} / {checkLimit.requestLimit}</p>
          <p><strong>Available balance:</strong> {formatCurrency(checkLimit.availableAmount)}</p>
          <p style={{ color: checkLimit.canRequest ? "green" : "orange" }}>
            {checkLimit.message}
          </p>
        </div>
      )}

      {error && (
        <div style={{
          background: "#ffebee",
          border: "1px solid #f44336",
          padding: "12px",
          borderRadius: "6px",
          marginBottom: "20px",
          color: "#c62828"
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          background: "#e8f5e9",
          border: "1px solid #4caf50",
          padding: "12px",
          borderRadius: "6px",
          marginBottom: "20px",
          color: "#2e7d32"
        }}>
          {success}
        </div>
      )}

      {checkLimit?.canRequest && !showForm && (
        <button style={{
          background: "#007bff",
          color: "white",
          padding: "10px 20px",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          marginBottom: "20px",
          fontSize: "14px"
        }}
        onClick={() => setShowForm(true)}>
          + New Payout Request
        </button>
      )}

      {showForm && (
        <div style={{
          background: "white",
          border: "1px solid #ddd",
          padding: "20px",
          borderRadius: "8px",
          marginBottom: "20px"
        }}>
          <h3>Submit Payout Request</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                Amount (VND) *
              </label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="Minimum 100,000 VND"
                min="100000"
                required
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  boxSizing: "border-box"
                }}
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                Bank Name *
              </label>
              <input
                type="text"
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                placeholder="e.g., Vietcombank, MB Bank"
                required
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  boxSizing: "border-box"
                }}
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                Account Number *
              </label>
              <input
                type="text"
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                placeholder="Your bank account number"
                required
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  boxSizing: "border-box"
                }}
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                Account Holder Name *
              </label>
              <input
                type="text"
                value={formData.accountHolder}
                onChange={(e) => setFormData({ ...formData, accountHolder: e.target.value })}
                placeholder="Full name on bank account"
                required
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  boxSizing: "border-box"
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{
                  padding: "10px 20px",
                  border: "1px solid #ddd",
                  background: "#f5f5f5",
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: "10px 20px",
                  background: "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: submitting ? "not-allowed" : "pointer",
                  opacity: submitting ? 0.6 : 1
                }}
              >
                {submitting ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </form>
        </div>
      )}

      <h3>Your Requests History</h3>
      {requests.length === 0 ? (
        <p>No payout requests yet</p>
      ) : (
        <table style={{
          width: "100%",
          borderCollapse: "collapse",
          marginTop: "10px"
        }}>
          <thead>
            <tr style={{ background: "#f5f5f5", borderBottom: "2px solid #ddd" }}>
              <th style={{ padding: "10px", textAlign: "left" }}>Request #</th>
              <th style={{ padding: "10px", textAlign: "left" }}>Amount</th>
              <th style={{ padding: "10px", textAlign: "left" }}>Status</th>
              <th style={{ padding: "10px", textAlign: "left" }}>Bank</th>
              <th style={{ padding: "10px", textAlign: "left" }}>Account</th>
              <th style={{ padding: "10px", textAlign: "left" }}>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {requests
              .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
              .map((req) => (
                <tr key={req._id} style={{ borderBottom: "1px solid #ddd" }}>
                  <td style={{ padding: "10px" }}>{req.requestNumber}</td>
                  <td style={{ padding: "10px" }}>{formatCurrency(req.amount)}</td>
                  <td style={{ padding: "10px" }}>
                    <span style={{
                      background: req.status === "approved" ? "#90EE90" : 
                               req.status === "submitted" ? "#FFD700" : "#FFB6C1",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "12px"
                    }}>
                      {req.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: "10px" }}>{req.bankAccount?.bankName}</td>
                  <td style={{ padding: "10px" }}>
                    <small>****{req.bankAccount?.accountNumber?.slice(-4)}</small>
                  </td>
                  <td style={{ padding: "10px" }}>{formatDate(req.submittedAt)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      )}
      <div className="info-box">
        <h4> Important Information</h4>
        <ul>
          <li>You can submit <strong>maximum 2 payout requests per month</strong></li>
          <li>Minimum payout amount is <strong>100,000 VND</strong></li>
          <li>Requests must be <strong>approved by admin</strong> before processing</li>
          <li>Approved requests will be included in the <strong>monthly payout batch</strong></li>
          <li>Payment usually arrives within <strong>1-3 business days</strong></li>
          <li>Make sure your bank account information is <strong>correct</strong></li>
        </ul>
      </div>


    </div>
  );
}