import React, { useEffect, useState, useCallback } from "react";
import "./TeacherPayment.css";

export default function TeacherPayment() {
  // ========================
  // State
  // ========================
  const [stats, setStats] = useState(null);
  const [earnings, setEarnings] = useState(null);
  const [payments, setPayments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("overview");
  const [exporting, setExporting] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseDetail, setCourseDetail] = useState(null);
const [totalRevenue, setTotalRevenue] = useState(0);
const [totalCompletedCourses, setTotalCompletedCourses] = useState(0);



  const token = localStorage.getItem("token");
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
// Tính tổng số course từ completed payments

useEffect(() => {
  if (payments.length > 0) {
    const completedPayments = payments.filter(p => p.status === "completed");

    const revenue = completedPayments.reduce((sum, p) => {
  return (
    sum +
    (p.courseBreakdown || []).reduce(
      (s, c) => s + (c.finalPrice || 0),
      0
    )
  );
}, 0);


  const courseSet = new Set();

completedPayments.forEach(p => {
  p.courseBreakdown?.forEach(c => {
    courseSet.add(c.courseId.toString());
  });
});

const coursesCount = courseSet.size;


    setTotalRevenue(revenue);
    setTotalCompletedCourses(coursesCount);
  }
}, [payments]);
  // ========================
  // Fetch All Data
  // ========================
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // ✅ Fetch payment dashboard stats
      const paymentRes = await fetch(`${API_URL}/payment/teacher/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!paymentRes.ok) {
        throw new Error(`Dashboard HTTP ${paymentRes.status}`);
      }
      
      const paymentData = await paymentRes.json();

      // ✅ Fetch earnings data
      const earningsRes = await fetch(`${API_URL}/payment/teacher-earnings`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!earningsRes.ok) {
        throw new Error(`Earnings HTTP ${earningsRes.status}`);
      }
      
      const earningsData = await earningsRes.json();

      console.log("✅ Data loaded:", {
        payments: paymentData.payments?.length || 0,
        courses: paymentData.courses?.length || 0,
        earnings: earningsData.earnings
      });

      if (paymentData.success) {
        setStats(paymentData.stats);
        setPayments(paymentData.payments || []);
        setCourses(paymentData.courses || []);
      }

      if (earningsData.success) {
        setEarnings(earningsData.earnings);
      }
    } catch (err) {
      console.error("❌ Fetch error:", err);
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [token, API_URL]);

  useEffect(() => {
    if (token) {
      fetchAllData();
    }
  }, [token, fetchAllData]);

  // ========================
  // Fetch Course Detail
  // ========================
  const fetchCourseDetail = async (courseId) => {
    try {
      const res = await fetch(`${API_URL}/payment/teacher/course/${courseId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!res.ok) throw new Error("Failed to fetch course details");

      const data = await res.json();
      if (data.success) {
        setCourseDetail(data);
      }
    } catch (err) {
      console.error("❌ Error fetching course detail:", err);
      setError(err.message || "Failed to load course details");
    }
  };

  // ========================
  // Export CSV Report
  // ========================
  const handleExport = async () => {
    setExporting(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/payment/teacher/export`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `payment-report-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("❌ Export error:", err);
      setError("Failed to export report. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  // ========================
  // Handlers
  // ========================
  const handleSelectCourse = async (courseId) => {
    setSelectedCourse(courseId);
    setCourseDetail(null);
    await fetchCourseDetail(courseId);
  };

  // ========================
  // Format Functions
  // ========================
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  const formatCurrency = (amount) => {
    return (amount || 0).toLocaleString("vi-VN") + "đ";
  };

  // ========================
  // Loading State
  // ========================
  if (loading) {
    return (
      <div className="teacher-finance">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading finance data...</p>
        </div>
      </div>
    );
  }

  // ========================
  // Render Main Content
  // ========================
  return (
    <div className="teacher-finance">
      {/* Header */}
      <header className="finance-header">
        <div className="header-content">
          <h1>Finance Dashboard</h1>
          <p>Track your payments, earnings, and payouts</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="btn btn-primary btn-export"
        >
          {exporting ? "Exporting..." : "📥 Export CSV"}
        </button>
      </header>

      {/* Error Message */}
      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="tabs-navigation">
        <button
          className={`tab-btn ${tab === "overview" ? "active" : ""}`}
          onClick={() => setTab("overview")}
        >
          
          <span>Overview</span>
        </button>
        <button
          className={`tab-btn ${tab === "courses" ? "active" : ""}`}
          onClick={() => setTab("courses")}
        >
         
          <span>Courses ({courses.length})</span>
        </button>
        <button
          className={`tab-btn ${tab === "transactions" ? "active" : ""}`}
          onClick={() => setTab("transactions")}
        >
       
          <span>Transactions</span>
        </button>
        <button
          className={`tab-btn ${tab === "earnings" ? "active" : ""}`}
          onClick={() => setTab("earnings")}
        >

          <span>Earnings & Payouts</span>
        </button>
      </div>

      {/* TAB 1: Overview */}
      {tab === "overview" && stats && (
        <div className="tab-content">
          <section className="stats-section">
            <h2>Your Statistics</h2>
            <div className="stat-grid">
              <div className="stat-card revenue">
                <div className="stat-icon">💰</div>
                <div className="stat-body">
                  <div className="stat-label">Total Revenue (After Discount)</div>
                  <div className="stat-value">
                    {formatCurrency(totalRevenue || 0)}
                  </div>
                  <div className="stat-detail">
                    {stats.totalCompletedPayments} successful transactions
                  </div>
                </div>
              </div>

              <div className="stat-card earnings">
                <div className="stat-icon">🎓</div>
                <div className="stat-body">
                  <div className="stat-label">Your Earnings</div>
                  <div className="stat-value">
                    {formatCurrency(stats.totalTeacherEarnings || 0)}
                  </div>
                  <div className="stat-detail">
                    Your share from sales
                  </div>
                </div>
              </div>

              <div className="stat-card platform">
                <div className="stat-icon">🏢</div>
                <div className="stat-body">
                  <div className="stat-label">Platform Fee</div>
                  <div className="stat-value">
                    {formatCurrency(stats.totalPlatformFee || 0)}
                  </div>
                  <div className="stat-detail">
                    Platform commission
                  </div>
                </div>
              </div>

              <div className="stat-card students">
                <div className="stat-icon">👥</div>
                <div className="stat-body">
                  <div className="stat-label">Total Students</div>
                  <div className="stat-value">{stats.totalStudents || 0}</div>
                  <div className="stat-detail">
                    Across {totalCompletedCourses || 0} courses
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Payment Status Summary */}
          <section className="payment-status-section">
            <h2>Transaction Status</h2>
            <div className="status-grid">
              <div className="status-card completed">
                <div className="status-icon">✅</div>
                <div className="status-content">
                  <div className="status-label">Completed</div>
                  <div className="status-count">
                    {stats.totalCompletedPayments || 0}
                  </div>
                </div>
              </div>

              <div className="status-card pending">
                <div className="status-icon">⏳</div>
                <div className="status-content">
                  <div className="status-label">Pending</div>
                  <div className="status-count">
                    {stats.totalPendingPayments || 0}
                  </div>
                </div>
              </div>

              <div className="status-card failed">
                <div className="status-icon">❌</div>
                <div className="status-content">
                  <div className="status-label">Failed</div>
                  <div className="status-count">
                    {stats.totalFailedPayments || 0}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* TAB 2: Courses */}
      {tab === "courses" && (
        <div className="tab-content">
          <section className="courses-section">
            <h2>Course Performance</h2>

            {courses.length > 0 ? (
              <div className="courses-grid">
                {courses.map((course) => {
                  // ✅ Filter payments by courseIds array or courseId field
                  // Fix filter payments by course

                  
                 const courseRevenue = payments.reduce((sum, p) => {
  if (p.status !== "completed") return sum;

  const breakdown = p.courseBreakdown?.find(
    (c) => c.courseId.toString() === course._id.toString()
  );

  return sum + (breakdown?.finalPrice || 0);
}, 0);

const courseSales = payments.filter(
  (p) =>
    p.status === "completed" &&
    p.courseBreakdown?.some(
      (c) => c.courseId.toString() === course._id.toString()
    )
).length;


                  return (
                    <div key={course._id} className="course-card">
                      <div className="course-image">
                        {course.thumbnail ? (
                          <img
                            src={course.thumbnail}
                            alt={course.title}
                            loading="lazy"
                          />
                        ) : (
                          <div className="no-image">📚</div>
                        )}
                      </div>

                      <div className="course-info">
                        <h3>{course.title}</h3>

                        <div className="course-metrics">
                          <div className="metric">
                            <span className="label">Price:</span>
                            <span className="value">
  {formatCurrency(course.price || 0)}
</span>


                          </div>
                          <div className="metric">
                            <span className="label">Sales:</span>
                            <span className="value">{courseSales}</span>
                          </div>
                          <div className="metric">
                            <span className="label">Revenue:</span>
                            <span className="value revenue">
                              {formatCurrency(courseRevenue)}
                            </span>
                          </div>
                        </div>

                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleSelectCourse(course._id)}
                        >
                          View Details →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <p>No courses yet. Start creating courses to earn!</p>
              </div>
            )}

            {/* Course Detail Modal */}
            {selectedCourse && courseDetail && (
              <div
                className="modal-overlay"
                onClick={() => setSelectedCourse(null)}
              >
                <div
                  className="modal-content"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="btn-close"
                    onClick={() => setSelectedCourse(null)}
                  >
                    ✕
                  </button>

                  <h2>{courseDetail.stats?.courseName}</h2>

                  <div className="modal-stats">
                    <div className="stat">
                      <span className="label">Total Revenue</span>
                      <span className="value">
  {formatCurrency(courseDetail.stats?.totalRevenue || 0)}
</span>

                    </div>
                    <div className="stat">
                      <span className="label">Total Sales</span>
                      <span className="value">
                        {courseDetail.stats?.totalSales || 0}
                      </span>
                    </div>
                    <div className="stat">
                      <span className="label">Total Students</span>
                      <span className="value">
                        {courseDetail.stats?.totalStudents || 0}
                      </span>
                    </div>
                  </div>

                  <h3>Recent Purchases</h3>
                  <div className="transactions-list">
                    {courseDetail.payments?.slice(0, 10).map((payment) => (
                      <div key={payment._id} className="transaction">
                        <div className="tx-info">
                          <p className="tx-user">
                            {payment.studentId?.username || "Student"}
                          </p>
                          <p className="tx-date">
                            {new Date(payment.createdAt).toLocaleDateString("en-US")}
                          </p>
                        </div>
                        <span className="tx-amount">
                          {formatCurrency(payment.amount || 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* TAB 3: Transactions */}
      {tab === "transactions" && (
        <div className="tab-content">
          <section className="timeline-section">
            <h2>Recent Transactions</h2>

            {payments.filter((p) => p.status === "completed").length > 0 ? (
              <div className="transactions-list timeline">
                {payments
                  .filter((p) => p.status === "completed")
                  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                  .slice(0, 30)
                  .map((payment) => {
                    const courses = payment.courseBreakdown || [];

                    
                    return (
                      <div key={payment._id} className="transaction-item">
                        <div className="tx-date">
                          {new Date(payment.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric"
                          })}
                        </div>

                        <div className="tx-content">
                          <div className="tx-course-list">
  {courses.map((c, idx) => (
    <div key={idx} className="tx-course-item">
      <span className="course-name">{c.courseTitle}</span>
      <span className="course-price">
        {formatCurrency(c.finalPrice)}
      </span>
    </div>
  ))}
</div>


                          <p className="tx-detail">
                            <span className="user">
                              {payment.studentId?.username || "Student"}
                            </span>
                            {payment.couponCode && (
                              <span className="coupon">
                                Coupon: {payment.couponCode}
                              </span>
                            )}
                          </p>
                        </div>

                        <div className="tx-breakdown">
                          <div className="tx-original">
                            Tổng gốc: 
                            {formatCurrency(payment.originalPrice)}
                          </div>
                          <div className="tx-final">
                            Tổng thu:
                            {formatCurrency(payment.amount)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="empty-state">
                <p>No completed transactions yet.</p>
              </div>
            )}
          </section>
        </div>
      )}

      {/* TAB 4: Earnings & Payouts */}
      {tab === "earnings" && earnings && (
        <div className="tab-content">
          <section className="earnings-stats">
            <h2>Earnings & Payouts Summary</h2>
            <div className="earnings-grid">
              <div className="stat-card total">
                <div className="stat-icon">💰</div>
                <div className="stat-content">
                  <label className="stat-label">Total Your Earnings</label>
                  <div className="stat-amount">
                    {formatCurrency(earnings.totalEarnings || 0)}
                  </div>
                  <p className="stat-detail">Your share from all sales</p>
                </div>
              </div>

              <div className="stat-card platform">
                <div className="stat-icon">🏢</div>
                <div className="stat-content">
                  <label className="stat-label">Platform Revenue</label>
                  <div className="stat-amount secondary">
                    {formatCurrency(earnings.totalPlatformFee || 0)}
                  </div>
                  <p className="stat-detail">Platform commission</p>
                </div>
              </div>

              <div className="stat-card pending">
                  <div className="stat-icon">⏳</div>
                  <div className="stat-content">
                    <label className="stat-label">Pending Payout (In Draft Batch)</label>
                    <div className="stat-amount warning">
                      {formatCurrency(earnings.pendingAmount || 0)}
                    </div>
                    <p className="stat-detail">
                      Included in payout batch but not processed yet
                    </p>
                  </div>
                </div>


              <div className="stat-card paid">
                <div className="stat-icon">✅</div>
                <div className="stat-content">
                  <label className="stat-label">Already Paid</label>
                  <div className="stat-amount success">
                    {formatCurrency(earnings.paidAmount || 0)}
                  </div>
                  <p className="stat-detail">Received to bank</p>
                </div>
              </div>
            </div>
          </section>

          <section className="payout-timeline">
            <h2>Payout Schedule</h2>
            <div className="timeline-grid">
              <div
                className={`timeline-item ${
                  earnings.lastPayoutDate ? "" : "empty"
                }`}
              >
                <div className="timeline-icon">📤</div>
                <div className="timeline-content">
                  <p className="timeline-label">Last Payout</p>
                  <p className="timeline-date">
                    {earnings.lastPayoutDate
                      ? formatDate(earnings.lastPayoutDate)
                      : "No payout yet"}
                  </p>
                </div>
              </div>

              <div
                className={`timeline-item next ${
                  earnings.nextPayoutDate ? "" : "empty"
                }`}
              >
                <div className="timeline-icon">⏰</div>
                <div className="timeline-content">
                  <p className="timeline-label">Next Payout</p>
                  <p className="timeline-date">
                    {earnings.nextPayoutDate
                      ? formatDate(earnings.nextPayoutDate)
                      : "Not scheduled"}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {earnings.monthlyBreakdown && earnings.monthlyBreakdown.length > 0 ? (
            <section className="monthly-breakdown">
              <h2> Monthly Breakdown</h2>
              <div className="table-wrapper">
                <table className="breakdown-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Your Earning</th>
                      <th>Platform Fee</th>
                      <th>Students</th>
                      <th>Courses</th>
                    </tr>
                  </thead>
                  <tbody>
                    {earnings.monthlyBreakdown.map((month, idx) => (
                      <tr key={idx}>
                        <td className="month-cell">
                          {new Date(month.month + "-01").toLocaleDateString(
                            "en-US",
                            { year: "numeric", month: "long" }
                          )}
                        </td>
                        <td className="amount-cell earning">
                          <strong>{formatCurrency(month.earning || 0)}</strong>
                        </td>
                        <td className="amount-cell platform">
                          {formatCurrency(month.platformFee || 0)}
                        </td>
                        <td className="count-cell">
                          <span className="badge">{month.studentCount || 0}</span>
                        </td>
                        <td className="count-cell">
                          <span className="badge secondary">
                            {month.courseCount || 0}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : (
            <section className="empty-state">
              <p>📭 No monthly data yet. Start selling courses to earn!</p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}