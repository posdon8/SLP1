import React, { useEffect, useState, useRef } from "react";
import "./ChatBox.css";

export default function ChatBox({ conversationId, userId, token, socket, onClose }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);
const user = JSON.parse(localStorage.getItem("user"));
  // Lấy thông tin user hiện tại
  const currentUser = JSON.parse(localStorage.getItem("user"));

  // Scroll xuống cuối khi có tin nhắn mới
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load messages lần đầu
  useEffect(() => {
    if (!conversationId) return;
    
    const fetchMessages = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/chat/${conversationId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        console.log("📩 Messages loaded:", data.messages); // 🔍 Debug
        setMessages(data.messages || []);
      } catch (err) {
        console.error("Error loading messages:", err);
      }
    };
    
    fetchMessages();
  }, [conversationId, token]);

  // Listen socket để nhận tin nhắn mới
  useEffect(() => {
    if (!socket || !conversationId) return;

    const handleReceiveMessage = (msg) => {
      console.log("🔔 Received message:", msg);
      // Chỉ nhận tin nhắn của conversation này
      if (msg.conversationId === conversationId) {
        setMessages(prev => {
          // Kiểm tra xem tin nhắn đã tồn tại chưa (tránh trùng)
          const exists = prev.some(m => m._id === msg._id);
          if (exists) return prev;
          return [...prev, msg];
        });
      }
    };

    socket.on("receive_message", handleReceiveMessage);
    
    return () => {
      socket.off("receive_message", handleReceiveMessage);
    };
  }, [socket, conversationId]);
const getAvatar = (msg) => {
  // Nếu sender là object (đã populate)
  if (msg.sender && typeof msg.sender === "object") {
    return (
      msg.sender.avatarUrl ||
      msg.sender.avatar ||
      "https://cdn-icons-png.flaticon.com/512/847/847969.png"
    );
  }

  // Nếu sender là ID (fallback)
  if (isMyMessage(msg)) {
    return (
      currentUser?.avatarUrl ||
      currentUser?.avatar ||
      "https://cdn-icons-png.flaticon.com/512/847/847969.png"
    );
  }

  return "https://cdn-icons-png.flaticon.com/512/847/847969.png";
};

  // Gửi tin nhắn
  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    
    const text = newMessage.trim();
    setNewMessage("");

    try {
      const res = await fetch("http://localhost:5000/api/chat/message", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ conversationId, text }),
      });

      if (!res.ok) {
        throw new Error("Failed to send message");
      }

      // Server sẽ emit qua socket, không cần thêm tin nhắn ở đây
    } catch (err) {
      console.error("Error sending message:", err);
      alert("Không thể gửi tin nhắn!");
    }
  };

  // Kiểm tra tin nhắn có phải của mình không
  const isMyMessage = (msg) => {
    const senderId = msg.sender?._id || msg.sender;
    const myId = currentUser?._id;
    return senderId?.toString() === myId?.toString();
  };

  // Lấy tên người gửi
 const getSenderName = (msg) => {
  // Kiểm tra xem có phải tin nhắn của mình không
  const currentUserId = currentUser?._id;
  
  // Lấy senderId từ msg.sender
  let senderId = null;
  let senderName = "Người dùng";
  
  if (msg.sender) {
    if (typeof msg.sender === "object") {
      senderId = msg.sender._id;
      senderName = msg.sender.fullName || msg.sender.name || "Người dùng";
    } else if (typeof msg.sender === "string") {
      senderId = msg.sender;
    }
  }
  
  // Nếu là tin nhắn của mình
  if (senderId && currentUserId && senderId.toString() === currentUserId.toString()) {
    return "Bạn";
  }
  
  return senderName;
};
  return (
    <div className="chatbox">
      {/* Header */}
      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <p className="empty-chat">Chưa có tin nhắn nào</p>
        ) : (
          messages.map((msg) => {
            const isMe = isMyMessage(msg);
            const senderName = getSenderName(msg);

            return (
              <div
                key={msg._id}
                className={`message ${isMe ? "my-message" : "other-message"}`}
              >
              {!isMe && (
                  <img src={getAvatar(msg)} className="user-avatar" />
                )}                
                <div className="message-bubble">
                  
              
                  <div className="message-text">{msg.text}</div>
                  <div className="message-time">
                    {new Date(msg.createdAt).toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </div>
                </div>
         
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat-input">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Nhập tin nhắn..."
        />
        <button onClick={sendMessage} disabled={!newMessage.trim()}>
          Gửi
        </button>
      </div>
    </div>
  );
}