import { getDependency } from "../dependecy.js";
import bcrypt from "bcrypt";

export class LoginService {
    constructor() {
        this.userRepo = getDependency("userRepo");
        this.sessionRepo = getDependency("sessionRepo");
    }

    createToken() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, "0")).join("");
    }

    async login(data) {
         if (!data.user_name)
            throw new Error("El nombre de usuario es obligatorio");

        if (!data.password)
            throw new Error("La contraseña es obligatoria");

        const user = await this.userRepo.findOne({
            user_name: data.user_name
        });

        if (!user)
            throw new Error("El nombre de usuario o la contraseña son incorrectos");

        const isMatch = await bcrypt.compare(data.password, user.password);
        if (!isMatch)
            throw new Error("El nombre de usuario o la contraseña son incorrectos");

        var authorizationToken;
        do {
            authorizationToken = this.createToken();
        } while (await this.sessionRepo.findOne({ token: authorizationToken }));

        const session = await this.sessionRepo.create({
            username: user.user_name,
            authorizationToken,
            role: user.role,
            open: new Date().toISOString(),
        });

        return {
            authorizationToken: session.authorizationToken,
            username: session.username,
            role: session.role,
        };
    }
}