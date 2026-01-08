// frontend/src/pages/Courses.js
import React, { useState, useEffect } from 'react';
import { courseAPI } from '../services/api';
import './Courses.css';

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState('all'); // all, active, my-courses
  const [enrolling, setEnrolling] = useState(null);

  useEffect(() => {
    fetchCourses();
  }, [currentPage, filter]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);

      let response;
      if (filter === 'my-courses') {
        response = await courseAPI.getMyCourses();
        setCourses(response.data.map(enrollment => ({
          ...enrollment.course,
          enrollment: enrollment
        })));
      } else {
        response = await courseAPI.getAllCourses({
          page: currentPage,
          limit: 12,
          status: filter === 'all' ? 'active' : filter
        });
        setCourses(response.data.courses);
        setTotalPages(response.data.totalPages);
      }
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách khóa học');
      console.error('Error fetching courses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      fetchCourses();
      return;
    }

    try {
      setLoading(true);
      const response = await courseAPI.searchCourses(searchQuery, currentPage);
      setCourses(response.data);
    } catch (err) {
      setError('Không thể tìm kiếm khóa học');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (courseId) => {
    try {
      setEnrolling(courseId);
      await courseAPI.enrollCourse(courseId);
      alert('Đăng ký khóa học thành công! 🎉');
      fetchCourses(); // Refresh list
    } catch (err) {
      alert(err.message || 'Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setEnrolling(null);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (loading && courses.length === 0) {
    return (
      <div className="courses-container">
        <div className="loading-container">
          <div className="loading-spinner">⏳ Đang tải khóa học...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="courses-container">
      {/* Header */}
      <header className="courses-header">
        <div className="header-content">
          <h1 className="page-title">📚 Khóa học</h1>
          <p className="page-subtitle">Khám phá và học tập cùng các khóa học chất lượng</p>
        </div>
      </header>

      {/* Search and Filter */}
      <div className="courses-controls">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Tìm kiếm khóa học..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-btn">🔍 Tìm kiếm</button>
        </form>

        <div className="filter-tabs">
          <button
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => { setFilter('all'); setCurrentPage(1); }}
          >
            Tất cả khóa học
          </button>
          <button
            className={`filter-tab ${filter === 'my-courses' ? 'active' : ''}`}
            onClick={() => { setFilter('my-courses'); setCurrentPage(1); }}
          >
            Khóa của tôi
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message">
          ❌ {error}
          <button onClick={fetchCourses} className="retry-btn">Thử lại</button>
        </div>
      )}

      {/* Courses Grid */}
      {courses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>Không tìm thấy khóa học nào</h3>
          <p>Hãy thử tìm kiếm với từ khóa khác</p>
        </div>
      ) : (
        <>
          <div className="courses-grid">
            {courses.map((course) => (
              <div key={course._id} className="course-card">
                <div className="course-image-wrapper">
                  <img
                    src={course.thumbnailUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=250&fit=crop'}
                    alt={course.title}
                    className="course-image"
                  />
                  {course.enrollment && (
                    <div className="course-badge">
                      ✓ Đã đăng ký
                    </div>
                  )}
                </div>

                <div className="course-content">
                  <h3 className="course-title">{course.title}</h3>
                  <p className="course-description">
                    {course.description?.substring(0, 100)}
                    {course.description?.length > 100 && '...'}
                  </p>

                  <div className="course-meta">
                    <div className="meta-item">
                      <span className="meta-icon">👨‍🏫</span>
                      <span className="meta-text">
                        {course.instructor?.fullName || 'Giảng viên'}
                      </span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-icon">👥</span>
                      <span className="meta-text">
                        {course.enrolledStudents?.length || 0} học viên
                      </span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-icon">📖</span>
                      <span className="meta-text">
                        {course.lessons?.length || 0} bài học
                      </span>
                    </div>
                  </div>

                  {course.enrollment ? (
                    <div className="course-progress">
                      <div className="progress-header">
                        <span>Tiến độ</span>
                        <span className="progress-percent">
                          {course.enrollment.progress}%
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${course.enrollment.progress}%` }}
                        ></div>
                      </div>
                      <button className="btn-continue">
                        Tiếp tục học →
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn-enroll"
                      onClick={() => handleEnroll(course._id)}
                      disabled={enrolling === course._id}
                    >
                      {enrolling === course._id ? 'Đang đăng ký...' : '📝 Đăng ký ngay'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {filter !== 'my-courses' && totalPages > 1 && (
            <div className="pagination">
              <button
                className="page-btn"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                ← Trước
              </button>

              <div className="page-numbers">
                {[...Array(totalPages)].map((_, index) => {
                  const pageNum = index + 1;
                  // Show first page, last page, current page, and pages around current
                  if (
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={pageNum}
                        className={`page-num ${currentPage === pageNum ? 'active' : ''}`}
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  } else if (
                    pageNum === currentPage - 2 ||
                    pageNum === currentPage + 2
                  ) {
                    return <span key={pageNum} className="page-dots">...</span>;
                  }
                  return null;
                })}
              </div>

              <button
                className="page-btn"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Sau →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}