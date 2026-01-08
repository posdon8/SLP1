// backend/services/notificationService.js
const Notification = require("../models/Notification");
const User = require("../models/User");

class NotificationService {
  // Tạo thông báo học viên tham gia
  static async notifyStudentJoined(courseId, studentId, teacherId, courseName, studentName) {
    try {
      // Thông báo cho giáo viên
      await Notification.create({
        recipient: teacherId,
        sender: studentId,
        type: "student_joined",
        title: "Học viên mới tham gia",
        message: `${studentName} đã tham gia khóa học "${courseName}"`,
        course: courseId,
        link: `/course/${courseId}`
      });

      // Thông báo cho học viên
      await Notification.create({
        recipient: studentId,
        type: "student_joined",
        title: "Tham gia khóa học thành công",
        message: `Bạn đã tham gia khóa học "${courseName}" thành công`,
        course: courseId,
        link: `/course/${courseId}`
      });

      // Emit socket event
      const io = global.io;
      if (io) {
        io.to(`user_${teacherId}`).emit("new_notification", {
          type: "student_joined",
          message: `${studentName} đã tham gia khóa học`
        });
        io.to(`user_${studentId}`).emit("new_notification", {
          type: "student_joined",
          message: "Tham gia khóa học thành công"
        });
      }
    } catch (error) {
      console.error("Error creating join notification:", error);
    }
  }

  // ⭐ Tạo thông báo: Học sinh yêu cầu tham gia (manual mode)
  static async notifyPendingApproval(courseId, studentId, teacherId, courseTitle, studentName) {
    try {
      await Notification.create({
        recipient: teacherId,
        sender: studentId,
        type: "pending_enrollment",
        title: `📋 ${studentName} yêu cầu tham gia khóa học`,
        message: `${studentName} đã gửi yêu cầu tham gia "${courseTitle}". Hãy duyệt yêu cầu này.`,
        course: courseId,
        link: `/course/${courseId}`
      });

      // Emit socket
      const io = global.io;
      if (io) {
        io.to(`user_${teacherId}`).emit("new_notification", {
          type: "pending_enrollment",
          message: `${studentName} yêu cầu tham gia khóa học`
        });
      }

      console.log("✅ Notification sent: Pending approval");
    } catch (error) {
      console.error("Error sending pending approval notification:", error);
    }
  }

  // ⭐ Tạo thông báo: Yêu cầu được duyệt
  static async notifyApprovalAccepted(courseId, studentId, teacherId, courseTitle) {
    try {
      await Notification.create({
        recipient: studentId,
        type: "enrollment_accepted",
        title: "✅ Yêu cầu tham gia được chấp nhận",
        message: `Bạn đã được phép tham gia khóa học "${courseTitle}"!`,
        course: courseId,
        link: `/course/${courseId}`
      });

      // Emit socket
      const io = global.io;
      if (io) {
        io.to(`user_${studentId}`).emit("new_notification", {
          type: "enrollment_accepted",
          message: `Yêu cầu tham gia "${courseTitle}" được chấp nhận`
        });
      }

      console.log("✅ Notification sent: Enrollment accepted");
    } catch (error) {
      console.error("Error sending approval accepted notification:", error);
    }
  }

  // ⭐ Tạo thông báo: Yêu cầu bị từ chối
  static async notifyApprovalRejected(courseId, studentId, teacherId, courseTitle) {
    try {
      await Notification.create({
        recipient: studentId,
        type: "enrollment_rejected",
        title: "❌ Yêu cầu tham gia bị từ chối",
        message: `Yêu cầu tham gia khóa học "${courseTitle}" đã bị từ chối.`,
        course: courseId,
        link: `/course/${courseId}`
      });

      // Emit socket
      const io = global.io;
      if (io) {
        io.to(`user_${studentId}`).emit("new_notification", {
          type: "enrollment_rejected",
          message: `Yêu cầu tham gia "${courseTitle}" bị từ chối`
        });
      }

      console.log("✅ Notification sent: Enrollment rejected");
    } catch (error) {
      console.error("Error sending approval rejected notification:", error);
    }
  }

  // Tạo thông báo bài giảng mới
  static async notifyNewLesson(courseId, lessonTitle, students, courseName, senderId, senderName) {
    try {
      const notifications = students.map(studentId => ({
        recipient: studentId,
        sender: senderId,
        senderName: senderName,
        type: "new_lesson",
        title: "Bài giảng mới",
        message: `Bài giảng "${lessonTitle}" đã được thêm vào khóa "${courseName}"`,
        course: courseId,
        link: `/course/${courseId}`
      }));

      await Notification.insertMany(notifications);

      // Emit socket
      const io = global.io;
      if (io) {
        students.forEach(studentId => {
          io.to(`user_${studentId}`).emit("new_notification", {
            type: "new_lesson",
            message: `Bài giảng mới: ${lessonTitle}`
          });
        });
      }
    } catch (error) {
      console.error("Error creating lesson notification:", error);
    }
  }

  // Tạo thông báo quiz mới
  static async notifyNewQuiz(courseId, quizTitle, students, courseName, senderId, senderName) {
    try {
      const notifications = students.map(studentId => ({
        recipient: studentId,
        sender: senderId,
        senderName: senderName,
        type: "new_quiz",
        title: "Bài quiz mới",
        message: `Quiz "${quizTitle}" đã được thêm vào khóa "${courseName}"`,
        course: courseId,
        link: `/course/${courseId}`
      }));

      await Notification.insertMany(notifications);

      const io = global.io;
      if (io) {
        students.forEach(studentId => {
          io.to(`user_${studentId}`).emit("new_notification", {
            type: "new_quiz",
            message: `Quiz mới: ${quizTitle}`
          });
        });
      }
    } catch (error) {
      console.error("Error creating quiz notification:", error);
    }
  }

  // Tạo thông báo tài liệu mới
  static async notifyNewResource(courseId, resourceName, students, courseName, senderId, senderName) {
    try {
      const notifications = students.map(studentId => ({
        recipient: studentId,
        sender: senderId,
        senderName: senderName,
        type: "new_resource",
        title: "Tài liệu mới",
        message: `Tài liệu "${resourceName}" đã được thêm vào khóa "${courseName}"`,
        course: courseId,
        link: `/course/${courseId}`
      }));

      await Notification.insertMany(notifications);

      const io = global.io;
      if (io) {
        students.forEach(studentId => {
          io.to(`user_${studentId}`).emit("new_notification", {
            type: "new_resource",
            message: `Tài liệu mới: ${resourceName}`
          });
        });
      }
    } catch (error) {
      console.error("Error creating resource notification:", error);
    }
  }

  // Tạo thông báo chung từ giáo viên
  static async notifyAnnouncement(courseId, title, message, students, courseName) {
    try {
      const notifications = students.map(studentId => ({
        recipient: studentId,
        type: "announcement",
        title: `Thông báo: ${courseName}`,
        message: message,
        course: courseId,
        link: `/course/${courseId}`
      }));

      await Notification.insertMany(notifications);

      const io = global.io;
      if (io) {
        students.forEach(studentId => {
          io.to(`user_${studentId}`).emit("new_notification", {
            type: "announcement",
            message: title
          });
        });
      }
    } catch (error) {
      console.error("Error creating announcement:", error);
    }
  }

  // Tạo thông báo tin nhắn mới
  static async notifyNewMessage(senderId, recipientId, senderName, conversationId) {
    try {
      const sender = await User.findById(senderId).select("fullName");
      await Notification.create({
        recipient: recipientId,
        sender: senderId,
        senderName: sender?.fullName,
        type: "new_message",
        title: "Tin nhắn mới",
        message: `${sender?.fullName || "Người dùng"} đã gửi tin nhắn cho bạn`,
        relatedId: conversationId,
        link: `/messages/${conversationId}`
      });

      const io = global.io;
      if (io) {
        io.to(`user_${recipientId}`).emit("new_notification", {
          type: "new_message",
          message: `Tin nhắn mới từ ${sender?.fullName || "Người dùng"}`
        });
      }
    } catch (error) {
      console.error("Error creating message notification:", error);
    }
  }
   static async notifyScheduleSet(courseId, ownerType, ownerTitle, students, teacherName, openAt, closeAt) {
    try {
      const openDate = new Date(openAt).toLocaleString("vi-VN");
      const closeDate = closeAt ? new Date(closeAt).toLocaleString("vi-VN") : "Không giới hạn";

      const notifications = students.map(studentId => ({
        recipient: studentId,
        type: "schedule_set",
        title: `📅 Lịch ${ownerType === "quiz" ? "quiz" : "khóa học"} được cập nhật`,
        message: `${ownerTitle} sẽ mở lúc ${openDate}${closeAt ? ` và đóng lúc ${closeDate}` : ""}`,
        course: courseId,
        link: `/course/${courseId}`,
        metadata: {
          ownerType,
          ownerTitle,
          openAt,
          closeAt
        }
      }));

      await Notification.insertMany(notifications);

      // Emit socket
      const io = global.io;
      if (io) {
        students.forEach(studentId => {
          io.to(`user_${studentId}`).emit("new_notification", {
            type: "schedule_set",
            message: `Lịch ${ownerTitle} được cập nhật - Mở: ${openDate}`
          });
        });
      }

      console.log("✅ Schedule notification sent");
    } catch (error) {
      console.error("Error creating schedule notification:", error);
    }
  }

  // Tạo thông báo: Sắp mở
  static async notifyScheduleOpening(courseId, ownerType, ownerTitle, students, openAt, minutesLeft) {
    try {
      const notifications = students.map(studentId => ({
        recipient: studentId,
        type: "schedule_opening_soon",
        title: `⏳ ${ownerTitle} sắp mở`,
        message: `${ownerTitle} sắp mở trong ${minutesLeft} phút lúc ${new Date(openAt).toLocaleTimeString("vi-VN")}`,
        course: courseId,
        link: `/course/${courseId}`,
        metadata: {
          ownerType,
          ownerTitle,
          openAt
        }
      }));

      await Notification.insertMany(notifications);

      const io = global.io;
      if (io) {
        students.forEach(studentId => {
          io.to(`user_${studentId}`).emit("new_notification", {
            type: "schedule_opening_soon",
            message: `${ownerTitle} sắp mở trong ${minutesLeft} phút`
          });
        });
      }

      console.log("✅ Opening soon notification sent");
    } catch (error) {
      console.error("Error creating opening notification:", error);
    }
  }

  // Tạo thông báo: Đang mở ngay bây giờ
  static async notifyScheduleNowOpen(courseId, ownerType, ownerTitle, students) {
    try {
      const notifications = students.map(studentId => ({
        recipient: studentId,
        type: "schedule_now_open",
        title: `🟢 ${ownerTitle} đang mở!`,
        message: `${ownerTitle} đang mở - Làm bài ngay!`,
        course: courseId,
        link: `/course/${courseId}`,
        metadata: {
          ownerType,
          ownerTitle
        }
      }));

      await Notification.insertMany(notifications);

      const io = global.io;
      if (io) {
        students.forEach(studentId => {
          io.to(`user_${studentId}`).emit("new_notification", {
            type: "schedule_now_open",
            message: `${ownerTitle} đang mở - Làm bài ngay!`
          });
        });
      }

      console.log("✅ Now open notification sent");
    } catch (error) {
      console.error("Error creating now open notification:", error);
    }
  }

  // Tạo thông báo: Sắp hết hạn
  static async notifyScheduleClosingSoon(courseId, ownerType, ownerTitle, students, closeAt, minutesLeft) {
    try {
      const notifications = students.map(studentId => ({
        recipient: studentId,
        type: "schedule_closing_soon",
        title: `🔴 ${ownerTitle} sắp hết hạn!`,
        message: `${ownerTitle} sắp hết hạn trong ${minutesLeft} phút lúc ${new Date(closeAt).toLocaleTimeString("vi-VN")}`,
        course: courseId,
        link: `/course/${courseId}`,
        metadata: {
          ownerType,
          ownerTitle,
          closeAt
        }
      }));

      await Notification.insertMany(notifications);

      const io = global.io;
      if (io) {
        students.forEach(studentId => {
          io.to(`user_${studentId}`).emit("new_notification", {
            type: "schedule_closing_soon",
            message: `${ownerTitle} sắp hết hạn trong ${minutesLeft} phút!`
          });
        });
      }

      console.log("✅ Closing soon notification sent");
    } catch (error) {
      console.error("Error creating closing notification:", error);
    }
  }

  // Tạo thông báo: Đã hết hạn
  static async notifyScheduleClosed(courseId, ownerType, ownerTitle, students) {
    try {
      const notifications = students.map(studentId => ({
        recipient: studentId,
        type: "schedule_closed",
        title: `❌ ${ownerTitle} đã đóng`,
        message: `${ownerTitle} đã hết hạn - không thể nộp bài nữa`,
        course: courseId,
        link: `/course/${courseId}`,
        metadata: {
          ownerType,
          ownerTitle
        }
      }));

      await Notification.insertMany(notifications);

      const io = global.io;
      if (io) {
        students.forEach(studentId => {
          io.to(`user_${studentId}`).emit("new_notification", {
            type: "schedule_closed",
            message: `${ownerTitle} đã đóng - hết hạn nộp bài`
          });
        });
      }

      console.log("✅ Closed notification sent");
    } catch (error) {
      console.error("Error creating closed notification:", error);
    }
  }
}

module.exports = NotificationService;