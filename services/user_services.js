import { getDependency } from "../dependency.js";
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

    async create(user) {
        if (!user.user_name)
            throw Object.assign(new Error("El nombre de usuario es obligatorio"), { status: 400 });

        if (!user.password)
            throw Object.assign(new Error("La contraseña es obligatoria"), { status: 400 });

        const existentUser = await this.userRepo.findOne({ user_name: user.user_name });
        if (existentUser)
            throw Object.assign(new Error("El nombre de usuario ya existe"), { status: 409 });

        user.password = bcrypt.hashSync(user.password, 10);

        return await this.userRepo.create(user);
    }

    async update(username, data) {
        if (data.password) {
            data.password = bcrypt.hashSync(data.password, 10);
        }

        const updated = await this.userRepo.findOneAndUpdate(
            { user_name: username },
            data,
            { new: true }
        );
        if (!updated)
            throw Object.assign(new Error("Usuario no encontrado"), { status: 404 });

        return updated;
    }

    async delete(username) {
        const deleted = await this.userRepo.findOneAndDelete({ user_name: username });
        if (!deleted)
            throw Object.assign(new Error("Usuario no encontrado"), { status: 404 });

        return deleted;
    }
}