import mongoose from "mongoose";

const photoSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    url: { type: String, required: true },
    original_file_path: { type: String, default: null, select: false },
    owner_username: { type: String, index: true },
    album_id: { type: mongoose.Schema.Types.ObjectId, ref: "Album", index: true },
    type: { type: String, enum: ["photo", "video"], default: "photo" },
    price: { type: Number, required: true },
    watermarked: { type: Boolean, default: true },
    preview_protected: { type: Boolean, default: false },
    available: { type: Boolean, default: true }
});

for (const method of ["toJSON", "toObject"]) {
    photoSchema.set(method, {
        transform(document, result) {
            delete result.original_file_path;
            if (result.type === "photo" && !result.preview_protected)
                delete result.url;
            return result;
        },
    });
}

export default mongoose.model("Photo", photoSchema);
