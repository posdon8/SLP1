/**
 * Get tier discount percentage
 */
function getTierDiscountPercent(tier) {
  const tiers = {
    bronze: 0,
    silver: 5,
    gold: 10,
    platinum: 15,
  };
  return tiers[tier] || 0;
}

/**
 * ✅ Calculate discount based on student tier
 * @param {number} originalPrice
 * @param {string} tier - bronze | silver | gold | platinum
 */
function calculateDiscount(originalPrice, tier = "bronze") {
  const tierPercent = getTierDiscountPercent(tier);
  const tierDiscount = Math.round((originalPrice * tierPercent) / 100);
  const finalPrice = Math.max(0, originalPrice - tierDiscount);

  return {
    originalPrice,
    tier,
    tierPercent,
    tierDiscount,
    finalPrice,
  };
}

module.exports = {
  calculateDiscount,
};
