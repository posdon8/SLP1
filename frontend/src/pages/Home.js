// frontend/src/pages/Home.js
import React, { useState, useEffect } from 'react';
import './Home.css';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    stats: [],
    courses: [],
    schedules: [],
    notifications: []
  });

  // Fetch data from API
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/home/dashboard', {
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${localStorage.getItem('token')}` // Thêm khi có auth
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      const data = await response.json();
      
      if (data.success) {
        // Format stats
        const formattedStats = [
          { label: 'Khóa học đang học', value: data.data.stats.enrolledCourses, icon: '📚', color: 'blue' },
          { label: 'Khóa học hoàn thành', value: data.data.stats.completedCourses, icon: '🏆', color: 'green' },
          { label: 'Giờ học tuần này', value: data.data.stats.weeklyHours, icon: '⏰', color: 'purple' },
          { label: 'Điểm trung bình', value: data.data.stats.averageGrade, icon: '📈', color: 'orange' }
        ];

        // Format schedules
        const formattedSchedules = data.data.schedules.map(schedule => {
          const startDate = new Date(schedule.startTime);
          const endDate = new Date(schedule.endTime);
          
          return {
            id: schedule.id,
            course: schedule.course,
            time: `${startDate.getHours()}:${String(startDate.getMinutes()).padStart(2, '0')} - ${endDate.getHours()}:${String(endDate.getMinutes()).padStart(2, '0')}`,
            date: startDate.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' }),
            room: schedule.room
          };
        });

        // Format notifications
        const formattedNotifications = data.data.notifications.map(notif => {
          const timeAgo = getTimeAgo(new Date(notif.time));
          return {
            id: notif.id,
            type: notif.type,
            message: notif.message,
            time: timeAgo
          };
        });

        setDashboardData({
          stats: formattedStats,
          courses: data.data.courses,
          schedules: formattedSchedules,
          notifications: formattedNotifications
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      // Fallback to sample data if API fails
      loadSampleData();
    } finally {
      setLoading(false);
    }
  };

  const loadSampleData = () => {
    // Sample data as fallback
    setDashboardData({
      stats: [
        { label: 'Khóa học đang học', value: '8', icon: '📚', color: 'blue' },
        { label: 'Khóa học hoàn thành', value: '12', icon: '🏆', color: 'green' },
        { label: 'Giờ học tuần này', value: '24', icon: '⏰', color: 'purple' },
        { label: 'Điểm trung bình', value: '8.5', icon: '📈', color: 'orange' }
      ],
      courses: [
        {
          id: 1,
          title: 'Lập trình Web với React',
          instructor: 'Nguyễn Văn A',
          progress: 75,
          thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=250&fit=crop',
          nextLesson: 'Bài 12: Hooks nâng cao'
        }
      ],
      schedules: [
        { id: 1, course: 'Lập trình Web với React', time: '14:00 - 16:00', date: 'Thứ 2, 07/10', room: 'Online' }
      ],
      notifications: [
        { id: 1, type: 'deadline', message: 'Bài tập "React Hooks" sắp đến hạn nộp', time: '2 giờ trước' }
      ]
    });
  };

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'Vừa xong';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ trước`;
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">⏳ Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="home-container">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <button className="menu-btn">☰</button>
            <h1 className="logo">LMS Platform</h1>
          </div>
          
          <div className="header-right">
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Tìm kiếm khóa học..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
            
            <button className="notification-btn">
              🔔
              {dashboardData.notifications.length > 0 && <span className="badge"></span>}
            </button>
            
            <button className="user-btn">
              <div className="user-avatar">👤</div>
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        {/* Welcome Section */}
        <div className="welcome-section">
          <h2 className="welcome-title">Chào mừng trở lại! 👋</h2>
          <p className="welcome-text">Hãy tiếp tục hành trình học tập của bạn</p>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          {dashboardData.stats.map((stat, index) => (
            <div key={index} className={`stat-card stat-${stat.color}`}>
              <div className="stat-content">
                <div className="stat-info">
                  <p className="stat-label">{stat.label}</p>
                  <p className="stat-value">{stat.value}</p>
                </div>
                <div className="stat-icon">
                  <span>{stat.icon}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="content-grid">
          {/* Main Content - Courses */}
          <div className="courses-section">
            <h3 className="section-title">Tiếp tục học tập</h3>
            <div className="courses-grid">
              {dashboardData.courses.map((course) => (
                <div key={course.id} className="course-card">
                  <img src={course.thumbnail} alt={course.title} className="course-image" />
                  <div className="course-body">
                    <h4 className="course-title">{course.title}</h4>
                    <p className="course-instructor">{course.instructor}</p>
                    
                    <div className="progress-section">
                      <div className="progress-info">
                        <span>Tiến độ</span>
                        <span>{course.progress}%</span>
                      </div>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${course.progress}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="next-lesson">
                      <span className="next-lesson-label">Bài tiếp theo:</span>
                      <span className="next-lesson-title">{course.nextLesson}</span>
                    </div>
                    
                    <button className="continue-btn">Tiếp tục học</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="sidebar">
            {/* Upcoming Classes */}
            <section className="sidebar-card">
              <h3 className="sidebar-title">
                <span className="title-icon">📅</span>
                Lịch học sắp tới
              </h3>
              <div className="schedule-list">
                {dashboardData.schedules.map((item) => (
                  <div key={item.id} className="schedule-item">
                    <h4 className="schedule-course">{item.course}</h4>
                    <p className="schedule-date">{item.date}</p>
                    <p className="schedule-time">{item.time} • {item.room}</p>
                  </div>
                ))}
              </div>
              <button className="view-all-btn">Xem tất cả lịch học</button>
            </section>

            {/* Notifications */}
            <section className="sidebar-card">
              <h3 className="sidebar-title">
                <span className="title-icon">🔔</span>
                Thông báo
              </h3>
              <div className="notifications-list">
                {dashboardData.notifications.map((notif) => (
                  <div key={notif.id} className="notification-item">
                    <p className="notification-message">{notif.message}</p>
                    <p className="notification-time">{notif.time}</p>
                  </div>
                ))}
              </div>
              <button className="view-all-btn">Xem tất cả thông báo</button>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}