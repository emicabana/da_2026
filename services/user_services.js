import { getDependency } from "../dependecy.js";

export class UserService {
    constructor() {
    }

    getList() {
        const userRepo = getDependency("userRepo");
        return userRepo.getList();
    }

}