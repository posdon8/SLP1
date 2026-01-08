const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  totalPrice: { type: Number, required: true },
  paymentMethod: { type: String, enum: ["VNPAY", "COD"], default: "COD" },
  status: { 
    type: String, 
    enum: ["Pending", "Paid", "Processing", "Shipped", "Completed", "Cancelled"], 
    default: "Pending" 
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Order", orderSchema);
