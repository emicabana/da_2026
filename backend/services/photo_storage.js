import { mkdir, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import sharp from "sharp";

const backendDirectory = dirname(dirname(fileURLToPath(import.meta.url)));
export const uploadsDirectory = join(backendDirectory, "uploads");
export const publicPreviewsDirectory = join(uploadsDirectory, "previews");
export const albumCoversDirectory = join(uploadsDirectory, "covers");
export const privateOriginalsDirectory = join(backendDirectory, "private_uploads", "originals");
const maxImageSize = 10 * 1024 * 1024;
const maxImagePixels = 30_000_000;

const formatExtensions = {
    jpeg: "jpg",
    png: "png",
    webp: "webp",
    gif: "gif",
};

await Promise.all([
    mkdir(publicPreviewsDirectory, { recursive: true }),
    mkdir(albumCoversDirectory, { recursive: true }),
    mkdir(privateOriginalsDirectory, { recursive: true }),
]);

function watermarkSvg(width, height) {
    const fontSize = Math.max(24, Math.min(64, Math.round(Math.min(width, height) / 8)));
    const tileWidth = Math.max(180, fontSize * 4);
    const tileHeight = Math.max(100, fontSize * 2);
    return Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
        `<defs><pattern id="watermark" width="${tileWidth}" height="${tileHeight}" patternUnits="userSpaceOnUse" patternTransform="rotate(-28)">` +
        `<text x="0" y="${fontSize}" fill="#fff" fill-opacity=".35" stroke="#111" stroke-opacity=".22" stroke-width="1" font-family="Arial,sans-serif" font-size="${fontSize}" font-weight="700">REVELA</text>` +
        `</pattern></defs><rect width="100%" height="100%" fill="url(#watermark)"/>` +
        `<text x="50%" y="52%" text-anchor="middle" fill="#fff" fill-opacity=".55" stroke="#111" stroke-opacity=".3" stroke-width="2" font-family="Arial,sans-serif" font-size="${fontSize * 1.5}" font-weight="700">REVELA</text>` +
        `</svg>`
    );
}

function getPrivateOriginalPath(filePath) {
    if (typeof filePath !== "string" || !/^[a-f0-9-]{36}\.(?:jpg|png|webp|gif)$/i.test(filePath))
        throw Object.assign(new Error("La ruta del original no es válida."), { status: 400 });
    return join(privateOriginalsDirectory, filePath);
}

export async function savePhotoImage(file) {
    if (!file?.buffer?.length)
        throw Object.assign(new Error("Seleccioná una imagen para publicar."), { status: 400 });
    if (file.buffer.length > maxImageSize)
        throw Object.assign(new Error("La imagen no puede superar los 10 MB."), { status: 413 });

    let metadata;
    let oriented;
    try {
        metadata = await sharp(file.buffer, { limitInputPixels: maxImagePixels }).metadata();
        if (!formatExtensions[metadata.format])
            throw Object.assign(new Error("El archivo debe ser JPG, PNG, WEBP o GIF."), { status: 400 });
        oriented = await sharp(file.buffer, { limitInputPixels: maxImagePixels })
            .rotate()
            .toBuffer({ resolveWithObject: true });
    } catch (error) {
        if (error.status) throw error;
        throw Object.assign(new Error("No se pudo procesar la imagen. Verificá que el archivo sea válido."), { status: 400 });
    }
    if (!oriented.info.width || !oriented.info.height)
        throw Object.assign(new Error("La imagen no tiene dimensiones válidas."), { status: 400 });

    const originalFilePath = `${randomUUID()}.${formatExtensions[metadata.format]}`;
    const previewName = `${randomUUID()}.webp`;
    const originalPath = getPrivateOriginalPath(originalFilePath);
    const previewPath = join(publicPreviewsDirectory, previewName);
    let originalSaved = false;
    let previewSaved = false;
    try {
        const preview = await sharp(oriented.data, { limitInputPixels: maxImagePixels })
            .composite([{
                input: watermarkSvg(oriented.info.width, oriented.info.height),
                blend: "over",
            }])
            .webp({ quality: 84 })
            .toBuffer();
        await writeFile(originalPath, file.buffer, { flag: "wx" });
        originalSaved = true;
        await writeFile(previewPath, preview, { flag: "wx" });
        previewSaved = true;
        return {
            url: `/uploads/previews/${previewName}`,
            original_file_path: originalFilePath,
        };
    } catch (error) {
        const cleanupResults = await Promise.allSettled([
            originalSaved ? unlink(originalPath) : Promise.resolve(),
            previewSaved ? unlink(previewPath) : Promise.resolve(),
        ]);
        for (const result of cleanupResults) {
            if (result.status === "rejected")
                console.error("No se pudo limpiar un archivo de imagen incompleto:", result.reason);
        }
        throw error;
    }
}

export function getOriginalPhotoPath(filePath) {
    return getPrivateOriginalPath(filePath);
}

export async function removeOriginalPhoto(filePath) {
    if (!filePath) return false;
    const path = getPrivateOriginalPath(filePath);
    try {
        await unlink(path);
    } catch (error) {
        if (error.code !== "ENOENT") throw error;
    }
    return true;
}

export async function removeStoredPhoto(url) {
    const match = typeof url === "string"
        ? /^\/uploads\/(previews|covers)\/([a-f0-9-]{36}\.(?:jpg|png|webp|gif))$/i.exec(url)
        : null;
    if (!match)
        return false;

    try {
        const directory = match[1] === "previews" ? publicPreviewsDirectory : albumCoversDirectory;
        await unlink(join(directory, match[2]));
    } catch (error) {
        if (error.code !== "ENOENT")
            throw error;
    }
    return true;
}
