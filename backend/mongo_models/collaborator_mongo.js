import mongoose from "mongoose";

const collaboratorSchema = new mongoose.Schema({
    owner_username: { type: String, required: true, index: true },
    collaborator_username: { type: String, required: true },
    invite_email: { type: String, required: true, lowercase: true, trim: true },
    permission_level: { type: String, enum: ["event", "full"], required: true, default: "event" },
    status: { type: String, enum: ["pending", "accepted", "declined"], default: "pending" },
    album_id: { type: mongoose.Schema.Types.ObjectId, ref: "Album", default: null },
}, { timestamps: true });

collaboratorSchema.index(
    { owner_username: 1, collaborator_username: 1, album_id: 1 },
    { unique: true }
);

export default mongoose.model("Collaborator", collaboratorSchema);
