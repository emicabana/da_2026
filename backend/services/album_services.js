import { getDependency } from "../dependency.js";
import mongoose from "mongoose";

function invalid(message) {
    return Object.assign(new Error(message), { status: 400 });
}

export class AlbumService {
    constructor() {
        this.albumRepo = getDependency("albumRepo");
        this.collaboratorRepo = getDependency("collaboratorRepo");
        this.couponRepo = getDependency("couponRepo");
        this.photoRepo = getDependency("photoRepo");
        this.userRepo = getDependency("userRepo");
    }

    async getPublicList() {
        const albums = await this.albumRepo.find({ is_private: { $ne: true } })
            .sort({ date: -1, createdAt: -1 });
        const owners = [...new Set(albums.map((album) => album.owner_username))];
        const users = await this.userRepo.find({ user_name: { $in: owners } })
            .select("user_name display_name");
        const displayNames = new Map(users.map((user) => [user.user_name, user.display_name]));
        return albums.map((album) => ({
            ...(typeof album.toObject === "function" ? album.toObject() : album),
            owner_display_name: displayNames.get(album.owner_username) || album.owner_username,
        }));
    }

    async getList(username) {
        const collaborations = await this.collaboratorRepo.find({
            collaborator_username: username,
            status: { $in: ["accepted", null] },
        }).select("album_id owner_username permission_level");
        const albumIds = collaborations.map((collaboration) => collaboration.album_id).filter(Boolean);
        const ownersWithFullAccess = collaborations
            .filter((collaboration) => collaboration.permission_level === "full")
            .map((collaboration) => collaboration.owner_username);
        const albums = await this.albumRepo.find({
            $or: [
                { owner_username: username },
                { owner_username: { $in: ownersWithFullAccess } },
                { _id: { $in: albumIds } },
            ],
        }).sort({ date: -1, createdAt: -1 });
        return albums.map((album) => {
            if (album.owner_username === username)
                return album;
            const collaboration = collaborations.find((entry) =>
                entry.owner_username === album.owner_username && entry.permission_level === "full"
            ) || collaborations.find((entry) =>
                entry.owner_username === album.owner_username
                && String(entry.album_id) === String(album._id)
            );
            return {
                ...(typeof album.toObject === "function" ? album.toObject() : album),
                shared_permission: collaboration?.permission_level || "event",
            };
        });
    }

    async getById(id, username) {
        if (!mongoose.isValidObjectId(id))
            throw invalid("El identificador del álbum no es válido.");
        const album = await this.albumRepo.findById(id);
        if (!album)
            throw Object.assign(new Error("Álbum no encontrado"), { status: 404 });
        if (album.owner_username !== username) {
            const collaboration = await this.collaboratorRepo.findOne({
                owner_username: album.owner_username,
                collaborator_username: username,
                status: { $in: ["accepted", null] },
                $or: [
                    { permission_level: "full" },
                    { album_id: album._id, permission_level: { $in: ["event", null] } },
                ],
            });
            if (!collaboration)
                throw Object.assign(new Error("Álbum no encontrado"), { status: 404 });
        }
        return album;
    }

    async delete(id, username) {
        const album = await this.getById(id, username);
        if (album.owner_username !== username)
            throw Object.assign(new Error("Solo el propietario puede eliminar este álbum."), { status: 403 });

        const photos = await this.photoRepo.find({ album_id: album._id });
        await this.photoRepo.deleteMany({ album_id: album._id });
        await this.couponRepo.deleteMany({ album_id: album._id });
        await this.collaboratorRepo.deleteMany({ album_id: album._id });
        const deletedAlbum = await this.albumRepo.findOneAndDelete({
            _id: album._id,
            owner_username: username,
        });
        if (!deletedAlbum)
            throw Object.assign(new Error("Álbum no encontrado."), { status: 404 });

        return { album: deletedAlbum, photos };
    }

    async updateOffers(id, username, data) {
        const album = await this.getById(id, username);
        if (album.owner_username !== username)
            throw Object.assign(new Error("Solo el propietario puede editar las ofertas del álbum."), { status: 403 });
        const fields = [
            "photo_discount_percent", "photo_discount_min_quantity", "photo_package_quantity", "photo_package_price",
            "video_discount_percent", "video_discount_min_quantity", "video_package_quantity", "video_package_price",
        ];
        const updates = {};
        for (const field of fields) {
            if (data[field] === undefined) continue;
            const value = Number(data[field]);
            if (!Number.isFinite(value) || value < 0)
                throw invalid(`El valor de ${field} debe ser igual o mayor a cero.`);
            if (field.endsWith("_discount_min_quantity") && value < 1)
                throw invalid("La cantidad mínima para aplicar un descuento debe ser al menos 1.");
            if (field.endsWith("_percent") && value > 100)
                throw invalid("El descuento no puede superar el 100%.");
            if (field.endsWith("_quantity") && !Number.isInteger(value))
                throw invalid("Las cantidades de paquetes deben ser enteros.");
            updates[field] = value;
        }
        for (const type of ["photo", "video"]) {
            const quantity = updates[`${type}_package_quantity`] ?? album[`${type}_package_quantity`] ?? 0;
            const price = updates[`${type}_package_price`] ?? album[`${type}_package_price`] ?? 0;
            if (quantity > 0 && price <= 0)
                throw invalid("El precio de un paquete activo debe ser mayor a cero.");
        }
        return this.albumRepo.findOneAndUpdate(
            { _id: id, owner_username: username },
            { $set: updates },
            { new: true, runValidators: true }
        );
    }

    async createQuantityDiscount(id, username, data) {
        const album = await this.getById(id, username);
        if (album.owner_username !== username)
            throw Object.assign(new Error("Solo el propietario puede crear descuentos para este álbum."), { status: 403 });

        const name = typeof data.name === "string" ? data.name.trim() : "";
        if (!name || name.length > 50)
            throw invalid("El nombre del descuento es obligatorio y no puede superar los 50 caracteres.");
        const description = typeof data.description === "string" ? data.description.trim() : "";
        if (description.length > 250)
            throw invalid("La descripción no puede superar los 250 caracteres.");
        if (!["photos", "videos"].includes(data.content_type))
            throw invalid("Seleccioná un tipo de contenido válido.");
        if (!Array.isArray(data.tiers) || data.tiers.length === 0)
            throw invalid("Agregá al menos un nivel de descuento.");

        const tiers = data.tiers.map((tier) => ({
            min_quantity: Number(tier.min_quantity),
            discount_percent: Number(tier.discount_percent),
        }));
        const quantities = new Set();
        for (const tier of tiers) {
            if (!Number.isInteger(tier.min_quantity) || tier.min_quantity < 1)
                throw invalid("La cantidad mínima debe ser un entero mayor que cero.");
            if (quantities.has(tier.min_quantity))
                throw invalid("No repitas la cantidad mínima en dos niveles.");
            quantities.add(tier.min_quantity);
            if (!Number.isFinite(tier.discount_percent) || tier.discount_percent <= 0 || tier.discount_percent > 100)
                throw invalid("El descuento debe ser mayor a 0 y no superar el 100%.");
        }
        tiers.sort((first, second) => first.min_quantity - second.min_quantity);

        const discount = {
            name,
            description,
            content_type: data.content_type,
            active: true,
            tiers,
        };
        const updated = await this.albumRepo.findOneAndUpdate(
            { _id: id, owner_username: username },
            { $push: { quantity_discounts: discount } },
            { new: true, runValidators: true }
        );
        if (!updated)
            throw Object.assign(new Error("Álbum no encontrado."), { status: 404 });
        return updated.quantity_discounts[updated.quantity_discounts.length - 1];
    }

    async updateQuantityDiscount(id, discountId, username, data) {
        const album = await this.getById(id, username);
        if (album.owner_username !== username)
            throw Object.assign(new Error("Solo el propietario puede editar descuentos para este álbum."), { status: 403 });
        if (!mongoose.isValidObjectId(discountId))
            throw invalid("El descuento seleccionado no es válido.");
        const discount = album.quantity_discounts.id(discountId);
        if (!discount)
            throw Object.assign(new Error("Descuento no encontrado."), { status: 404 });
        if (data.active !== undefined)
            discount.active = data.active === true || data.active === "true";
        await album.save();
        return discount;
    }

    async deleteQuantityDiscount(id, discountId, username) {
        const album = await this.getById(id, username);
        if (album.owner_username !== username)
            throw Object.assign(new Error("Solo el propietario puede eliminar descuentos para este álbum."), { status: 403 });
        if (!mongoose.isValidObjectId(discountId))
            throw invalid("El descuento seleccionado no es válido.");
        const discount = album.quantity_discounts.id(discountId);
        if (!discount)
            throw Object.assign(new Error("Descuento no encontrado."), { status: 404 });
        discount.deleteOne();
        await album.save();
    }

    async create(data, username, coverUrl) {
        const effectiveOwner = await this.getEffectiveOwner(username);
        const name = typeof data.name === "string" ? data.name.trim() : "";
        if (!name)
            throw invalid("El nombre del álbum es obligatorio.");
        if (name.length > 100)
            throw invalid("El nombre del álbum no puede superar los 100 caracteres.");
        if (!data.date || Number.isNaN(new Date(data.date).getTime()))
            throw invalid("La fecha del álbum es obligatoria y debe ser válida.");
        if (!coverUrl)
            throw invalid("La portada del álbum es obligatoria.");
        const category = typeof data.category === "string" ? data.category.trim() : "";
        if (!category)
            throw invalid("Seleccioná una categoría para el álbum.");
        if (category.length > 50)
            throw invalid("La categoría no puede superar los 50 caracteres.");
        if (typeof data.description === "string" && data.description.length > 1000)
            throw invalid("La descripción no puede superar los 1000 caracteres.");
        if (data.photo_price === undefined || data.photo_price === "")
            throw invalid("El precio por foto es obligatorio.");
        if (data.video_price === undefined || data.video_price === "")
            throw invalid("El precio por video es obligatorio.");

        const photoPrice = Number(data.photo_price);
        const videoPrice = Number(data.video_price);
        if (!Number.isFinite(photoPrice) || photoPrice < 0)
            throw invalid("El precio por foto debe ser un número igual o mayor a cero.");
        if (!Number.isFinite(videoPrice) || videoPrice < 0)
            throw invalid("El precio por video debe ser un número igual o mayor a cero.");

        return this.albumRepo.create({
            name,
            date: new Date(data.date),
            description: typeof data.description === "string" ? data.description.trim() : "",
            cover_url: coverUrl,
            photo_price: photoPrice,
            video_price: videoPrice,
            category,
            owner_username: effectiveOwner,
        });
    }

    async getEffectiveOwner(username) {
        const fullAccess = await this.collaboratorRepo.findOne({
            collaborator_username: username,
            permission_level: "full",
            status: "accepted",
        });
        return fullAccess?.owner_username || username;
    }
}
