import { getDependency } from "../dependency.js";
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
            throw Object.assign(new Error("El nombre de usuario es obligatorio"), { status: 400 });

        if (!data.password)
            throw Object.assign(new Error("La contraseña es obligatoria"), { status: 400 });

        const user = await this.userRepo.findOne({ user_name: data.user_name });
        if (!user)
            throw Object.assign(new Error("El nombre de usuario o la contraseña son incorrectos"), { status: 401 });

        const isMatch = await bcrypt.compare(data.password, user.password);
        if (!isMatch)
            throw Object.assign(new Error("El nombre de usuario o la contraseña son incorrectos"), { status: 401 });

        var authorizationToken;
        do {
            authorizationToken = this.createToken();
        } while (await this.sessionRepo.findOne({ authorizationToken }));

        const session = await this.sessionRepo.create({
            username: user.user_name,
            authorizationToken,
            role: user.role,
            open: new Date().toISOString()
        });

        return {
            authorizationToken: session.authorizationToken,
            username: session.username,
            role: session.role,
        };
    }
}