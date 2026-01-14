import React, { useState, useEffect } from "react";
import "./AdminPayout.css";

export default function AdminPayoutManager() {
  // ========================
  // State
  // ========================
  const [tab, setTab] = useState("payouts");  // "payouts" or "requests"
  const [payouts, setPayouts] = useState([]);
  const [pending, setPending] = useState(null);
  const [requests, setRequests] = useState([]);
  const [requestSummary, setRequestSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [processing, setProcessing] = useState(null);

  const token = localStorage.getItem("token");
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

  useEffect(() => {
    fetchAllData();
  }, [token]);

  // ========================
  // Fetch All Data
  // ========================
  const fetchAllData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch payout data
      const pendingRes = await fetch(`${API_URL}/payout/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!pendingRes.ok) throw new Error("Failed to fetch pending payouts");
      const pendingData = await pendingRes.json();
      setPending(pendingData);

      const historyRes = await fetch(`${API_URL}/payout/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!historyRes.ok) throw new Error("Failed to fetch payout history");
      const historyData = await historyRes.json();
      setPayouts(historyData.payouts || []);

      // Fetch payout requests
      const requestsRes = await fetch(
        `${API_URL}/payout-request/admin/history`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (!requestsRes.ok) throw new Error("Failed to fetch requests");
      const requestsData = await requestsRes.json();
      setRequests(requestsData.requests || []);
      setRequestSummary(requestsData.summary);

      setLoading(false);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load data");
      setLoading(false);
    }
  };

  // ========================
  // Create Payout Batch (from Payments)
  // ========================
  const handleCreateBatch = async () => {
    if (!window.confirm("Create payout batch for all pending payments?"))
      return;

    setProcessing("batch");
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`${API_URL}/payout/create-batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ frequency: "monthly" })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to create payout batch");
      }

      setSuccess("✅ Payout batch created successfully!");
      setTimeout(fetchAllData, 800);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(null);
    }
  };

  // ========================
  // Process Payout Batch
  // ========================
  const handleProcessPayout = async (payoutId, batchName) => {
    if (!window.confirm(`Process payout batch: ${batchName}?`)) return;

    setProcessing(payoutId);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`${API_URL}/payout/${payoutId}/process`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to process payout");
      }

      setSuccess("✅ Payout processed successfully!");
      setTimeout(fetchAllData, 800);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(null);
    }
  };

  // ========================
  // Approve Request
  // ========================
  const handleApproveRequest = async (requestId) => {
    if (!window.confirm("Approve this payout request?")) return;

    setProcessing(requestId);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(
        `${API_URL}/payout-request/${requestId}/approve`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to approve request");
      }

      setSuccess("✅ Request approved!");
      setTimeout(fetchAllData, 800);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(null);
    }
  };
const handleProcessRequest = async (requestId) => {
  if (!window.confirm("Mark this request as PAID?")) return;

  setProcessing(requestId);

  try {
    const res = await fetch(
      `${API_URL}/payout-request/${requestId}/process`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Failed to process request");
    }

    setSuccess("✅ Request marked as PAID");
    setTimeout(fetchAllData, 800);
  } catch (err) {
    setError(err.message);
  } finally {
    setProcessing(null);
  }
};

  // ========================
  // Reject Request
  // ========================
  const handleRejectRequest = async (requestId) => {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;

    setProcessing(requestId);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(
        `${API_URL}/payout-request/${requestId}/reject`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ reason })
        }
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to reject request");
      }

      setSuccess("✅ Request rejected!");
      setTimeout(fetchAllData, 800);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(null);
    }
  };

  // ========================
  // Format Functions
  // ========================
  const formatCurrency = (amount) => {
    return (amount || 0).toLocaleString("vi-VN") + "đ";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  // ========================
  // Loading State
  // ========================
  if (loading) {
    return (
      <div className="admin-payout">
        <div className="loading-state">Loading payout data...</div>
      </div>
    );
  }

  // ========================
  // Render
  // ========================
  return (
    <div className="admin-payout">
      {/* Header */}
      <div className="payout-header">
        <h2> Payout & Request Management</h2>
        <p>Manage teacher payouts and payout requests</p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="success-banner">
          {success}
          <button onClick={() => setSuccess(null)}>✕</button>
        </div>
      )}

      {error && (
        <div className="error-banner">
          ❌ {error}
          <button onClick={fetchAllData}>Retry</button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="tabs-navigation">
        <button
          className={`tab-btn ${tab === "payouts" ? "active" : ""}`}
          onClick={() => setTab("payouts")}
        >
           Payout Batches
        </button>
        <button
          className={`tab-btn ${tab === "requests" ? "active" : ""}`}
          onClick={() => setTab("requests")}
        >
           Payout Requests ({requestSummary?.submitted || 0})
        </button>
      </div>

      {/* ================= TAB 1: PAYOUTS ================= */}
      {tab === "payouts" && (
        <div className="tab-content">
          {/* Pending Payments Section */}
          {pending?.teachers?.length > 0 ? (
            <div className="pending-section">
              <div className="section-header">
                <h3>⏳ Pending Payments (from student orders)</h3>
                <strong className="total-amount">
                  Total: {formatCurrency(pending.totalPending || 0)}
                </strong>
              </div>

              <button
                onClick={handleCreateBatch}
                disabled={processing === "batch"}
                className="btn btn-primary"
              >
                {processing === "batch"
                  ? "Creating..."
                  : " Create Payout Batch"}
              </button>

              <div className="table-wrapper">
                <table className="payout-table">
                  <thead>
                    <tr>
                      <th>Teacher</th>
                      <th>Email</th>
                      <th>Pending Amount</th>
                      <th>Payments Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.teachers.map((t) => (
                      <tr key={t.teacherId}>
                        <td className="teacher-name">
                          {t.fullName || "Unknown"}
                        </td>
                        <td className="email">{t.email || "-"}</td>
                        <td className="amount">
                          {formatCurrency(t.pendingAmount || 0)}
                        </td>
                        <td className="count">{t.paymentCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              ✅ No pending payments to process
            </div>
          )}

          {/* Payout History Section */}
          <div className="history-section">
            <h3> Payout Batch History</h3>

            {payouts.length > 0 ? (
              <div className="table-wrapper">
                <table className="payout-table">
                  <thead>
                    <tr>
                      <th>Batch ID</th>
                      <th>Period</th>
                      <th>Total Amount</th>
                      <th>Teachers</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map((p) => (
                      <tr key={p._id}>
                        <td className="batch-id">{p.payoutBatch}</td>
                        <td className="period">
                          {p.period?.startDate
                            ? formatDate(p.period.startDate)
                            : "-"}
                        </td>
                        <td className="amount">
                          {formatCurrency(p.totalAmount || 0)}
                        </td>
                        <td className="count">{p.teachers?.length || 0}</td>
                        <td className="status">
                          <span className={`badge badge-${p.status}`}>
                            {p.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="action">
                          {p.status === "draft" ? (
                            <button
                              onClick={() =>
                                handleProcessPayout(p._id, p.payoutBatch)
                              }
                              disabled={processing === p._id}
                              className="btn btn-sm btn-success"
                            >
                              {processing === p._id
                                ? "Processing..."
                                : "Process"}
                            </button>
                          ) : (
                            <span className="completed" style={{color: 'red'}}> Completed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No payout history</p>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 2: PAYOUT REQUESTS ================= */}
      {tab === "requests" && (
        <div className="tab-content">
          {/* Summary Cards */}
          {requestSummary && (
            <div className="request-summary">
              <div className="summary-card submitted">
                <p className="label">Pending Review</p>
                <p className="value">{requestSummary.submitted}</p>
              </div>
              <div className="summary-card approved">
                <p className="label">Approved</p>
                <p className="value">{requestSummary.approved}</p>
              </div>
              <div className="summary-card paid">
                <p className="label">Paid</p>
                <p className="value">{requestSummary.paid}</p>
              </div>
              <div className="summary-card rejected">
                <p className="label">Rejected</p>
                <p className="value">{requestSummary.rejected}</p>
              </div>
              <div className="summary-card total">
                <p className="label">Total Amount</p>
                <p className="value">
                  {formatCurrency(requestSummary.totalAmount || 0)}
                </p>
              </div>
            </div>
          )}

          {/* Pending Requests */}
          {requests.filter((r) => r.status === "submitted").length > 0 && (
            <div className="pending-requests-section">
              <h3> Pending Review</h3>
              <div className="table-wrapper">
                <table className="payout-table">
                  <thead>
                    <tr>
                      <th>Request #</th>
                      <th>Teacher</th>
                      <th>Amount</th>
                      <th>Bank</th>
                      <th>Account</th>
                      <th>Submitted</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests
                      .filter((r) => r.status === "submitted")
                      .map((req) => (
                        <tr key={req._id}>
                          <td className="request-number">{req.requestNumber}</td>
                          <td className="teacher">
                            {req.teacherId?.fullName || "Unknown"}
                          </td>
                          <td className="amount">
                            {formatCurrency(req.amount || 0)}
                          </td>
                          <td className="bank">
                            {req.bankAccount?.bankName || "-"}
                          </td>
                          <td className="account">
                            <small>
                              ****
                              {req.bankAccount?.accountNumber?.slice(-4)}
                            </small>
                          </td>
                          <td className="submitted-date">
                            {formatDate(req.submittedAt)}
                          </td>
                          <td className="actions">
                            <button
                              onClick={() => handleApproveRequest(req._id)}
                              disabled={processing === req._id}
                              className="btn btn-sm btn-success"
                            >
                              {processing === req._id ? "..." : "✓"}
                            </button>
                            <button
                              onClick={() => handleRejectRequest(req._id)}
                              disabled={processing === req._id}
                              className="btn btn-sm btn-danger"
                            >
                              {processing === req._id ? "..." : "✗"}
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* All Requests History */}
          <div className="requests-history-section">
            <h3> All Requests History</h3>
            {requests.length > 0 ? (
              <div className="table-wrapper">
                <table className="payout-table">
                  <thead>
                    <tr>
                      <th>Request #</th>
                      <th>Teacher</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Submitted</th>
                      <th>Approved</th>
                      <th>Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((req) => (
                      <tr key={req._id}>
                        <td className="request-number">{req.requestNumber}</td>
                        <td className="teacher">
                          {req.teacherId?.fullName || "Unknown"}
                        </td>
                        <td className="amount">
                          {formatCurrency(req.amount || 0)}
                        </td>
                        <td className="status">
                          <span className={`badge badge-${req.status}`}>
                            {req.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="submitted-date">
                          {formatDate(req.submittedAt)}
                        </td>
                        <td className="approved-date">
                          {formatDate(req.approvedAt)}
                        </td>
                        {req.status === "approved" && (
  <button
    onClick={() => handleProcessRequest(req._id)}
    className="btn btn-sm btn-success"
  >
     Pay
  </button>
)}

                        <td className="paid-date">
                          {formatDate(req.paidAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No requests yet</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}