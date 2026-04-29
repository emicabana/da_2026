import { getDependency } from "../dependecy.js";

export class UserService {
    constructor() {
    }

    getList() {
        const userRepo = getDependency("userRepo");
        return userRepo.getList();
    }

    create(data) {
        const user = getDependency("userRepo").create(data);
        if (!user) return null;
        return user;
    }

    update(id, data) {
        return getDependency("userRepo").update(id, data);
    }

    delete(id) {
        return getDependency("userRepo").delete(id);
    }
}