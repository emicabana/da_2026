import { getDependency } from "../dependency.js";
import { normalizeRole, ROLES, VALID_ROLES } from "../roles.js";
import { PASSWORD_PATTERN, USERNAME_PATTERN } from "../validation.js";
import bcrypt from "bcrypt";

export class UserService {
    constructor() {
        this.userRepo = getDependency("userRepo");
    }

    async getList() {
        return await this.userRepo.find();
    }

    async getByUsername(username) {
        const user = await this.userRepo.findOne({ user_name: username });
        if (!user)
            throw Object.assign(new Error("Usuario no encontrado"), { status: 404 });
        return user;
    }

    async updateOwnProfile(username, data) {
        if (!data || typeof data !== "object" || Array.isArray(data))
            throw Object.assign(new Error("Los datos del perfil no son válidos"), { status: 400 });

        const updates = {};
        if (data.display_name !== undefined) {
            if (typeof data.display_name !== "string" || !data.display_name.trim())
                throw Object.assign(new Error("El nombre visible es obligatorio"), { status: 400 });
            if (data.display_name.trim().length > 80)
                throw Object.assign(new Error("El nombre visible no puede superar los 80 caracteres"), { status: 400 });
            updates.display_name = data.display_name.trim();
        }

        if (data.email !== undefined) {
            if (typeof data.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()))
                throw Object.assign(new Error("Ingresá un correo electrónico válido"), { status: 400 });
            updates.email = data.email.trim().toLowerCase();
        }

        if (Object.keys(updates).length === 0)
            throw Object.assign(new Error("No hay cambios para guardar"), { status: 400 });

        try {
            const updated = await this.userRepo.findOneAndUpdate(
                { user_name: username },
                updates,
                { new: true, runValidators: true }
            );
            if (!updated)
                throw Object.assign(new Error("Usuario no encontrado"), { status: 404 });
            return updated;
        } catch (error) {
            if (error.code === 11000 && error.keyPattern?.email)
                throw Object.assign(new Error("Ese correo electrónico ya está asociado a otra cuenta"), { status: 409 });
            throw error;
        }
    }

    async create(user) {
        if (!user || typeof user !== "object")
            throw Object.assign(new Error("Faltan los datos del usuario"), { status: 400 });

        if (!user.user_name)
            throw Object.assign(new Error("El nombre de usuario es obligatorio"), { status: 400 });
        if (!USERNAME_PATTERN.test(user.user_name))
            throw Object.assign(new Error("El usuario debe tener hasta 30 caracteres: letras, números, punto o guion bajo; no puede empezar o terminar con punto ni tener puntos seguidos"), { status: 400 });

        if (!user.password)
            throw Object.assign(new Error("La contraseña es obligatoria"), { status: 400 });
        if (!PASSWORD_PATTERN.test(user.password))
            throw Object.assign(new Error("La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número"), { status: 400 });

        const role = normalizeRole(user.role || ROLES.CUSTOMER);
        if (!VALID_ROLES.includes(role))
            throw Object.assign(new Error("El rol debe ser admin, photographer o customer"), { status: 400 });

        const existentUser = await this.userRepo.findOne({ user_name: user.user_name });
        if (existentUser)
            throw Object.assign(new Error("El nombre de usuario ya existe"), { status: 409 });

        try {
            return await this.userRepo.create({
                ...user,
                password: bcrypt.hashSync(user.password, 10),
                role,
            });
        } catch (error) {
            if (error.code === 11000 && error.keyPattern?.email)
                throw Object.assign(new Error("Ese correo electrónico ya está asociado a otra cuenta"), { status: 409 });
            if (error.code === 11000 && error.keyPattern?.user_name)
                throw Object.assign(new Error("El nombre de usuario ya existe"), { status: 409 });
            throw error;
        }
    }

    async register(data) {
        if (!data || typeof data !== "object" || Array.isArray(data))
            throw Object.assign(new Error("Faltan los datos de la cuenta"), { status: 400 });

        const firstName = typeof data.first_name === "string" ? data.first_name.trim() : "";
        const lastName = typeof data.last_name === "string" ? data.last_name.trim() : "";
        const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
        if (!firstName || firstName.length > 40)
            throw Object.assign(new Error("El nombre es obligatorio y no puede superar los 40 caracteres"), { status: 400 });
        if (!lastName || lastName.length > 40)
            throw Object.assign(new Error("El apellido es obligatorio y no puede superar los 40 caracteres"), { status: 400 });
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
            throw Object.assign(new Error("Ingresá un correo electrónico válido"), { status: 400 });
        if (typeof data.password !== "string" || !PASSWORD_PATTERN.test(data.password))
            throw Object.assign(new Error("La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número"), { status: 400 });
        if (!["customer", "photographer"].includes(data.role))
            throw Object.assign(new Error("Seleccioná si querés registrarte como usuario o fotógrafo"), { status: 400 });

        if (await this.userRepo.findOne({ email }))
            throw Object.assign(new Error("Ese correo electrónico ya está asociado a otra cuenta"), { status: 409 });

        const usernameBase = `${firstName}.${lastName}`
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^A-Za-z0-9._]/g, ".")
            .replace(/\.{2,}/g, ".")
            .replace(/^\.+|\.+$/g, "")
            .slice(0, 30) || "memories";
        let userName = usernameBase;
        let suffix = 1;
        while (await this.userRepo.findOne({ user_name: userName })) {
            const suffixText = String(suffix);
            userName = `${usernameBase.slice(0, 30 - suffixText.length)}${suffixText}`;
            suffix += 1;
        }

        try {
            return await this.create({
                user_name: userName,
                password: data.password,
                display_name: `${firstName} ${lastName}`,
                email,
                role: data.role,
            });
        } catch (error) {
            if (error.code === 11000 && error.keyPattern?.email)
                throw Object.assign(new Error("Ese correo electrónico ya está asociado a otra cuenta"), { status: 409 });
            if (error.code === 11000 && error.keyPattern?.user_name)
                throw Object.assign(new Error("No se pudo generar un usuario único. Intentá registrarte nuevamente"), { status: 409 });
            throw error;
        }
    }

    async update(username, data) {
        const updates = { ...data };
        if (updates.user_name !== undefined && !USERNAME_PATTERN.test(updates.user_name))
            throw Object.assign(new Error("El usuario debe tener hasta 30 caracteres: letras, números, punto o guion bajo; no puede empezar o terminar con punto ni tener puntos seguidos"), { status: 400 });
        if (updates.role !== undefined) {
            updates.role = normalizeRole(updates.role);
            if (!VALID_ROLES.includes(updates.role))
                throw Object.assign(new Error("El rol debe ser admin, photographer o customer"), { status: 400 });
        }
        if (updates.password && !PASSWORD_PATTERN.test(updates.password))
            throw Object.assign(new Error("La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número"), { status: 400 });
        if (updates.password)
            updates.password = bcrypt.hashSync(updates.password, 10);

        try {
            const updated = await this.userRepo.findOneAndUpdate(
                { user_name: username },
                updates,
                { new: true, runValidators: true }
            );
            if (!updated)
                throw Object.assign(new Error("Usuario no encontrado"), { status: 404 });

            return updated;
        } catch (error) {
            if (error.code === 11000 && error.keyPattern?.email)
                throw Object.assign(new Error("Ese correo electrónico ya está asociado a otra cuenta"), { status: 409 });
            if (error.code === 11000 && error.keyPattern?.user_name)
                throw Object.assign(new Error("El nombre de usuario ya existe"), { status: 409 });
            throw error;
        }
    }

    async delete(username) {
        const deleted = await this.userRepo.findOneAndDelete({ user_name: username });
        if (!deleted)
            throw Object.assign(new Error("Usuario no encontrado"), { status: 404 });

        return deleted;
    }
}