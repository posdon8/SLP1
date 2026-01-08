/**
 * ✅ Calculate discount from coupon + student tier
 * @param {number} originalPrice - Giá gốc
 * @param {object} coupon - Coupon object { code, discountType, discountValue }
 * @param {string} studentTier - Student tier level (bronze, silver, gold, platinum)
 */
export function calculateDiscount(originalPrice, coupon, studentTier) {
  let couponDiscount = 0;
  let tierDiscount = 0;
  let tierPercent = 0;

  // ✅ Tính discount từ coupon/voucher
  if (coupon) {
    if (coupon.discountType === 'percentage') {
      couponDiscount = Math.round(originalPrice * (coupon.discountValue / 100));
    } else if (coupon.discountType === 'fixed') {
      couponDiscount = coupon.discountValue;
    }
  }

  // ✅ Tính discount từ tier (tính trên originalPrice, không phải sau coupon)
  if (studentTier) {
    tierPercent = studentTier.discountPercentage || 0;
    tierDiscount = Math.round(originalPrice * (tierPercent / 100));
  }

  const totalDiscount = couponDiscount + tierDiscount;
  const finalPrice = Math.max(0, originalPrice - totalDiscount);

  console.log("📊 Discount Calculation:", {
    originalPrice,
    coupon: coupon?.code,
    couponDiscount,
    studentTier,
    tierPercent,
    tierDiscount,
    totalDiscount,
    finalPrice
  });

  return {
    originalPrice,
    couponDiscount,
    tierDiscount,
    tierPercent,      // ✅ % discount từ tier
    totalDiscount,
    finalPrice,
    savingPercent: totalDiscount > 0 
      ? Math.round((totalDiscount / originalPrice) * 100)
      : 0
  };
}

/**
 * ✅ Get tier discount percentage
 * @param {string} tier - 'bronze', 'silver', 'gold', 'platinum'
 */
function getTierDiscount(tier) {
  const tiers = {
    'bronze': 0,
    'silver': 5,
    'gold': 10,
    'platinum': 15
  };
  return tiers[tier] || 0;
}

/**
 * ✅ Get tier info
 */
export function getTierInfo(tier) {
  const info = {
    bronze: { name: "Bronze 🥉", color: "#CD7F32", next: 5 },
    silver: { name: "Silver 🥈", color: "#C0C0C0", next: 15 },
    gold: { name: "Gold 🏅", color: "#FFD700", next: 30 },
    platinum: { name: "Platinum 💎", color: "#E5E4E2", next: null }
  };
  return info[tier] || info.bronze;
}

/**
 * ✅ Format currency VND
 */
export function formatCurrencyVND(amount) {
  return (amount || 0).toLocaleString("vi-VN") + "đ";
}