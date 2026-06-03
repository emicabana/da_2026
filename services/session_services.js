import { getDependency } from "../dependecy.js";

export class SessionService {
    constructor() {
        this.sessionRepo = getDependency("sessionRepo");
    }

    async getByToken(token) {
        return await this.sessionRepo.findOne({ authorizationToken: token });
    }   
}