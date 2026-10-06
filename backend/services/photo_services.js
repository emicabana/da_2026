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

    async create(data, username, isAdmin = false) {
        if (!data.title)
            throw Object.assign(new Error("El título es obligatorio"), { status: 400 });
        if (!data.url)
            throw Object.assign(new Error("La URL es obligatoria"), { status: 400 });
        if (!data.price && data.price !== 0)
            throw Object.assign(new Error("El precio es obligatorio"), { status: 400 });

        return await this.photoRepo.create({
            title: data.title,
            description: data.description,
            url: data.url,
            type: data.type,
            price: data.price,
            available: data.available,
            owner_username: isAdmin ? data.owner_username || username : username,
        });
    }

    async update(id, data, username, isAdmin = false) {
        const filter = isAdmin ? { _id: id } : { _id: id, owner_username: username };
        const updates = Object.fromEntries(
            ["title", "description", "url", "type", "price", "available"]
                .filter((key) => data[key] !== undefined)
                .map((key) => [key, data[key]])
        );
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
        const filter = isAdmin ? { _id: id } : { _id: id, owner_username: username };
        const deleted = await this.photoRepo.findOneAndDelete(filter);
        if (!deleted)
            throw Object.assign(new Error("Foto no encontrada"), { status: 404 });
        return deleted;
    }
}