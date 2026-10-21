import { getDependency } from "../dependency.js";

export class StudioService {
    constructor() {
        this.studioRepo = getDependency("studioRepo");
    }

    async get(username) {
        const studio = await this.studioRepo.findOne({ owner_username: username });
        return studio || {
            owner_username: username,
            description: "",
            location: "",
            website: "",
            instagram: "",
        };
    }

    async update(username, data) {
        const fields = ["description", "location", "website", "instagram"];
        const updates = {};
        for (const field of fields) {
            if (data[field] === undefined) continue;
            if (typeof data[field] !== "string")
                throw Object.assign(new Error(`El campo ${field} debe ser texto.`), { status: 400 });
            updates[field] = data[field].trim();
        }
        if (updates.description?.length > 500 || updates.location?.length > 120
            || updates.website?.length > 200 || updates.instagram?.length > 60)
            throw Object.assign(new Error("Uno de los campos supera la longitud máxima permitida."), { status: 400 });
        if (updates.website && !/^https?:\/\/\S+$/i.test(updates.website))
            throw Object.assign(new Error("El sitio web debe comenzar con http:// o https://."), { status: 400 });

        return this.studioRepo.findOneAndUpdate(
            { owner_username: username },
            { $set: updates, $setOnInsert: { owner_username: username } },
            { new: true, upsert: true, runValidators: true }
        );
    }
}
