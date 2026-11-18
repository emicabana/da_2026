import { copyFile, readFile, unlink } from "node:fs/promises";
import { extname, join } from "node:path";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import AlbumMongo from "../mongo_models/album_mongo.js";
import PhotoMongo from "../mongo_models/photo_mongo.js";
import config from "../config.js";
import {
    albumCoversDirectory,
    removeOriginalPhoto,
    removeStoredPhoto,
    savePhotoImage,
    uploadsDirectory,
} from "../services/photo_storage.js";

const applyChanges = process.argv.includes("--apply");
const legacyUploadPattern = /^\/uploads\/([a-f0-9-]{36}\.(?:jpg|jpeg|png|webp|gif))$/i;
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

function getLegacyFilename(url) {
    return typeof url === "string" ? legacyUploadPattern.exec(url)?.[1] : null;
}

async function migratePhoto(photo) {
    if (photo.original_file_path && photo.preview_protected) return "already-migrated";
    const filename = getLegacyFilename(photo.url);
    if (!filename) {
        console.warn(`Photo ${photo._id}: no es un archivo local migrable; se desactivará para evitar exponer un original.`);
        if (applyChanges) {
            photo.available = false;
            await photo.save();
        }
        return "needs-reupload";
    }

    const legacyPath = join(uploadsDirectory, filename);
    const buffer = await readFile(legacyPath);
    if (!applyChanges) return "ready";

    const media = await savePhotoImage({ buffer, originalname: filename });
    photo.url = media.url;
    photo.original_file_path = media.original_file_path;
    photo.type = "photo";
    photo.preview_protected = true;
    photo.watermarked = true;
    try {
        await photo.save();
    } catch (error) {
        const cleanupResults = await Promise.allSettled([
            removeStoredPhoto(media.url),
            removeOriginalPhoto(media.original_file_path),
        ]);
        for (const result of cleanupResults) {
            if (result.status === "rejected")
                console.error("No se pudo limpiar un archivo de una foto no migrada:", result.reason);
        }
        throw error;
    }

    await unlink(legacyPath);
    return "migrated";
}

async function migrateAlbumCover(album) {
    const filename = getLegacyFilename(album.cover_url);
    if (!filename) return "not-local";
    const sourcePath = join(uploadsDirectory, filename);
    await readFile(sourcePath);
    const extension = extname(filename).toLowerCase();
    if (!imageExtensions.has(extension))
        throw new Error(`La portada del álbum ${album._id} tiene una extensión no permitida.`);
    const destinationName = `${randomUUID()}${extension === ".jpeg" ? ".jpg" : extension}`;
    const destinationPath = join(albumCoversDirectory, destinationName);
    if (!applyChanges) return "ready";

    await copyFile(sourcePath, destinationPath);
    album.cover_url = `/uploads/covers/${destinationName}`;
    try {
        await album.save();
    } catch (error) {
        await unlink(destinationPath).catch((cleanupError) => {
            console.error("No se pudo limpiar una portada no migrada:", cleanupError);
        });
        throw error;
    }
    return "migrated";
}

async function run() {
    console.log(applyChanges
        ? "APPLY: migrando fotos y portadas; ejecutar con el servidor detenido."
        : "DRY RUN: no se modifican archivos ni registros. Usá --apply para ejecutar la migración.");
    await mongoose.connect(config.dbConnection);

    const counts = {
        migrated: 0,
        ready: 0,
        "already-migrated": 0,
        "needs-reupload": 0,
        "not-local": 0,
    };
    const albums = await AlbumMongo.find({});
    for (const album of albums) {
        const result = await migrateAlbumCover(album);
        counts[result] = (counts[result] || 0) + 1;
    }

    const photos = await PhotoMongo.find({
        $or: [{ type: "photo" }, { type: { $exists: false } }],
    }).select("+original_file_path");
    for (const photo of photos) {
        const result = await migratePhoto(photo);
        counts[result] = (counts[result] || 0) + 1;
    }
    console.log("Resultado:", counts);
    if (counts["needs-reupload"])
        console.warn("Las fotos externas/no locales quedaron desactivadas; deben volver a subirse como archivos.");
}

try {
    await run();
} catch (error) {
    console.error("Falló la migración de medios:", error);
    process.exitCode = 1;
} finally {
    await mongoose.disconnect();
}
