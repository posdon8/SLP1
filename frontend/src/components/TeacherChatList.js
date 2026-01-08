import React, { useEffect, useState } from "react";
import ChatBox from "./ChatBox";

export default function TeacherChatList({ courseId, userId, token, socket }) {
  const [conversations, setConversations] = useState([]);
  const [activeConvo, setActiveConvo] = useState(null);

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
    <div style={{ display: "flex", gap: "20px" }}>
      {/* Left: danh sách học viên */}
      <div style={{ width: "200px", borderRight: "1px solid #ccc" }}>
        <h4>👨‍🏫 Học viên</h4>
        <ul>
          {conversations.map(c => {
            const student = c.members.find(m => m._id !== userId);
            return (
              <li key={c._id} style={{ cursor: "pointer", padding: "5px" }} onClick={() => setActiveConvo(c)}>
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
