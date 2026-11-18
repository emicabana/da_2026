import mongoose from "mongoose";

const paymentInfoSchema = new mongoose.Schema({
    alias: { type: String, default: "", trim: true, maxlength: 100 },
    cbu: { type: String, default: "", trim: true, maxlength: 40 },
    bankName: { type: String, default: "", trim: true, maxlength: 100 },
    accountHolder: { type: String, default: "", trim: true, maxlength: 120 },
    notes: { type: String, default: "", trim: true, maxlength: 500 },
}, { _id: false });

export default mongoose.model("Studio", new mongoose.Schema({
    owner_username: { type: String, required: true, unique: true },
    description: { type: String, default: "", maxlength: 500 },
    location: { type: String, default: "", maxlength: 120 },
    website: { type: String, default: "", maxlength: 200 },
    instagram: { type: String, default: "", maxlength: 60 },
    whatsapp: { type: String, default: "", trim: true, maxlength: 16 },
    paymentInfo: { type: paymentInfoSchema, default: () => ({}) },
}, { timestamps: true }));
