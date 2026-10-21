import mongoose from "mongoose";

export default mongoose.model("Photo", new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    url: { type: String, required: true },
    owner_username: { type: String, index: true },
    album_id: { type: mongoose.Schema.Types.ObjectId, ref: "Album", index: true },
    type: { type: String, enum: ["photo", "video"], default: "photo" },
    price: { type: Number, required: true },
    available: { type: Boolean, default: true }
}));