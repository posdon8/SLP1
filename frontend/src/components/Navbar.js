import React, { useState, useEffect, useRef, useContext } from "react";
import "./Navbar.css";
import { FaBell, FaUserCircle, FaSearch, FaTimes, FaPlus, FaPlusCircle, FaCheck, FaMoneyBillWave, FaUniversity, FaNewspaper, FaCalendarAlt } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import NotificationBell from "../pages/NotificationBell";
import { jwtDecode } from "jwt-decode";
import CalendarPopup from "../components/CalendarPopup";
import { useCart } from "../context/CartContext";
import { AuthContext } from "../context/AuthContext";
import RoleModal from "../components/RoleModal";

export default function Navbar() {
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const { user, logout } = useContext(AuthContext);
  const [showRoleModal, setShowRoleModal] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const [isNotiOpen, setIsNotiOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [categories, setCategories] = useState([]);
  const [showCategories, setShowCategories] = useState(false);
  const isTeacher = user?.roles?.includes("teacher");

  // ✅ FIX: Dùng hook và lắng nghe event
  const { cartItems } = useCart();
  const [cartCount, setCartCount] = useState(0);

const handleTeachingClick = () => {
  if (user?.roles?.includes("teacher")) {
    navigate("/teacher-dashboard");
  } else {
    setShowRoleModal(true);
  }
};


  // ✅ FIX: Cập nhật cartCount khi cartItems thay đổi
  useEffect(() => {
    setCartCount(cartItems.length);
    console.log("🛒 CartItems from hook:", cartItems.length);
  }, [cartItems]);

  // Click outside để đóng search results
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
const fetchCategories = async () => {
  try {
    const res = await fetch(`${process.env.REACT_APP_API_URL}/categories`);
    const data = await res.json();
    if (data.success) {
      setCategories(data.data);
    }
  } catch (err) {
    console.error(err);
  }
};


  useEffect(() => {
  fetchCategories();

  const handler = () => fetchCategories();
  window.addEventListener("categoriesUpdated", handler);

  return () => {
    window.removeEventListener("categoriesUpdated", handler);
  };
}, []);


  // Tìm kiếm khóa học
  useEffect(() => {
    const searchCourses = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setShowSearchResults(false);
        return;
      }

      setIsSearching(true);
      setShowSearchResults(true);

      try {
        const response = await fetch(
          `${process.env.REACT_APP_API_URL}/courses/search?q=${encodeURIComponent(searchQuery)}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.courses || []);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(() => {
      searchCourses();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleAccountClick = () => {
    setIsAccountOpen((prev) => !prev);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    logout();
    setIsAccountOpen(false);
    navigate("/");
    window.dispatchEvent(new Event("storage"));
  };

  const handleCourseClick = (courseId) => {
    console.log("🔗 Navigating to:", `/courses/${courseId}`);
    navigate(`/course/${courseId}`);
    setSearchQuery("");
    setShowSearchResults(false);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setShowSearchResults(false);
    }
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-left">
          <div className="navbar-logo" onClick={() => navigate("/dashboard")}>
            <h2>SLP</h2>
            <img
              className="logo"
              src={`${process.env.REACT_APP_API_URL.replace('/api','')}/uploads/images/Vũ Sĩ Tâm - 20215475 - ReportProjectI.pptx.png`}
              alt="logo"
            />
          </div>

          <div
            className="nav-category"
            onMouseEnter={() => setShowCategories(true)}
            onMouseLeave={() => setShowCategories(false)}
          >
            <span className="nav-category-title">Explore</span>

            {showCategories && (
              <div className="category-dropdown">
                {categories.map((cat) => (
                  <div
                    key={cat._id}
                    className="category-item"
                    onClick={() => navigate(`/category/${cat.slug}`)}
                  >
                    {cat.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="navbar-center">
          <form className="navbar-search" onSubmit={handleSearchSubmit} ref={searchRef}>
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Tìm kiếm khóa học..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery && setShowSearchResults(true)}
            />
            {searchQuery && (
              <FaTimes className="clear-icon" onClick={handleClearSearch} />
            )}

            {/* Search Results Dropdown */}
            {showSearchResults && (
              <div className="search-dropdown">
                {isSearching ? (
                  <div className="search-loading">
                    <span>🔍 Đang tìm kiếm...</span>
                  </div>
                ) : searchResults.length > 0 ? (
                  <>
                    <div className="search-results">
                      {searchResults.map((course) => (
                        <div
                          key={course._id}
                          className="search-result-item"
                          onClick={() => handleCourseClick(course._id)}
                        >
                          <div className="result-info">
                            <h4>{course.title}</h4>
                            <p className="result-teacher">
                              {course.teacher?.fullName || "Giảng viên"}
                            </p>
                            <div className="result-meta">
                              <span>👥 {course.totalStudents || 0}</span>
                              <span>⭐ {course.rating || 0}/5</span>
                              {course.isFree ? (
                                <span className="free-badge">Miễn phí</span>
                              ) : (
                                <span className="price">{course.price}đ</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="search-footer">
                      <button
                        type="submit"
                        className="view-all-btn"
                        onClick={handleSearchSubmit}
                      >
                        Xem tất cả {searchResults.length} kết quả →
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="search-empty">
                    <span>😕 Không tìm thấy khóa học nào</span>
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        <div className="navbar-actions">
          {user?.roles?.includes("admin") && (

            <h2
              className="icon cate"
              onClick={() => navigate("/category-manage")}
            >
              Category+
            </h2>
          )}
          {user?.roles?.includes("student") && (
            <h2
              className="icon join"
              onClick={() => navigate(`/join-course`)}
              title="Tham gia khoa hoc"
            >
              Join+
            </h2>
          )}
          {user && (
            <h2
              className="icon news"
              title="Quản lý Tin tức"
              onClick={() => navigate("/news")}
            >
              News
            </h2>
          )}
          {(user?.roles?.includes("student") || user?.roles?.includes("teacher")) && (

            <div
              className="calendar-wrapper"
              onMouseEnter={() => setShowCalendar(true)}
              onMouseLeave={() => setShowCalendar(false)}
            >
              <FaCalendarAlt
                className="icon calendar"
                onClick={() => navigate("/calendar")}
              />

              {showCalendar && (
                <CalendarPopup token={localStorage.getItem("token")} />
              )}
            </div>
          )}

          {user?.roles?.includes("student") && (
            <button
              className="cart-icon"
              onClick={() => navigate("/cart")}
            >
              <img
                className="logo"
                src={`${process.env.REACT_APP_API_URL.replace('/api','')}/uploads/images/grocery-store.png`}
                alt="logo"
                style={{ height: "22px", background: "white" }}
              />
              {cartCount > 0 && <span className="badge">{cartCount}</span>}
            </button>
          )}
          {user?.roles?.includes("admin") && (

            <button
              className="icon voucher"
              onClick={() => navigate("/voucher")}
            >
              <img
                className="logo"
                src={`${process.env.REACT_APP_API_URL.replace('/api','')}/uploads/images/voucher.png`}
                alt="logo"
                style={{ height: "30px", background: "white" }}
              />
            </button>
          )}

          {user && (
            <div
              className="noti-wrapper"
              onMouseEnter={() => setIsNotiOpen(true)}
              onMouseLeave={() => setIsNotiOpen(false)}
            >
              <NotificationBell
                className="icon noti"
                token={localStorage.getItem("token")}
                userId={user._id}
                isOpen={isNotiOpen}
              />
            </div>
          )}

          {user ? (
            <div
              className="account-wrapper"
              onMouseEnter={() => setIsAccountOpen(true)}
              onMouseLeave={() => setIsAccountOpen(false)}
            >
              <FaUserCircle
                className="icon user"
                title={user.fullName || user.username}
              />

              {isAccountOpen && (
                <div className="account-menu">
                  <button
                    onClick={() => {
                    if (user.roles?.includes("student")) {
                    navigate("/my-courses");
                  } else if (user.roles?.includes("admin")) {
                    navigate("/course-manage");
                  }

                      setIsAccountOpen(false);
                    }}
                  >
                    {user.roles?.includes("student") || user.roles?.includes("teacher")

                      ? "Khóa học của bạn"
                      : "Quản lý khóa học"}
                  </button>

                  <button onClick={() => navigate("/profile")}>
                    Thông tin tài khoản
                  </button>
                  {user?.roles?.includes("student") && (
                  <button
                    className="become-teacher-btn"
                    onClick={handleTeachingClick}
                  >
                    Giảng dạy
                  </button>
                )}

<RoleModal
      isOpen={showRoleModal}
      onClose={() => setShowRoleModal(false)}
      token={localStorage.getItem("token")}
      onSuccess={(updatedUser) => {
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setShowRoleModal(false);
      }}
    />
                {user.roles?.includes("student") && (
                    <button onClick={() => navigate("/payment-history")}>
                      Lịch sử giao dịch
                    </button>
                  )}

                  {user.roles?.includes("teacher") && (
                    <button onClick={() => navigate("/teacher-payment-dashboard")}>
                      Thống kê giao dịch
                    </button>
                  )}

          {user.roles?.includes("admin") && (
                    <button onClick={() => navigate("/admin/payout")}>
                      Quản lý chi trả
                    </button>
                  )}

                  <button className="signout-btn" onClick={handleLogout}>
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
            <button className="signin-btn" onClick={() => navigate("/login")}>
              Log in
            </button>
            <button className="signin-btn" onClick={() => navigate("/register")}>
              Sign up
            </button>
            </>
          )}
        </div>
      </nav>
    </>
  );
}