// utils/checkSchedule.js

/**
 * Kiểm tra trạng thái của schedule
 * @param {Object} schedule - Document từ MongoDB
 * @returns {string} - "OPEN" | "NOT_OPEN" | "CLOSED"
 */
function checkSchedule(schedule) {
  // Nếu không có schedule hoặc chưa bật, mặc định là OPEN
  if (!schedule) {
    return "OPEN";
  }

  const now = new Date();

  // Nếu openAt tồn tại và hiện tại < openAt → chưa mở
  if (schedule.openAt && now < new Date(schedule.openAt)) {
    return "NOT_OPEN";
  }

  // Nếu closeAt tồn tại và hiện tại > closeAt → đã đóng
  if (schedule.closeAt && now > new Date(schedule.closeAt)) {
    return "CLOSED";
  }

  // Nếu không rơi vào 2 trường hợp trên → đang mở
  return "OPEN";
}

module.exports = checkSchedule;