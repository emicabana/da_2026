import { getDependency } from "../dependency.js";
import mongoose from "mongoose";

export class PhotoService {
    constructor() {
        this.photoRepo = getDependency("photoRepo");
        this.albumRepo = getDependency("albumRepo");
    }

    async getList() {
        return await this.photoRepo.find({ available: true });
    }

    async getById(id) {
        const photo = await this.photoRepo.findById(id);
        if (!photo)
            throw Object.assign(new Error("Foto no encontrada"), { status: 404 });
        return photo;
    }

    async getByAlbum(albumId) {
        return this.photoRepo.find({
            album_id: albumId,
            available: true,
        });
    }

    async validateAlbum(albumId, username, isAdmin) {
        if (!albumId)
            return undefined;
        if (!mongoose.isValidObjectId(albumId))
            throw Object.assign(new Error("El identificador del álbum no es válido."), { status: 400 });
        const album = await this.albumRepo.findOne({ _id: albumId });
        if (!album)
            throw Object.assign(new Error("El álbum seleccionado no existe o no pertenece a tu cuenta."), { status: 404 });
        if (!isAdmin && album.owner_username !== username) {
            const collaboratorRepo = getDependency("collaboratorRepo");
            const collaboration = await collaboratorRepo.findOne({
                owner_username: album.owner_username,
                album_id: album._id,
                collaborator_username: username,
                permission_level: { $in: ["event", null] },
                status: { $in: ["accepted", null] },
            });
            const fullAccess = await collaboratorRepo.findOne({
                owner_username: album.owner_username,
                collaborator_username: username,
                permission_level: "full",
                status: "accepted",
            });
            if (!collaboration && !fullAccess)
                throw Object.assign(new Error("El álbum seleccionado no existe o no pertenece a tu cuenta."), { status: 404 });
        }
        return album;
    }

    async canManageAlbum(username, album) {
        if (album.owner_username === username)
            return true;
        const collaboratorRepo = getDependency("collaboratorRepo");
        const fullAccess = await collaboratorRepo.findOne({
            owner_username: album.owner_username,
            collaborator_username: username,
            permission_level: "full",
            status: { $in: ["accepted", null] },
        });
        return Boolean(fullAccess);
    }

    async create(data, username, isAdmin = false) {
        if (!data.title)
            throw Object.assign(new Error("El título es obligatorio"), { status: 400 });
        if (!data.url)
            throw Object.assign(new Error("La URL es obligatoria"), { status: 400 });
        if (!data.price && data.price !== 0)
            throw Object.assign(new Error("El precio es obligatorio"), { status: 400 });

        const album = await this.validateAlbum(data.album_id, username, isAdmin);
        const type = data.type || "photo";
        return await this.photoRepo.create({
            title: data.title,
            description: data.description,
            url: data.url,
            type,
            price: album ? (type === "video" ? album.video_price : album.photo_price) : data.price,
            available: data.available,
            album_id: album?._id,
            owner_username: isAdmin ? data.owner_username || username : username,
        });
    }

    async update(id, data, username, isAdmin = false) {
        const existingPhoto = await this.photoRepo.findById(id);
        if (!existingPhoto)
            throw Object.assign(new Error("Foto no encontrada"), { status: 404 });
        let managerAlbum = null;
        if (!isAdmin && existingPhoto.owner_username !== username) {
            managerAlbum = existingPhoto.album_id
                ? await this.albumRepo.findOne({ _id: existingPhoto.album_id })
                : null;
            if (!managerAlbum || !await this.canManageAlbum(username, managerAlbum))
                throw Object.assign(new Error("Foto no encontrada"), { status: 404 });
        }
        const filter = isAdmin ? { _id: id } : {
            _id: id,
            $or: [
                { owner_username: username },
                ...(managerAlbum ? [{ album_id: existingPhoto.album_id }] : []),
            ],
        };
        const album = data.album_id !== undefined
            ? await this.validateAlbum(data.album_id, username, isAdmin)
            : undefined;
        const updates = Object.fromEntries(
            ["title", "description", "url", "type", "price", "available"]
                .filter((key) => data[key] !== undefined)
                .map((key) => [key, data[key]])
        );
        if (data.album_id !== undefined) {
            updates.album_id = album?._id;
            if (album) {
                const type = data.type || "photo";
                updates.price = type === "video" ? album.video_price : album.photo_price;
            }
        }
        const updated = await this.photoRepo.findOneAndUpdate(
            filter,
            updates,
            { new: true, runValidators: true }
        );
        if (!updated)
            throw Object.assign(new Error("Foto no encontrada"), { status: 404 });
        return updated;
    }

    async delete(id, username, isAdmin = false) {
        const existingPhoto = await this.photoRepo.findById(id);
        if (!existingPhoto)
            throw Object.assign(new Error("Foto no encontrada"), { status: 404 });
        let managerAlbum = null;
        if (!isAdmin && existingPhoto.owner_username !== username) {
            managerAlbum = existingPhoto.album_id
                ? await this.albumRepo.findOne({ _id: existingPhoto.album_id })
                : null;
            if (!managerAlbum || !await this.canManageAlbum(username, managerAlbum))
                throw Object.assign(new Error("Foto no encontrada"), { status: 404 });
        }
        const filter = isAdmin ? { _id: id } : {
            _id: id,
            $or: [
                { owner_username: username },
                ...(managerAlbum ? [{ album_id: existingPhoto.album_id }] : []),
            ],
        };
        const deleted = await this.photoRepo.findOneAndDelete(filter);
        if (!deleted)
            throw Object.assign(new Error("Foto no encontrada"), { status: 404 });
        return deleted;
    }
}