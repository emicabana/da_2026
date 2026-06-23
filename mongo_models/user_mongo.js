import mongoose from "mongoose";

export default mongoose.model("User", new mongoose.Schema({
    user_name: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    display_name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: { type: String, enum: ['admin', 'user'], default: 'user' }
}));