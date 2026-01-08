import React, { useEffect, useState } from "react";
import ChatBox from "./ChatBox";

export default function TeacherChatList({ courseId, userId, token, socket }) {
  const [conversations, setConversations] = useState([]);
  const [activeConvo, setActiveConvo] = useState(null);

  // Lấy list conversations cho teacher
  useEffect(() => {
    const fetchConvos = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/chat/teacher/${courseId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setConversations(data.convos || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchConvos();
  }, [courseId, token]);

  return (
    <div style={{ display: "flex", gap: "20px", marginTop:"10px" }}>
      {/* Left: danh sách học viên */}
      <div style={{ width: "200px", borderRight: "1px solid #ccc", maxHeight:"400px", overflowY:"auto" }}>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {conversations.map(c => {
            const student = c.members.find(m => m._id !== userId);
            return (
              <li
                key={c._id}
                style={{
                  cursor: "pointer",
                  padding: "5px 10px",
                  backgroundColor: activeConvo?._id===c._id ? "#e0e0e0" : "transparent",
                  borderBottom: "1px solid #ddd"
                }}
                onClick={() => setActiveConvo(c)}
              >
                {student?.fullName || "Unknown"}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Right: ChatBox */}
      <div style={{ flex: 1 }}>
        {activeConvo ? (
          <ChatBox
            conversationId={activeConvo._id}
            userId={userId}
            token={token}
            socket={socket}
            onClose={() => setActiveConvo(null)}
          />
        ) : (
          <p>Chọn học viên để chat</p>
        )}
      </div>
    </div>
  );
}
