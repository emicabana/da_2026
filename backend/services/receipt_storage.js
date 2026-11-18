import { createReadStream } from "node:fs";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import sharp from "sharp";

const backendDirectory = dirname(dirname(fileURLToPath(import.meta.url)));
export const privateReceiptsDirectory = join(backendDirectory, "private_uploads", "receipts");
const maxReceiptSize = 5 * 1024 * 1024;
const receiptTypes = [
    { mimeType: "image/jpeg", extension: "jpg", matches: (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
    { mimeType: "image/png", extension: "png", matches: (buffer) => buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
    { mimeType: "image/webp", extension: "webp", matches: (buffer) => buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP" },
    { mimeType: "application/pdf", extension: "pdf", matches: (buffer) => buffer.length >= 5 && buffer.toString("ascii", 0, 5) === "%PDF-" },
];

await mkdir(privateReceiptsDirectory, { recursive: true });

function getReceiptPath(filePath) {
    if (typeof filePath !== "string" || !/^[a-f0-9-]{36}\.(?:jpg|png|webp|pdf)$/i.test(filePath))
        throw Object.assign(new Error("La ruta del comprobante no es válida."), { status: 400 });
    return join(privateReceiptsDirectory, filePath);
}

function sanitizeOriginalName(originalName) {
    const name = typeof originalName === "string"
        ? originalName.replace(/\\/g, "/").split("/").pop()
        : "";
    return (name || "comprobante").replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 150);
}

export async function saveReceipt(file) {
    const buffer = file?.buffer;
    if (!Buffer.isBuffer(buffer) || !buffer.length)
        throw Object.assign(new Error("Adjuntá un comprobante."), { status: 400 });
    if (buffer.length > maxReceiptSize)
        throw Object.assign(new Error("El comprobante no puede superar los 5 MB."), { status: 413 });

    const detectedType = receiptTypes.find((type) => type.matches(buffer));
    if (!detectedType)
        throw Object.assign(new Error("El comprobante debe ser JPG, PNG, WEBP o PDF válido."), { status: 400 });
    if (detectedType.mimeType.startsWith("image/")) {
        let metadata;
        try {
            const image = sharp(buffer, { limitInputPixels: 30_000_000 });
            metadata = await image.metadata();
            await image.stats();
        } catch {
            throw Object.assign(new Error("El comprobante de imagen está dañado o no es válido."), { status: 400 });
        }
        const expectedFormat = detectedType.mimeType === "image/jpeg" ? "jpeg" : detectedType.extension;
        if (metadata.format !== expectedFormat)
            throw Object.assign(new Error("El tipo real de la imagen no coincide."), { status: 400 });
    } else if (buffer.subarray(Math.max(0, buffer.length - 1024)).indexOf(Buffer.from("%%EOF")) === -1) {
        throw Object.assign(new Error("El comprobante PDF está incompleto o no es válido."), { status: 400 });
    }

    const filePath = `${randomUUID()}.${detectedType.extension}`;
    const path = getReceiptPath(filePath);
    await writeFile(path, buffer, { flag: "wx" });
    return {
        filePath,
        mimeType: detectedType.mimeType,
        originalName: sanitizeOriginalName(file.originalname),
        uploadedAt: new Date(),
        sentViaWhatsapp: false,
    };
}

export function openReceipt(filePath) {
    return createReadStream(getReceiptPath(filePath));
}

export async function assertReceiptExists(filePath) {
    return stat(getReceiptPath(filePath));
}

export async function removeReceipt(filePath) {
    if (!filePath) return false;
    try {
        await unlink(getReceiptPath(filePath));
    } catch (error) {
        if (error.code !== "ENOENT") throw error;
    }
    return true;
}
