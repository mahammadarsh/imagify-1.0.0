import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
  planId: { type: String, required: true },
  amount: { type: Number },
  status: { type: String, default: "CREATED" },
  createdAt: { type: Date, default: Date.now },
});

const orderModel =
  mongoose.models.Order || mongoose.model("Order", orderSchema);
export default orderModel;
