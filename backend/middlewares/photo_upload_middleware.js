import multer from "multer";
import { randomUUID } from "node:crypto";
import { uploadsDirectory } from "../services/photo_storage.js";

const imageTypes = new Map([
    ["image/jpeg", ".jpg"],
    ["image/png", ".png"],
    ["image/webp", ".webp"],
    ["image/gif", ".gif"],
]);

const storage = multer.diskStorage({
    destination: uploadsDirectory,
    filename(req, file, callback) {
        callback(null, `${randomUUID()}${imageTypes.get(file.mimetype)}`);
    },
});

export default multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 1,
    },
    fileFilter(req, file, callback) {
        if (!imageTypes.has(file.mimetype)) {
            callback(Object.assign(new Error("El archivo debe ser una imagen JPG, PNG, WEBP o GIF."), { status: 400 }));
            return;
        }
        callback(null, true);
    },
});
