import React, { useState, useEffect } from "react";
import "./AdminPayout.css";

export default function AdminPayoutManager() {
  const [payouts, setPayouts] = useState([]);
  const [pending, setPending] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [processing, setProcessing] = useState(null);

  const token = localStorage.getItem("token");
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

  useEffect(() => {
    fetchPayoutData();
  }, [token]);

  const fetchPayoutData = async () => {
    setLoading(true);
    setError(null);

    try {
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

      setLoading(false);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load payout data");
      setLoading(false);
    }
  };

  // ========================
  // Create Payout Batch
  // ========================
  const handleCreateBatch = async () => {
    if (!window.confirm("Create payout batch for all pending teachers?")) return;

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
      setTimeout(fetchPayoutData, 800);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(null);
    }
  };

  // ========================
  // Process Payout
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
      setTimeout(fetchPayoutData, 800);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(null);
    }
  };

  // ========================
  // RENDER
  // ========================
  if (loading) {
    return (
      <div className="admin-payout">
        <div className="loading-state">Loading payout data...</div>
      </div>
    );
  }

  return (
    <div className="admin-payout">
      <div className="payout-header">
        <h2> Teacher Payout Management</h2>
        <p>Manage teacher earnings & payout batches</p>
      </div>

      {success && (
        <div className="success-banner">
          {success}
          <button onClick={() => setSuccess(null)}>✕</button>
        </div>
      )}

      {error && (
        <div className="error-banner">
          ❌ {error}
          <button onClick={fetchPayoutData}>Retry</button>
        </div>
      )}

      {/* ================= Pending ================= */}
      {pending?.teachers?.length > 0 ? (
        <div className="pending-section">
          <div className="section-header">
            <h3>⏳ Pending Payments</h3>
            <strong>
              Total: ${pending.totalPending?.toLocaleString() || 0}
            </strong>
          </div>

          <button
            onClick={handleCreateBatch}
            disabled={processing === "batch"}
            className="btn btn-primary"
          >
            {processing === "batch" ? "Creating..." : "📦 Create Payout Batch"}
          </button>

          <table className="payout-table">
            <thead>
              <tr>
                <th>Teacher</th>
                <th>Email</th>
                <th>Pending Amount</th>
                <th>Payments</th>
              </tr>
            </thead>
            <tbody>
              {pending.teachers.map(t => (
                <tr key={t.teacherId}>
                  <td>{t.fullName || "Unknown"}</td>
                  <td>{t.email || "-"}</td>
                  <td>${t.pendingAmount?.toLocaleString() || 0}</td>
                  <td>{t.paymentCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>✅ No pending payouts</p>
      )}

      {/* ================= HISTORY ================= */}
      <div className="history-section">
        <h3>Payout History</h3>

        {payouts.length > 0 ? (
          <table className="payout-table">
            <thead>
              <tr>
                <th>Batch</th>
                <th>Period</th>
                <th>Total</th>
                <th>Teachers</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map(p => (
                <tr key={p._id}>
                  <td>{p.payoutBatch}</td>
                  <td>
                    {p.period?.startDate
                      ? new Date(p.period.startDate).toLocaleDateString()
                      : "-"}
                  </td>
                  <td>${p.totalAmount?.toLocaleString() || 0}</td>
                  <td>{p.teachers?.length || 0}</td>
                  <td>
                    <span className={`badge badge-${p.status}`}>
                      {p.status}
                    </span>
                  </td>
                  <td>
                    {p.status === "draft" ? (
                      <button
                        onClick={() =>
                          handleProcessPayout(p._id, p.payoutBatch)
                        }
                        disabled={processing === p._id}
                        className="btn btn-sm btn-success"
                      >
                        {processing === p._id ? "Processing..." : "Process"}
                      </button>
                    ) : (
                      "✅ Paid"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No payout history</p>
        )}
      </div>
    </div>
  );
}
