import { getDependency } from "../dependency.js";

export class PhotoService {
    constructor() {
        this.photoRepo = getDependency("photoRepo");
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

    async create(data) {
        if (!data.title)
            throw Object.assign(new Error("El título es obligatorio"), { status: 400 });
        if (!data.url)
            throw Object.assign(new Error("La URL es obligatoria"), { status: 400 });
        if (!data.price && data.price !== 0)
            throw Object.assign(new Error("El precio es obligatorio"), { status: 400 });

        return await this.photoRepo.create(data);
    }

    async update(id, data) {
        const updated = await this.photoRepo.findByIdAndUpdate(
            id,
            data,
            { new: true }
        );
        if (!updated)
            throw Object.assign(new Error("Foto no encontrada"), { status: 404 });
        return updated;
    }

    async delete(id) {
        const deleted = await this.photoRepo.findByIdAndDelete(id);
        if (!deleted)
            throw Object.assign(new Error("Foto no encontrada"), { status: 404 });
        return deleted;
    }
}