import { getDependency } from "../dependency.js";

export class OrderService {
    constructor() {
        this.orderRepo = getDependency("orderRepo");
        this.photoRepo = getDependency("photoRepo");
    }

    async getAll() {
        return await this.orderRepo.find().populate("photos");
    }

    async getByUsername(username) {
        return await this.orderRepo.find({ username }).populate("photos");
    }

    async getById(id, username) {
        const order = await this.orderRepo.findById(id).populate("photos");
        if (!order || (username && order.username !== username))
            throw Object.assign(new Error("Pedido no encontrado"), { status: 404 });
        return order;
    }

    async create(username, photoIds) {
        if (!photoIds || photoIds.length === 0)
            throw Object.assign(new Error("Debe incluir al menos una foto"), { status: 400 });

        // Buscar las fotos y calcular el total
        const photos = await this.photoRepo.find({ _id: { $in: photoIds }, available: true });

        if (photos.length !== photoIds.length)
            throw Object.assign(new Error("Una o más fotos no existen o no están disponibles"), { status: 400 });

        const total = photos.reduce((sum, photo) => sum + photo.price, 0);

        return await this.orderRepo.create({ username, photos: photoIds, total });
    }

    async updateStatus(id, status) {
        const updated = await this.orderRepo.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );
        if (!updated)
            throw Object.assign(new Error("Pedido no encontrado"), { status: 404 });
        return updated;
    }
}