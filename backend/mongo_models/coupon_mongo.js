import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
    code: { type: String, required: true, uppercase: true, trim: true, maxlength: 30 },
    discount_type: { type: String, enum: ["percentage", "fixed"], required: true },
    value: { type: Number, required: true, min: 0 },
    max_discount_amount: { type: Number, min: 0, default: null },
    description: { type: String, default: "", maxlength: 250 },
    album_id: { type: mongoose.Schema.Types.ObjectId, ref: "Album", default: null },
    expires_at: { type: Date, default: null },
    max_uses: { type: Number, min: 1, default: null },
    used_count: { type: Number, min: 0, default: 0 },
    active: { type: Boolean, default: true },
    owner_username: { type: String, required: true, index: true },
}, { timestamps: true });

couponSchema.index({ owner_username: 1, code: 1 }, { unique: true });

export default mongoose.model("Coupon", couponSchema);
