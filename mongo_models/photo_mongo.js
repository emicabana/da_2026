import mongoose from "mongoose";

export default mongoose.model("Photo", new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    url: { type: String, required: true },
    type: { type: String, enum: ["photo", "video"], default: "photo" },
    price: { type: Number, required: true },
    available: { type: Boolean, default: true }
}));