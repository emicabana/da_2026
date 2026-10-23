import mongoose from "mongoose";
import { getDependency } from "../dependency.js";

function invalid(message) {
    return Object.assign(new Error(message), { status: 400 });
}

export class CouponService {
    constructor() {
        this.couponRepo = getDependency("couponRepo");
        this.albumRepo = getDependency("albumRepo");
    }

    getList(username, isAdmin = false) {
        return this.couponRepo.find(isAdmin ? {} : { owner_username: username }).sort({ createdAt: -1 });
    }

    async create(username, data, isAdmin = false) {
        const code = typeof data.code === "string" ? data.code.trim().toUpperCase() : "";
        if (!/^[A-Z0-9_-]{3,30}$/.test(code))
            throw invalid("El código debe tener entre 3 y 30 caracteres: letras, números, guion o guion bajo.");
        if (!["percentage", "fixed"].includes(data.discount_type))
            throw invalid("Seleccioná un tipo de descuento válido.");
        const value = Number(data.value);
        if (!Number.isFinite(value) || value <= 0 || (data.discount_type === "percentage" && value > 90))
            throw invalid(data.discount_type === "percentage" ? "El porcentaje debe estar entre 1 y 90%. Con Pro, el límite es 100%." : "El descuento debe ser mayor a cero.");
        let maxDiscountAmount = null;
        if (data.max_discount_amount !== undefined && data.max_discount_amount !== "") {
            maxDiscountAmount = Number(data.max_discount_amount);
            if (!Number.isFinite(maxDiscountAmount) || maxDiscountAmount <= 0)
                throw invalid("El tope de descuento debe ser un importe mayor a cero.");
        }
        const description = typeof data.description === "string" ? data.description.trim() : "";
        if (description.length > 250)
            throw invalid("La descripción no puede superar los 250 caracteres.");
        let albumId = null;
        if (data.album_id) {
            if (!mongoose.isValidObjectId(data.album_id))
                throw invalid("El álbum seleccionado no es válido.");
            const album = await this.albumRepo.findOne(isAdmin ? { _id: data.album_id } : { _id: data.album_id, owner_username: username });
            if (!album)
                throw Object.assign(new Error("El álbum no existe o no pertenece a tu cuenta."), { status: 404 });
            albumId = album._id;
        }
        let expiresAt = null;
        if (data.expires_at) {
            expiresAt = new Date(data.expires_at);
            if (Number.isNaN(expiresAt.getTime()))
                throw invalid("La fecha de vencimiento debe ser futura.");
            expiresAt.setUTCHours(23, 59, 59, 999);
            if (expiresAt <= new Date())
                throw invalid("La fecha de vencimiento debe ser futura.");
        }
        let maxUses = null;
        if (data.max_uses !== undefined && data.max_uses !== "") {
            maxUses = Number(data.max_uses);
            if (!Number.isInteger(maxUses) || maxUses < 1)
                throw invalid("El límite de usos debe ser un entero mayor que cero.");
        }
        try {
            return await this.couponRepo.create({
                code,
                discount_type: data.discount_type,
                value,
                max_discount_amount: maxDiscountAmount,
                description,
                album_id: albumId,
                expires_at: expiresAt,
                max_uses: maxUses,
                owner_username: username,
            });
        } catch (error) {
            if (error.code === 11000)
                throw Object.assign(new Error("Ya existe un cupón con ese código."), { status: 409 });
            throw error;
        }
    }

    async update(username, id, data, isAdmin = false) {
        if (!mongoose.isValidObjectId(id))
            throw invalid("El cupón seleccionado no es válido.");
        const updates = {};
        if (data.active !== undefined) updates.active = data.active === true || data.active === "true";
        if (data.expires_at !== undefined) {
            if (!data.expires_at) updates.expires_at = null;
            else {
                const expiresAt = new Date(data.expires_at);
                if (Number.isNaN(expiresAt.getTime())) throw invalid("La fecha de vencimiento no es válida.");
                updates.expires_at = expiresAt;
            }
        }
        const updated = await this.couponRepo.findOneAndUpdate(
            isAdmin ? { _id: id } : { _id: id, owner_username: username },
            updates,
            { new: true, runValidators: true }
        );
        if (!updated)
            throw Object.assign(new Error("Cupón no encontrado."), { status: 404 });
        return updated;
    }

    async delete(username, id, isAdmin = false) {
        if (!mongoose.isValidObjectId(id))
            throw invalid("El cupón seleccionado no es válido.");
        const deleted = await this.couponRepo.findOneAndDelete(isAdmin ? { _id: id } : { _id: id, owner_username: username });
        if (!deleted)
            throw Object.assign(new Error("Cupón no encontrado."), { status: 404 });
    }
}
