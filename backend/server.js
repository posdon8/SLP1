require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const path = require("path");

// Routes
const authRoutes = require("./src/routes/auth");
const courseRoutes = require("./src/routes/course");
const userRoutes = require("./src/routes/user");
const quizRoutes = require("./src/routes/quiz");
const questionBankRoutes = require("./src/routes/questionBank");
const chatRoutes = require("./src/routes/chat");
const notificationRoutes = require("./src/routes/notifications");
const newsRoutes = require("./src/routes/news");
const feedbackRoutes = require("./src/routes/feedback");
const uploadRoutes = require("./src/routes/upload");
const paymentRoutes = require("./src/routes/payment");
const categoryRoutes = require("./src/routes/category");
const payoutRoutes = require("./src/routes/payout");
const scheduleRoutes = require("./src/routes/schedule");
const couponRoutes = require("./src/routes/coupon");
const exerciseRoutes = require("./src/routes/exercise");
const submissionRoutes = require("./src/routes/submission");
const adminRoutes = require("./src/routes/admin.users")
// Models
const Message = require("./src/models/Message");
const User = require("./src/models/User");

// ========================================
// CORS & Socket.io Configuration
// ========================================

// ✅ Frontend URLs (support localhost & ngrok)

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5001",
  "http://localhost:5000",
  process.env.FRONTEND_URL,     // http://localhost:5001 from .env
  process.env.CLIENT_URL    // Ngrok domain
].filter(Boolean);

console.log("🌐 Allowed CORS Origins:", ALLOWED_ORIGINS);

// ✅ CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    
    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS blocked origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"]
};

// Init app
const app = express();

// ✅ Middleware
app.use(cors(corsOptions));
app.use(express.urlencoded({ limit: "2gb", extended: true }));
app.use(express.json({ limit: "2gb" }));

// ✅ Static files for uploads
const uploadsPath = path.join(__dirname, "uploads");
app.use("/uploads", express.static(uploadsPath, {
  maxAge: "1d",
  etag: false
}));

// ========================================
// ROUTES
// ========================================
app.use("/api/chat", chatRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/questionbank", questionBankRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/user", userRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/coupon", couponRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/payout", payoutRoutes);
app.use("/api/exercises", exerciseRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/feedback", feedbackRoutes);
// Health check
app.get("/", (req, res) => {
  res.json({
    status: "Backend running 🚀",
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
});

// Upload test endpoint
app.get("/api/upload/test", (req, res) => {
  res.json({
    success: true,
    message: "Upload endpoint hoạt động",
    uploadsPath: uploadsPath,
    testUrl: "http://localhost:5000/uploads/videos/sample.mp4"
  });
});
app.get('/ping', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// ========================================
// MONGODB & SERVER SETUP
// ========================================
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB");

    // ========================================
    // CREATE HTTP SERVER + SOCKET.IO
    // ========================================
    const server = http.createServer(app);
    
    const io = new Server(server, {
      cors: {
        origin: ALLOWED_ORIGINS,
        methods: ["GET", "POST"],
        credentials: true
      },
      maxHttpBufferSize: 2e9,
      transports: ["websocket", "polling"]
    });

    global.io = io;
    app.set("io", io);

    // ========================================
    // SOCKET IO - Connection Handler
    // ========================================
    io.on("connection", (socket) => {
      console.log("🔌 Socket connected:", socket.id);

      // ✅ Verify token
      const token = socket.handshake.auth?.token;
      if (!token) {
        console.log("❌ Missing token → disconnect");
        return socket.disconnect();
      }

      let userId;
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
        userId = decoded.id;
        socket.userId = userId;
      } catch (err) {
        console.log("❌ Invalid token → disconnect");
        return socket.disconnect();
      }

      socket.joinedRooms = new Set();

      // ========================================
      // JOIN_ROOM Event
      // ========================================
      socket.on("join_room", (conversationId) => {
        if (!conversationId) return;

        if (!socket.joinedRooms.has(conversationId)) {
          socket.join(conversationId);
          socket.joinedRooms.add(conversationId);
          console.log(`📌 User ${socket.userId} joined room ${conversationId}`);
        }
      });

      // ========================================
      // SEND_MESSAGE Event
      // ========================================
      socket.on("send_message", async (data) => {
        try {
          if (!data.conversationId || !data.sender || !data.text) {
            console.log("❌ send_message missing data");
            return;
          }

          // ✅ Save message to database
          const msg = await Message.create({
            conversationId: data.conversationId,
            sender: data.sender,
            text: data.text,
          });

          // ✅ Emit to all users in room
          io.to(data.conversationId).emit("receive_message", msg);

          // ✅ Send notification to receiver
          if (data.receiver) {
            const senderUser = await User.findById(data.sender).select("fullName");
            // You can implement sendNotification function here
            console.log(`📬 Message notification sent to ${data.receiver}`);
          }
        } catch (err) {
          console.error("❌ Error saving message:", err);
        }
      });

      // ========================================
      // DISCONNECT Event
      // ========================================
      socket.on("disconnect", () => {
        console.log(`🔌 Socket disconnected: ${socket.userId}`);
      });
    });

    // ========================================
    // START SERVER
    // ========================================
    const PORT = process.env.PORT || 5000;
     server.listen(PORT, "0.0.0.0", () => {
      console.log(`\n${"=".repeat(50)}`);
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`${"=".repeat(50)}`);
      console.log(`📍 Local:     http://localhost:${PORT}`);
      console.log(`🌐 Frontend:  ${process.env.FRONTEND_URL}`);
      console.log(`🔗 Client:    ${process.env.CLIENT_URL}`);
      console.log(`🔐 JWT:       ${process.env.JWT_SECRET ? "✅" : "❌"}`);
      console.log(`📊 CORS:      ${ALLOWED_ORIGINS.length} origins allowed`);
      console.log(`${"=".repeat(50)}\n`);
    });


  })
  .catch(err => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// ========================================
// Error Handling
// ========================================
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
});