// backend/utils/commission.js

/**
 * ✅ Calculate teacher earnings & platform fee
 * @param {number} price - FINAL PRICE (giá student trả, sau discount)
 * @param {string} teacherLevel - bronze, silver, gold, platinum
 * @returns { coursePrice, teacherEarns, platformFee, teacherPercentage }
 */
function calculateEarnings(price, teacherLevel) {
  // ✅ Commission rates based on teacher level
  // Teacher starts with LOW commission, increases as level goes up
  const rates = {
    bronze: {
      teacher: 0.25,    // 25% cho teacher
      platform: 0.75    // 75% cho platform
    },
    silver: {
      teacher: 0.30,    // 30% cho teacher
      platform: 0.70
    },
    gold: {
      teacher: 0.35,    // 35% cho teacher
      platform: 0.65
    },
    platinum: {
      teacher: 0.40,    // 40% cho teacher
      platform: 0.60
    }
  };

  const rate = rates[teacherLevel?.toLowerCase()] || rates.bronze;

  const teacherEarns = Math.round(price * rate.teacher);
  const platformFee = Math.round(price * rate.platform);

  console.log("📊 Commission calculated:", {
    price,
    teacherLevel,
    teacherPercent: rate.teacher * 100,
    teacherEarns,
    platformFee
  });

  return {
    coursePrice: price,
    teacherEarns,
    platformFee,
    teacherPercentage: rate.teacher * 100,
    total: teacherEarns + platformFee
  };
}

/**
 * ✅ Get level info for UI
 */
function getLevelInfo(level) {
  const levels = {
    bronze: {
      name: "Bronze 🥉",
      icon: "🥉",
      description: "Mới bắt đầu",
      color: "#CD7F32",
      minStudents: 0,
      minRating: 0,
      commission: 60
    },
    silver: {
      name: "Silver 🥈",
      icon: "🥈",
      description: "Đã chứng minh",
      color: "#C0C0C0",
      minStudents: 1000,
      minRating: 4.0,
      commission: 65
    },
    gold: {
      name: "Gold 🏅",
      icon: "🏅",
      description: "Chuyên nghiệp",
      color: "#FFD700",
      minStudents: 5000,
      minRating: 4.5,
      commission: 70
    },
    platinum: {
      name: "Platinum 💎",
      icon: "💎",
      description: "Hàng đầu",
      color: "#E5E4E2",
      minStudents: 20000,
      minRating: 4.8,
      commission: 75
    }
  };

  return levels[level?.toLowerCase()] || levels.bronze;
}

// ✅ Commission rates object (for frontend/backend consistency)
const COMMISSION_RATES = {
  bronze: {
    teacher: 0.25,      // 25%
    platform: 0.75,     // 75%
    color: "#CD7F32"
  },
  silver: {
    teacher: 0.30,      // 30%
    platform: 0.70,     // 70%
    color: "#C0C0C0"
  },
  gold: {
    teacher: 0.35,      // 35%
    platform: 0.65,     // 65%
    color: "#FFD700"
  },
  platinum: {
    teacher: 0.40,      // 40%
    platform: 0.60,     // 60%
    color: "#E5E4E2"
  }
};

module.exports = {
  calculateEarnings,
  getLevelInfo,
  COMMISSION_RATES
};