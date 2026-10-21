import mongoose from "mongoose";

export default mongoose.model("Studio", new mongoose.Schema({
    owner_username: { type: String, required: true, unique: true },
    description: { type: String, default: "", maxlength: 500 },
    location: { type: String, default: "", maxlength: 120 },
    website: { type: String, default: "", maxlength: 200 },
    instagram: { type: String, default: "", maxlength: 60 },
}, { timestamps: true }));
