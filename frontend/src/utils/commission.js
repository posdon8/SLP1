// src/utils/commission.js
// ⭐ Tính commission dựa trên level của teacher

const COMMISSION_RATES = {
  bronze: {
    platformFee: 0.75,      // Platform cắt 75%
    teacherEarns: 0.25,     // Teacher nhận 25%
    color: "#CD7F32"
  },
  silver: {
    platformFee: 0.70,      // Platform cắt 70%
    teacherEarns: 0.30,     // Teacher nhận 30%
    color: "#C0C0C0"
  },
  gold: {
    platformFee: 0.65,      // Platform cắt 65%
    teacherEarns: 0.35,     // Teacher nhận 35%
    color: "#FFD700"
  },
  platinum: {
    platformFee: 0.60,      // Platform cắt 60%
    teacherEarns: 0.40,     // Teacher nhận 40%
    color: "#E5E4E2"
  }
};

// ✅ Tính commission khi student mua khóa học
function calculateEarnings(coursePrice, teacherLevel) {
  const rates = COMMISSION_RATES[teacherLevel] || COMMISSION_RATES.bronze;
  
  return {
    coursePrice: coursePrice,
    platformFee: parseFloat((coursePrice * rates.platformFee).toFixed(2)),
    teacherEarns: parseFloat((coursePrice * rates.teacherEarns).toFixed(2)),
    teacherPercentage: (rates.teacherEarns * 100),
    level: teacherLevel
  };
}

// ✅ Lấy thông tin level
function getLevelInfo(level) {
  const info = {
    bronze: {
      name: "Bronze",
      icon: "🥉",
      minStudents: 0,
      minRating: 0,
      description: "Bắt đầu với nền tảng"
    },
    silver: {
      name: "Silver",
      icon: "🥈",
      minStudents: 1000,
      minRating: 4.0,
      description: "Giáo viên được công nhận"
    },
    gold: {
      name: "Gold",
      icon: "🏅",
      minStudents: 5000,
      minRating: 4.5,
      description: "Giáo viên hàng đầu"
    },
    platinum: {
      name: "Platinum",
      icon: "💎",
      minStudents: 20000,
      minRating: 4.8,
      description: "Giáo viên hạng A"
    }
  };
  
  return info[level] || info.bronze;
}

// ✅ Tính earnings cho một khóa học
function calculateCourseEarnings(coursePrice, teacherLevel) {
  const result = calculateEarnings(coursePrice, teacherLevel);
  return result;
}

// ✅ Tính tổng earnings từ nhiều khoá học
function calculateTotalEarnings(coursesList, teacherLevel) {
  let totalEarnings = 0;
  let totalRevenue = 0;
  
  coursesList.forEach(course => {
    const earnings = calculateEarnings(course.price, teacherLevel);
    totalEarnings += earnings.teacherEarns * (course.paidStudents?.length || 0);
    totalRevenue += course.price * (course.paidStudents?.length || 0);
  });
  
  return {
    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
    totalEarnings: parseFloat(totalEarnings.toFixed(2)),
    platformFee: parseFloat((totalRevenue - totalEarnings).toFixed(2)),
    earnPercentage: COMMISSION_RATES[teacherLevel]?.teacherEarns * 100
  };
}

module.exports = {
  COMMISSION_RATES,
  calculateEarnings,
  getLevelInfo,
  calculateCourseEarnings,
  calculateTotalEarnings
};