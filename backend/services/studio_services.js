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
            whatsapp: "",
            paymentInfo: {
                alias: "",
                cbu: "",
                bankName: "",
                accountHolder: "",
                notes: "",
            },
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

        if (data.whatsapp !== undefined) {
            if (typeof data.whatsapp !== "string")
                throw Object.assign(new Error("El número de WhatsApp debe ser texto."), { status: 400 });
            const rawNumber = data.whatsapp.trim();
            if (rawNumber && !/^\+?[\d\s().-]+$/.test(rawNumber))
                throw Object.assign(new Error("Ingresá un número internacional válido para WhatsApp."), { status: 400 });
            const digits = rawNumber.replace(/\D/g, "");
            if (rawNumber && (digits.length < 8 || digits.length > 15 || digits.startsWith("0")))
                throw Object.assign(new Error("Ingresá un número internacional válido para WhatsApp."), { status: 400 });
            updates.whatsapp = digits ? `+${digits}` : "";
        }

        if (data.paymentInfo !== undefined) {
            if (!data.paymentInfo || typeof data.paymentInfo !== "object" || Array.isArray(data.paymentInfo))
                throw Object.assign(new Error("Los datos de pago no son válidos."), { status: 400 });
            const limits = {
                alias: 100,
                cbu: 40,
                bankName: 100,
                accountHolder: 120,
                notes: 500,
            };
            for (const [field, maxLength] of Object.entries(limits)) {
                if (data.paymentInfo[field] === undefined) continue;
                if (typeof data.paymentInfo[field] !== "string")
                    throw Object.assign(new Error(`El campo ${field} de los datos de pago debe ser texto.`), { status: 400 });
                const value = data.paymentInfo[field].trim();
                if (value.length > maxLength)
                    throw Object.assign(new Error(`El campo ${field} supera la longitud máxima permitida.`), { status: 400 });
                updates[`paymentInfo.${field}`] = value;
            }
        }

        return this.studioRepo.findOneAndUpdate(
            { owner_username: username },
            { $set: updates, $setOnInsert: { owner_username: username } },
            { new: true, upsert: true, runValidators: true }
        );
    }
}
