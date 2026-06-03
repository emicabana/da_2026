import mongoose from "mongoose";

export default mongoose.model("sessions", new mongoose.Schema({
    username: { type: String, required: true },
    authorizationToken: { type: String, required: true },
    open: { type: String },
    closed: { type: String },
    role: { type: String },
}));

