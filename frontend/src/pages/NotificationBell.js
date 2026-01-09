import React, { useState, useEffect } from "react";
import { FaBell } from "react-icons/fa";
import "./Notification.css";

export default function NotificationBell({ token, isOpen }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const API_BASE = `${process.env.REACT_APP_API_URL}/notifications`;

  // Load notifications
  const loadNotifications = async () => {
    try {
      const res = await fetch(`${API_BASE}?page=1&limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch notifications");
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  // Khi popup mở → load + mark read
  useEffect(() => {
    if (!isOpen) return;

    const openAndRead = async () => {
      await loadNotifications();

      // Mark all as read
      await fetch(`${API_BASE}/read-all`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });

      setUnreadCount(0);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );
    };

    openAndRead();
  }, [isOpen]);

  // Load unread count lần đầu
  useEffect(() => {
    loadNotifications();
  }, []);

  return (
    <div className="notification-bell">
      <FaBell
        className="bell-icon"
        title={`${unreadCount} thông báo chưa đọc`}
      />

      {unreadCount > 0 && (
        <span className="badge">{unreadCount}</span>
      )}

      {isOpen && (
        <div className="dropdown">
          <h4 className="dropdown-title"> Thông báo</h4>

          {notifications.length === 0 ? (
            <p className="empty">Không có thông báo</p>
          ) : (
            <ul className="notification-list">
              {notifications.map((n) => (
                <li
                  key={n._id}
                  className={`notification-item ${
                    n.isRead ? "" : "unread"
                  }`}
                  onClick={() =>
                    n.link && window.open(n.link, "_blank")
                  }
                >
                  <p className="sender">
                    {n.sender?.fullName || "Người dùng"}
                  </p>
                  <small>
                    {new Date(n.createdAt).toLocaleString()}
                  </small>
                  <p className="message">{n.message}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
