import mongoose from "mongoose";
import { getDependency } from "../dependency.js";

export class CollaboratorService {
    constructor() {
        this.collaboratorRepo = getDependency("collaboratorRepo");
        this.albumRepo = getDependency("albumRepo");
        this.userRepo = getDependency("userRepo");
    }

    async getEffectiveOwner(username) {
        const fullAccess = await this.collaboratorRepo.findOne({
            collaborator_username: username,
            permission_level: "full",
            status: "accepted",
        });
        return fullAccess?.owner_username || username;
    }

    async getList(username) {
        const ownerUsername = await this.getEffectiveOwner(username);
        return this.collaboratorRepo.find({ owner_username: ownerUsername })
            .populate("album_id", "name")
            .sort({ createdAt: -1 });
    }

    getIncoming(username) {
        return this.collaboratorRepo.find({ collaborator_username: username })
            .populate("album_id", "name")
            .sort({ createdAt: -1 });
    }

    async create(username, data) {
        let ownerUsername = await this.getEffectiveOwner(username);
        const email = typeof data.email === "string"
            ? data.email.trim().toLowerCase()
            : "";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
            throw Object.assign(new Error("Ingresá un correo electrónico válido."), { status: 400 });
        if (!["event", "full"].includes(data.permission_level))
            throw Object.assign(new Error("Seleccioná un nivel de permisos válido."), { status: 400 });
        if (data.permission_level === "event" && !mongoose.isValidObjectId(data.album_id))
            throw Object.assign(new Error("Seleccioná el álbum para el colaborador."), { status: 400 });
        if (data.permission_level === "full" && data.album_id)
            throw Object.assign(new Error("El acceso completo se aplica a todos tus álbumes."), { status: 400 });

        const collaborator = await this.userRepo.findOne({ email, role: "photographer" });
        if (!collaborator)
            throw Object.assign(new Error("No encontramos una cuenta de fotógrafo con ese correo electrónico."), { status: 404 });
        if (collaborator.user_name === username)
            throw Object.assign(new Error("No podés invitar tu propia cuenta."), { status: 400 });

        let album = null;
        if (data.permission_level === "event") {
            album = await this.albumRepo.findOne({ _id: data.album_id });
            if (album && album.owner_username !== username) {
                const fullAccess = await this.collaboratorRepo.findOne({
                    owner_username: album.owner_username,
                    collaborator_username: username,
                    permission_level: "full",
                    status: { $in: ["accepted", null] },
                });
                if (fullAccess)
                    ownerUsername = album.owner_username;
                else
                    album = null;
            }
            if (album && album.owner_username !== ownerUsername)
                album = null;
        }
        if (data.permission_level === "event" && !album)
            throw Object.assign(new Error("El álbum no existe o no pertenece a tu cuenta."), { status: 404 });

        const scope = data.permission_level === "full" ? {
            owner_username: ownerUsername,
            collaborator_username: collaborator.user_name,
            permission_level: "full",
        } : {
            owner_username: ownerUsername,
            collaborator_username: collaborator.user_name,
            album_id: album._id,
        };
        const existing = await this.collaboratorRepo.findOne(scope);
        if (existing && existing.status !== "declined")
            throw Object.assign(new Error("Ese fotógrafo ya tiene una invitación o colaboración para este acceso."), { status: 409 });

        try {
            if (existing) {
                return await this.collaboratorRepo.findOneAndUpdate(
                    { _id: existing._id, owner_username: ownerUsername },
                    {
                        invite_email: email,
                        status: "pending",
                        permission_level: data.permission_level,
                        album_id: album?._id || null,
                    },
                    { new: true, runValidators: true }
                );
            }
            return await this.collaboratorRepo.create({
                owner_username: ownerUsername,
                collaborator_username: collaborator.user_name,
                invite_email: email,
                permission_level: data.permission_level,
                status: "pending",
                album_id: album?._id || null,
            });
        } catch (error) {
            if (error.code === 11000)
                throw Object.assign(new Error("Ese fotógrafo ya colabora en este álbum."), { status: 409 });
            throw error;
        }
    }

    async respond(username, id, response) {
        if (!mongoose.isValidObjectId(id))
            throw Object.assign(new Error("La invitación seleccionada no es válida."), { status: 400 });
        if (!["accepted", "declined"].includes(response))
            throw Object.assign(new Error("Elegí aceptar o rechazar la invitación."), { status: 400 });
        const updated = await this.collaboratorRepo.findOneAndUpdate(
            { _id: id, collaborator_username: username, status: "pending" },
            { $set: { status: response } },
            { new: true, runValidators: true }
        );
        if (!updated)
            throw Object.assign(new Error("La invitación no está pendiente o no te pertenece."), { status: 404 });
        return updated;
    }

    async leave(username, id) {
        if (!mongoose.isValidObjectId(id))
            throw Object.assign(new Error("La colaboración seleccionada no es válida."), { status: 400 });
        const updated = await this.collaboratorRepo.findOneAndUpdate(
            { _id: id, collaborator_username: username, status: "accepted" },
            { $set: { status: "declined" } },
            { new: true }
        );
        if (!updated)
            throw Object.assign(new Error("Colaboración no encontrada."), { status: 404 });
    }

    async delete(username, id) {
        if (!mongoose.isValidObjectId(id))
            throw Object.assign(new Error("El colaborador seleccionado no es válido."), { status: 400 });
        const ownerUsername = await this.getEffectiveOwner(username);
        const deleted = await this.collaboratorRepo.findOneAndDelete({ _id: id, owner_username: ownerUsername });
        if (!deleted)
            throw Object.assign(new Error("Colaborador no encontrado."), { status: 404 });
    }
}
