const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema({
  name: String,
  url: String,
  type: String
});

const lessonSchema = new mongoose.Schema({
  title: { type: String, required: true},
  type: {
    type: String,
    enum: ["video", "file", "quiz"],
    required: true,
    default: "video"
  },
  
  // Cho lesson type = "video"
  videoUrl: String,
  
  // Cho lesson type = "file"
  fileUrl: String,
  fileName: String,
  fileType: String, // pdf, docx, xlsx, etc.
  
  // Cho lesson type = "quiz"
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Quiz"
  },
  
  duration: { type: Number, required: true},
});

const sectionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  lessons: [lessonSchema]
});

const pendingStudentSchema = new mongoose.Schema({
  studentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User",
    required: true
  },
  studentName: String,
  studentEmail: String,
  requestedAt: { 
    type: Date, 
    default: Date.now 
  },
  status: { 
    type: String, 
    enum: ["pending", "approved", "rejected"], 
    default: "pending" 
  }
});

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true},
  accessType: {
  type: String,
  enum: ["public", "private"],
  default: "public"
},
  teacher: { // 👈 ai là người tạo
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  approvalStatus: {
  type: String,
  enum: ["pending", "approved", "rejected"],
  default: "pending"
},
adminReview: {
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  reviewedAt: Date,
  note: String // lý do reject hoặc ghi chú
},
  categories: [{
  type: mongoose.Schema.Types.ObjectId,
  ref: "Category",
  required: true
}],
  description: String,
  thumbnail: String,
  level: String,
  enrollmentCode: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
    default: () => Math.random().toString(36).substr(2, 6).toUpperCase()
  },
  
  // ⭐ Chế độ enrollment
  enrollmentMode: {
    type: String,
    enum: ["auto", "manual"],
    default: "auto"
    // auto: student join ngay
    // manual: chờ teacher duyệt
  },
  
  // ⭐ Vô hiệu hóa code
  codeDisabled: {
    type: Boolean,
    default: false
  },
  
  // ⭐ Danh sách học viên chờ duyệt (chỉ dùng khi manual)
  pendingStudents: [pendingStudentSchema],
   students: [ // tất cả học viên tham gia khóa học (free + paid)
    { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  ],
  paidStudents: [ // chỉ những học viên đã thanh toán (khóa paid)
    { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  ],
  totalStudents: Number,
  sections: [sectionSchema],
   reviews: [
    {
      userId: {  // ⭐ Thêm userId
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
      },
      user: String,  // Giữ lại tên để hiển thị
      stars: Number,
      comment: String,
      createdAt: {  // ⭐ Thêm thời gian
        type: Date,
        default: Date.now
      }
    }
  ],
  totalDuration: { type: Number, required: true, default: 0},
  isHidden: {
    type: Boolean,
    default: false
  },
  rating: { type: Number, default: 0 },
  resources: [resourceSchema],
  isFree: { type: Boolean, default: true },
  price: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now },
  questions: [
  { type: mongoose.Schema.Types.ObjectId, ref: "QuestionBank" }
],

});

courseSchema.pre("save", function (next) {
  // --- Tính tổng thời lượng ---
  if (this.sections && this.sections.length > 0) {
    this.totalDuration = this.sections.reduce((total, sec) => {
      const secDuration = sec.lessons
        ? sec.lessons.reduce((sum, l) => sum + (l.duration || 0), 0)
        : 0;
      return total + secDuration;
    }, 0);
  } else {
    this.totalDuration = 0;
  }

  // --- Tính trung bình rating ---
  if (this.reviews && this.reviews.length > 0) {
    const sum = this.reviews.reduce((acc, r) => acc + (r.stars || 0), 0);
    this.rating = parseFloat((sum / this.reviews.length).toFixed(1));
  } else {
    this.rating = 0;
  }
  this.totalStudents = (this.students || []).length;
  next();
});


module.exports = mongoose.model("Course", courseSchema);
