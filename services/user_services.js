import { getDependency } from "../dependecy.js";
import bcrypt from "bcrypt";

export class UserService {
    constructor() {
        this.userRepo = getDependency("userRepo");
    }

    async getList() {
        return await this.userRepo.find();
    }

    async add(user) {
        if (!user.user_name)
            throw new Error("El nombre de usuario es obligatorio");

        if (!user.password)
            throw new Error("La contraseña es obligatoria");

        if (user.password === "1234")
            throw new Error("La contraseña no puede ser '1234'");
        
        const existentUser = await this.userRepo.find({
            user_name: user.user_name
        });
        if (existentUser.getList)
            throw new Error("El nombre de usuario ya existe");

        user.password = bcrypt.hashSync(user.password, 10);

        return this.userRepo.create(user);
    }
}