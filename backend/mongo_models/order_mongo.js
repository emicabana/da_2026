import mongoose from "mongoose";

export default mongoose.model("Order", new mongoose.Schema({
    username: { type: String, required: true },
    photos: [{ type: mongoose.Schema.Types.ObjectId, ref: "Photo", required: true }],
    total: { type: Number, required: true },
    discount_total: { type: Number, default: 0 },
    coupon_code: { type: String, default: null },
    status: { type: String, enum: ["pending", "paid", "delivered"], default: "pending" },
    created_at: { type: Date, default: Date.now }
}));