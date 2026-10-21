import { mkdir, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const uploadsDirectory = join(dirname(fileURLToPath(import.meta.url)), "../uploads");

await mkdir(uploadsDirectory, { recursive: true });

export async function removeStoredPhoto(url) {
    const match = typeof url === "string"
        ? /^\/uploads\/([a-f0-9-]{36}\.(?:jpg|png|webp|gif))$/i.exec(url)
        : null;
    if (!match)
        return false;

    try {
        await unlink(join(uploadsDirectory, match[1]));
    } catch (error) {
        if (error.code !== "ENOENT")
            throw error;
    }
    return true;
}
