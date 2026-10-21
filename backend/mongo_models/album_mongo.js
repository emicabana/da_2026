import mongoose from "mongoose";

export default mongoose.model("Album", new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 100 },
    date: { type: Date, required: true },
    description: { type: String, default: "", maxlength: 1000 },
    cover_url: { type: String, required: true },
    photo_price: { type: Number, required: true, min: 0 },
    video_price: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true, maxlength: 50 },
    is_private: { type: Boolean, default: false },
    photo_discount_percent: { type: Number, default: 0, min: 0, max: 100 },
    photo_discount_min_quantity: { type: Number, default: 1, min: 1 },
    photo_package_quantity: { type: Number, default: 0, min: 0 },
    photo_package_price: { type: Number, default: 0, min: 0 },
    video_discount_percent: { type: Number, default: 0, min: 0, max: 100 },
    video_discount_min_quantity: { type: Number, default: 1, min: 1 },
    video_package_quantity: { type: Number, default: 0, min: 0 },
    video_package_price: { type: Number, default: 0, min: 0 },
    quantity_discounts: [{
        name: { type: String, required: true, trim: true, maxlength: 50 },
        description: { type: String, default: "", maxlength: 250 },
        content_type: { type: String, enum: ["photos", "videos"], required: true },
        active: { type: Boolean, default: true },
        tiers: [{
            min_quantity: { type: Number, required: true, min: 1 },
            discount_percent: { type: Number, required: true, min: 0.01, max: 100 },
        }],
    }],
    owner_username: { type: String, required: true, index: true },
}, { timestamps: true }));
