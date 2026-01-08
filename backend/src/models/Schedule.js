const mongoose = require("mongoose");

const scheduleSchema = new mongoose.Schema(
  {
    ownerType: {
      type: String,
      enum: ["course", "quiz", "code"],
      required: true
    },

    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "ownerType"
    },

    openAt: {
      type: Date,
      default: null // null = luôn mở
    },

    closeAt: {
      type: Date,
      default: null
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Schedule", scheduleSchema);
