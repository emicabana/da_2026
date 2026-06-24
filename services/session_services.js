import { getDependency } from "../dependency.js";

export class SessionService {
    constructor() {
        this.sessionRepo = getDependency("sessionRepo");
    }

    async getByToken(token) {
        return await this.sessionRepo.findOne({ authorizationToken: token });
    }

    async deleteByToken(token) {
        return await this.sessionRepo.findOneAndDelete({ authorizationToken: token });
    }
}