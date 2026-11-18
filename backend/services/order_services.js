import { getDependency } from "../dependency.js";
import mongoose from "mongoose";
import { stat } from "node:fs/promises";
import { extname } from "node:path";
import { getOriginalPhotoPath } from "./photo_storage.js";
import { assertReceiptExists, openReceipt, removeReceipt, saveReceipt } from "./receipt_storage.js";

function fail(message, status) {
    return Object.assign(new Error(message), { status });
}

function allocateAmount(amount, groups) {
    if (!groups.length) return [];
    const cents = Math.max(0, Math.round(Number(amount || 0) * 100));
    const grossTotal = groups.reduce((sum, group) => sum + group.gross, 0);
    const shares = groups.map((group) => cents * (grossTotal > 0
        ? group.gross / grossTotal
        : 1 / groups.length));
    const allocations = shares.map(Math.floor);
    let remaining = cents - allocations.reduce((sum, value) => sum + value, 0);
    const order = shares.map((share, index) => ({
        index,
        remainder: share - allocations[index],
    })).sort((left, right) => right.remainder - left.remainder);
    for (let index = 0; index < remaining; index += 1)
        allocations[order[index].index] += 1;
    return allocations.map((value) => value / 100);
}

function groupByPhotographer(photos) {
    const groups = new Map();
    for (const photo of photos) {
        if (!photo?.owner_username) continue;
        const group = groups.get(photo.owner_username) || {
            photographer_username: photo.owner_username,
            gross: 0,
        };
        group.gross += photo.price || 0;
        groups.set(photo.owner_username, group);
    }
    return [...groups.values()];
}

function createEvent(type, actorId, actorRole, photographerId = null, note = "", photoId = null) {
    return { type, actorId, actorRole, photographerId, note, photoId, createdAt: new Date() };
}

function emptyPaymentInfo() {
    return { alias: "", cbu: "", bankName: "", accountHolder: "", notes: "" };
}

function mimeTypeForImage(extension) {
    return {
        ".jpg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".gif": "image/gif",
    }[extension];
}

function mimeTypeForReceipt(extension) {
    return {
        ".jpg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".pdf": "application/pdf",
    }[extension];
}

export class OrderService {
    constructor() {
        this.orderRepo = getDependency("orderRepo");
        this.photoRepo = getDependency("photoRepo");
        this.albumRepo = getDependency("albumRepo");
        this.couponRepo = getDependency("couponRepo");
        this.userRepo = getDependency("userRepo");
        this.studioRepo = getDependency("studioRepo");
    }

    async getAll() {
        return await this.orderRepo.find().populate("photos");
    }

    async getByUsername(username) {
        const orders = await this.orderRepo.find({ username }).populate("photos");
        return Promise.all(orders.map((order) => this.addPhotographerPaymentInfo(order)));
    }

    async addPhotographerPaymentInfo(order) {
        const result = order.toObject();
        const groups = groupByPhotographer(result.photos || []);
        const existingUsernames = new Set((result.sales_statuses || [])
            .map((sale) => sale.photographer_username));
        const missingGroups = groups.filter((group) => !existingUsernames.has(group.photographer_username));
        const photographers = groups.length
            ? await this.userRepo.find({
                user_name: { $in: groups.map((group) => group.photographer_username) },
            }).select("_id user_name")
            : [];
        const photographerIds = new Map(photographers.map((photographer) => [
            photographer.user_name,
            photographer._id,
        ]));
        result.sales_statuses = result.sales_statuses || [];
        const groupIndexes = new Map(groups.map((group, index) => [group.photographer_username, index]));
        const subtotals = allocateAmount(result.total, groups);
        const discounts = allocateAmount(result.discount_total, groups);
        result.sales_statuses = result.sales_statuses.map((sale) => ({
            ...sale,
            photographerId: sale.photographerId || photographerIds.get(sale.photographer_username) || null,
            subtotal: sale.subtotal || result.total === 0
                ? sale.subtotal
                : subtotals[groupIndexes.get(sale.photographer_username)] || 0,
            discount_total: sale.subtotal || result.total === 0
                ? sale.discount_total
                : discounts[groupIndexes.get(sale.photographer_username)] || 0,
        }));
        for (const group of missingGroups) {
            const index = groups.indexOf(group);
            result.sales_statuses.push({
                photographerId: photographerIds.get(group.photographer_username) || null,
                photographer_username: group.photographer_username,
                subtotal: subtotals[index],
                discount_total: discounts[index],
                status: "pending",
                receipt: { hasFile: false, sentViaWhatsapp: false },
                rejectionReason: "",
                paidAt: null,
            });
        }
        const usernames = [...new Set((result.sales_statuses || [])
            .map((sale) => sale.photographer_username).filter(Boolean))];
        const studios = usernames.length
            ? await this.studioRepo.find({ owner_username: { $in: usernames } })
            : [];
        const studiosByUsername = new Map(studios.map((studio) => [studio.owner_username, studio]));
        result.sales_statuses = (result.sales_statuses || []).map((sale) => {
            const studio = studiosByUsername.get(sale.photographer_username);
            return {
                ...sale,
                photographer: {
                    username: sale.photographer_username,
                    whatsapp: studio?.whatsapp || "",
                    paymentInfo: studio?.paymentInfo?.toObject?.() || studio?.paymentInfo || emptyPaymentInfo(),
                },
            };
        });
        return result;
    }


    async getPhotographerSales(username, isAdmin = false) {
        const photographerPhotos = await this.photoRepo.find(isAdmin ? {} : { owner_username: username }).select("_id");
        if (!photographerPhotos.length)
            return [];
        const photographer = isAdmin
            ? null
            : await this.userRepo.findOne({ user_name: username }).select("_id user_name");
        const orders = await this.orderRepo.find({
            photos: { $in: photographerPhotos.map((photo) => photo._id) },
        }).populate("photos").sort({ created_at: -1 });
        const customerUsernames = [...new Set(orders.map((order) => order.username))];
        const customers = await this.userRepo.find({ user_name: { $in: customerUsernames } })
            .select("user_name display_name email phone");
        const customersByUsername = new Map(customers.map((customer) => [customer.user_name, customer]));
        return orders.flatMap((order) => {
            const photos = isAdmin ? order.photos.filter(Boolean) : order.photos.filter((photo) => photo?.owner_username === username);
            if (!photos.length) return [];
            const grossTotal = order.photos.reduce((sum, photo) => sum + (photo?.price || 0), 0);
            const photographerGross = photos.reduce((sum, photo) => sum + (photo.price || 0), 0);
            const share = grossTotal > 0 ? photographerGross / grossTotal : 0;
            const sale = order.sales_statuses?.find(
                (saleStatus) => saleStatus.photographer_username === username
            );
            const result = order.toObject();
            if (!isAdmin) {
                result.sales_statuses = sale
                    ? result.sales_statuses.filter((saleStatus) => saleStatus.photographer_username === username)
                        .map((saleStatus) => ({
                            ...saleStatus,
                            photographerId: saleStatus.photographerId || photographer?._id || null,
                        }))
                    : [{
                        photographerId: photographer?._id || null,
                        photographer_username: username,
                        subtotal: Math.max(0, Number((order.total * share).toFixed(2))),
                        discount_total: Number(((order.discount_total || 0) * share).toFixed(2)),
                        status: "pending",
                        receipt: { hasFile: false, sentViaWhatsapp: false },
                        rejectionReason: "",
                        paidAt: null,
                    }];
                const saleId = sale?.photographerId || photographer?._id
                    ? String(sale?.photographerId || photographer?._id)
                    : null;
                result.events = result.events.filter((event) =>
                    !event.photographerId || (saleId && String(event.photographerId) === saleId)
                );
            }
            return [{
                ...result,
                photos,
                status: sale?.status || (isAdmin ? order.status : "pending"),
                customer: customersByUsername.get(order.username) || {
                    user_name: order.username,
                    display_name: order.username,
                    email: "",
                    phone: "",
                },
                total: sale && (sale.subtotal > 0 || order.total === 0)
                    ? sale.subtotal
                    : Math.max(0, Number((order.total * share).toFixed(2))),
                discount_total: sale && (sale.subtotal > 0 || order.total === 0)
                    ? sale.discount_total
                    : Number(((order.discount_total || 0) * share).toFixed(2)),
            }];
        });
    }

    async getById(id, username) {
        if (!mongoose.isValidObjectId(id))
            throw fail("El identificador del pedido no es válido.", 400);
        const order = await this.orderRepo.findById(id).populate("photos");
        if (!order || (username && order.username !== username))
            throw fail("Pedido no encontrado", 404);
        return this.addPhotographerPaymentInfo(order);
    }

    async getActor(username) {
        const actor = await this.userRepo.findOne({ user_name: username }).select("_id");
        if (!actor)
            throw fail("La sesión no corresponde a un usuario activo.", 401);
        return actor;
    }

    async ensureSalesStatuses(order, actor, actorRole) {
        await order.populate("photos");
        const groups = groupByPhotographer(order.photos);
        const missingGroups = groups.filter((group) => !order.sales_statuses.some(
            (sale) => sale.photographer_username === group.photographer_username
        ));
        const photographers = groups.length
            ? await this.userRepo.find({
                user_name: { $in: groups.map((group) => group.photographer_username) },
            }).select("_id user_name")
            : [];
        const photographerIds = new Map(photographers.map((photographer) => [
            photographer.user_name,
            photographer._id,
        ]));
        let changed = false;
        for (const sale of order.sales_statuses) {
            if (sale.photographerId) continue;
            const photographerId = photographerIds.get(sale.photographer_username);
            if (!photographerId) continue;
            sale.photographerId = photographerId;
            changed = true;
        }
        if (!missingGroups.length && !changed) return order;

        const subtotals = allocateAmount(order.total, groups);
        const discounts = allocateAmount(order.discount_total, groups);
        for (const group of missingGroups) {
            const index = groups.indexOf(group);
            const photographerId = photographerIds.get(group.photographer_username) || null;
            order.sales_statuses.push({
                photographerId,
                photographer_username: group.photographer_username,
                subtotal: subtotals[index],
                discount_total: discounts[index],
                status: "pending",
                paidAt: null,
            });
            order.events.push(createEvent(
                "SALE_INITIALIZED",
                actor._id,
                actorRole,
                photographerId,
                "Venta asociada a un pedido preexistente."
            ));
        }
        try {
            await order.save();
            return order;
        } catch (error) {
            if (error.name !== "VersionError") throw error;
            const latest = await this.orderRepo.findById(order._id).populate("photos");
            if (latest && missingGroups.every((group) => latest.sales_statuses.some(
                (item) => item.photographer_username === group.photographer_username
            )))
                return latest;
            throw fail("El pedido cambió mientras se inicializaban las ventas. Volvé a intentar.", 409);
        }
    }

    async getPhotographerById(id) {
        if (!mongoose.isValidObjectId(id))
            throw fail("El identificador del fotógrafo no es válido.", 400);
        const photographer = await this.userRepo.findById(id).select("_id user_name");
        if (!photographer)
            throw fail("Fotógrafo no encontrado.", 404);
        return photographer;
    }

    async getSaleForPhotographer(order, photographer) {
        return order.sales_statuses.find((sale) =>
            sale.photographer_username === photographer.user_name
            || (sale.photographerId && String(sale.photographerId) === String(photographer._id))
        );
    }

    async loadBuyerSale(orderId, photographerId, username, actorRole, actor) {
        if (!mongoose.isValidObjectId(orderId))
            throw fail("El identificador del pedido no es válido.", 400);
        const order = await this.orderRepo.findById(orderId).populate("photos");
        if (!order || order.username !== username)
            throw fail("Pedido no encontrado.", 404);
        const photographer = await this.getPhotographerById(photographerId);
        await this.ensureSalesStatuses(order, actor, actorRole);
        const sale = await this.getSaleForPhotographer(order, photographer);
        if (!sale)
            throw fail("La sub-venta no pertenece a este pedido.", 404);
        return { order, photographer, sale };
    }

    async updateSaleAtomically(orderId, photographerUsername, allowedStatuses, updates, event) {
        const statuses = Array.isArray(allowedStatuses) ? allowedStatuses : [allowedStatuses];
        const result = await this.orderRepo.updateOne({
            _id: orderId,
            sales_statuses: {
                $elemMatch: {
                    photographer_username: photographerUsername,
                    status: { $in: statuses },
                },
            },
        }, {
            $set: Object.fromEntries(Object.entries(updates).map(([field, value]) => [
                `sales_statuses.$[sale].${field}`,
                value,
            ])),
            $push: { events: event },
        }, {
            arrayFilters: [
                {
                    "sale.photographer_username": photographerUsername,
                    "sale.status": { $in: statuses },
                },
            ],
            runValidators: true,
        });
        if (!result.matchedCount)
            throw fail("La venta cambió o ya no admite esta acción. Actualizá e intentá nuevamente.", 409);
    }

    async create(username, photoIds, couponCode, actorRole = "customer") {
        if (!Array.isArray(photoIds) || photoIds.length === 0
            || photoIds.some((photoId) => !mongoose.isValidObjectId(photoId))
            || new Set(photoIds.map(String)).size !== photoIds.length)
            throw fail("Debe incluir identificadores válidos y únicos de fotos.", 400);
        const actor = await this.getActor(username);

        // Buscar las fotos y calcular el total
        const photos = await this.photoRepo.find({
            _id: { $in: photoIds },
            available: true,
            $or: [{ type: "video" }, { type: "photo", preview_protected: true }],
        });

        if (photos.length !== photoIds.length)
            throw Object.assign(new Error("Una o más fotos no existen o no están disponibles"), { status: 400 });

        const albums = await this.albumRepo.find({
            _id: { $in: photos.map((photo) => photo.album_id).filter(Boolean) },
        });
        const albumsById = new Map(albums.map((album) => [String(album._id), album]));
        const groups = new Map();
        for (const photo of photos) {
            const album = albumsById.get(String(photo.album_id));
            const type = photo.type === "video" ? "video" : "photo";
            const key = `${String(photo.album_id || "none")}:${type}`;
            const group = groups.get(key) || { album, type, photos: [] };
            group.photos.push(photo);
            groups.set(key, group);
        }

        const grossTotal = photos.reduce((sum, photo) => sum + photo.price, 0);
        let subtotal = 0;
        for (const group of groups.values()) {
            const { album, type, photos: groupedPhotos } = group;
            const quantity = groupedPhotos.length;
            const discountPercent = Number(album?.[`${type}_discount_percent`] || 0);
            const minQuantity = Number(album?.[`${type}_discount_min_quantity`] || 1);
            const contentType = type === "video" ? "videos" : "photos";
            const quantityDiscount = (album?.quantity_discounts || [])
                .filter((discount) => discount.active && discount.content_type === contentType)
                .flatMap((discount) => discount.tiers || [])
                .filter((tier) => quantity >= tier.min_quantity)
                .reduce((highest, tier) => Math.max(highest, Number(tier.discount_percent)), 0);
            const effectiveDiscount = Math.max(
                quantity >= minQuantity ? discountPercent : 0,
                quantityDiscount
            );
            const packageQuantity = Number(album?.[`${type}_package_quantity`] || 0);
            const packagePrice = Number(album?.[`${type}_package_price`] || 0);
            const discountedPrice = (price) => effectiveDiscount > 0
                ? price * (1 - effectiveDiscount / 100)
                : price;
            if (packageQuantity > 0 && packagePrice > 0 && quantity >= packageQuantity) {
                const packageCount = Math.floor(quantity / packageQuantity);
                const remainder = quantity % packageQuantity;
                const remainderTotal = groupedPhotos.slice(0, remainder)
                    .reduce((sum, photo) => sum + discountedPrice(photo.price), 0);
                subtotal += packageCount * packagePrice + remainderTotal;
            } else {
                subtotal += groupedPhotos.reduce((sum, photo) => sum + discountedPrice(photo.price), 0);
            }
        }

        let coupon = null;
        let couponDiscount = 0;
        if (couponCode) {
            const normalizedCode = typeof couponCode === "string" ? couponCode.trim().toUpperCase() : "";
            const couponOwner = photos.find((photo) => photo.owner_username)?.owner_username;
            const owners = [...new Set(photos.map((photo) => photo.owner_username).filter(Boolean))];
            if (!normalizedCode || !couponOwner)
                throw Object.assign(new Error("El cupón no es válido para estas fotos."), { status: 400 });
            coupon = await this.couponRepo.findOne({ code: normalizedCode, owner_username: { $in: owners }, active: true });
            if (!coupon || (coupon.expires_at && coupon.expires_at <= new Date())
                || (coupon.max_uses && coupon.used_count >= coupon.max_uses))
                throw Object.assign(new Error("El cupón no existe, venció o alcanzó su límite de usos."), { status: 400 });
            const eligiblePhotos = photos.filter((photo) =>
                photo.owner_username === coupon.owner_username
                && (!coupon.album_id || String(photo.album_id) === String(coupon.album_id))
            );
            if (!eligiblePhotos.length)
                throw Object.assign(new Error("El cupón no aplica a las fotos seleccionadas."), { status: 400 });
            const eligibleGross = eligiblePhotos.reduce((sum, photo) => sum + photo.price, 0);
            const eligibleSubtotal = grossTotal > 0 ? subtotal * eligibleGross / grossTotal : 0;
            couponDiscount = coupon.discount_type === "percentage"
                ? eligibleSubtotal * coupon.value / 100
                : Math.min(eligibleSubtotal, coupon.value);
            if (coupon.max_discount_amount)
                couponDiscount = Math.min(couponDiscount, coupon.max_discount_amount);
        }
        const total = Math.max(0, Number((subtotal - couponDiscount).toFixed(2)));
        if (photos.some((photo) => !photo.owner_username))
            throw fail("Una foto del pedido no tiene un fotógrafo asignado.", 409);
        const saleGroups = groupByPhotographer(photos);
        const photographers = saleGroups.length
            ? await this.userRepo.find({
                user_name: { $in: saleGroups.map((group) => group.photographer_username) },
            }).select("_id user_name")
            : [];
        if (photographers.length !== saleGroups.length)
            throw fail("No se encontró la cuenta de uno de los fotógrafos del pedido.", 409);
        const photographerIds = new Map(photographers.map((photographer) => [
            photographer.user_name,
            photographer._id,
        ]));
        const allocatedSubtotals = allocateAmount(total, saleGroups);
        const allocatedDiscounts = allocateAmount(grossTotal - total, saleGroups);
        const salesStatuses = saleGroups.map((group, index) => ({
            photographerId: photographerIds.get(group.photographer_username) || null,
            photographer_username: group.photographer_username,
            subtotal: allocatedSubtotals[index],
            discount_total: allocatedDiscounts[index],
            status: "pending",
        }));
        const events = [
            createEvent("ORDER_CREATED", actor._id, actorRole, null, "Pedido creado por el cliente."),
            ...salesStatuses.map((sale) => createEvent(
                "SALE_CREATED",
                actor._id,
                actorRole,
                sale.photographerId,
                "Sub-venta creada en estado pendiente."
            )),
        ];
        const order = await this.orderRepo.create({
            username,
            photos: photos.map((photo) => photo._id),
            total,
            discount_total: Number((grossTotal - total).toFixed(2)),
            coupon_code: coupon?.code || null,
            sales_statuses: salesStatuses,
            events,
        });
        if (coupon) {
            const usageFilter = {
                _id: coupon._id,
                active: true,
                ...(coupon.max_uses ? { used_count: { $lt: coupon.max_uses } } : {}),
            };
            const usedCoupon = await this.couponRepo.findOneAndUpdate(
                usageFilter,
                { $inc: { used_count: 1 } },
                { new: true, runValidators: true }
            );
            if (!usedCoupon) {
                await this.orderRepo.findByIdAndDelete(order._id);
                throw Object.assign(new Error("El cupón alcanzó su límite de usos. Volvé a intentar sin él."), { status: 409 });
            }
        }
        return order;
    }

    async updateStatus(id, status, username, actorRole) {
        if (!mongoose.isValidObjectId(id))
            throw fail("El identificador del pedido no es válido.", 400);
        if (!["pending", "paid", "delivered"].includes(status))
            throw fail("El estado del pedido debe ser pending, paid o delivered.", 400);
        const actor = await this.getActor(username);
        const order = await this.orderRepo.findById(id);
        if (!order)
            throw fail("Pedido no encontrado.", 404);
        if (order.status === status)
            return order.populate("photos");
        const allowed = (order.status === "pending" && status === "paid")
            || (order.status === "paid" && status === "delivered");
        if (!allowed)
            throw fail("El pedido solo puede pasar de pendiente a pagado y de pagado a entregado.", 409);

        const updated = await this.orderRepo.findOneAndUpdate(
            { _id: id, status: order.status },
            {
                $set: { status },
                $push: {
                    events: createEvent(
                        "ORDER_STATUS_CHANGED",
                        actor._id,
                        actorRole,
                        null,
                        `Estado global del pedido actualizado a ${status}.`
                    ),
                },
            },
            { new: true, runValidators: true }
        );
        if (!updated)
            throw fail("El pedido cambió mientras se actualizaba. Volvé a intentar.", 409);
        return updated.populate("photos");
    }

    async submitReceipt(orderId, photographerId, username, actorRole, file) {
        if (!file)
            throw fail("Adjuntá un comprobante.", 400);
        const actor = await this.getActor(username);
        const { order, photographer, sale } = await this.loadBuyerSale(
            orderId,
            photographerId,
            username,
            actorRole,
            actor
        );
        const allowedStatuses = ["pending", "rejected"];
        if (!allowedStatuses.includes(sale.status))
            throw fail("Solo se puede adjuntar un comprobante si la venta está pendiente o rechazada.", 409);

        const previousReceiptPath = sale.receipt?.filePath;
        const receipt = await saveReceipt(file);
        try {
            await this.updateSaleAtomically(
                order._id,
                photographer.user_name,
                allowedStatuses,
                {
                    status: "receipt_sent",
                    photographerId: photographer._id,
                    rejectionReason: "",
                    receipt,
                },
                createEvent(
                    "RECEIPT_UPLOADED",
                    actor._id,
                    actorRole,
                    photographer._id,
                    "El cliente adjuntó un comprobante de pago."
                )
            );
        } catch (error) {
            try {
                await removeReceipt(receipt.filePath);
            } catch (cleanupError) {
                console.error("No se pudo limpiar un comprobante que no llegó a asociarse al pedido:", cleanupError);
            }
            throw error;
        }
        if (previousReceiptPath) {
            try {
                await removeReceipt(previousReceiptPath);
            } catch (cleanupError) {
                console.error("No se pudo eliminar el comprobante reemplazado:", cleanupError);
            }
        }
        return {
            order_id: String(order._id),
            photographerId: String(photographer._id),
            status: "receipt_sent",
            receipt: {
                hasFile: true,
                mimeType: receipt.mimeType,
                originalName: receipt.originalName,
                uploadedAt: receipt.uploadedAt,
                sentViaWhatsapp: false,
            },
        };
    }

    async registerWhatsappNotice(orderId, photographerId, username, actorRole) {
        const actor = await this.getActor(username);
        const { order, photographer, sale } = await this.loadBuyerSale(
            orderId,
            photographerId,
            username,
            actorRole,
            actor
        );
        const allowedStatuses = ["pending", "rejected"];
        if (!allowedStatuses.includes(sale.status))
            throw fail("Solo se puede avisar un envío por WhatsApp si la venta está pendiente o rechazada.", 409);
        const studio = await this.studioRepo.findOne({ owner_username: photographer.user_name });
        if (!studio?.whatsapp)
            throw fail("El fotógrafo no configuró un número de WhatsApp.", 409);

        const previousReceiptPath = sale.receipt?.filePath;
        const receipt = {
            filePath: null,
            mimeType: null,
            originalName: null,
            uploadedAt: new Date(),
            sentViaWhatsapp: true,
        };
        await this.updateSaleAtomically(
            order._id,
            photographer.user_name,
            allowedStatuses,
            {
                status: "receipt_sent",
                photographerId: photographer._id,
                rejectionReason: "",
                receipt,
            },
            createEvent(
                "WHATSAPP_NOTICE",
                actor._id,
                actorRole,
                photographer._id,
                "El cliente informó que envió el comprobante por WhatsApp."
            )
        );
        if (previousReceiptPath) {
            try {
                await removeReceipt(previousReceiptPath);
            } catch (cleanupError) {
                console.error("No se pudo eliminar el comprobante reemplazado por un aviso de WhatsApp:", cleanupError);
            }
        }
        return {
            order_id: String(order._id),
            photographerId: String(photographer._id),
            status: "receipt_sent",
            receipt: { hasFile: false, sentViaWhatsapp: true, uploadedAt: receipt.uploadedAt },
        };
    }

    async getReceipt(orderId, photographerId, session) {
        if (!mongoose.isValidObjectId(orderId))
            throw fail("El identificador del pedido no es válido.", 400);
        const order = await this.orderRepo.findById(orderId);
        if (!order)
            throw fail("Pedido no encontrado.", 404);
        if (session.role === "customer" && order.username !== session.username)
            throw fail("Pedido no encontrado.", 404);
        const photographer = await this.getPhotographerById(photographerId);
        const sale = await this.getSaleForPhotographer(order, photographer);
        if (!sale)
            throw fail("La sub-venta no pertenece a este pedido.", 404);
        const authorized = session.role === "admin"
            || (session.role === "customer" && order.username === session.username)
            || (session.role === "photographer" && photographer.user_name === session.username);
        if (!authorized)
            throw fail("No tenés permiso para consultar este comprobante.", 403);
        if (!sale.receipt?.filePath)
            throw fail("Esta venta no tiene un comprobante adjunto.", 404);
        const extension = extname(sale.receipt.filePath).toLowerCase();
        const mimeType = mimeTypeForReceipt(extension);
        if (!mimeType || sale.receipt.mimeType !== mimeType)
            throw fail("El comprobante tiene metadatos de archivo no válidos.", 404);
        try {
            await assertReceiptExists(sale.receipt.filePath);
        } catch (error) {
            if (error.code === "ENOENT")
                throw fail("El archivo del comprobante no está disponible.", 404);
            throw error;
        }
        return {
            receipt: {
                filePath: sale.receipt.filePath,
                mimeType,
                originalName: sale.receipt.originalName,
                uploadedAt: sale.receipt.uploadedAt,
            },
            stream: openReceipt(sale.receipt.filePath),
        };
    }

    async prepareOriginalDownload(orderId, photoId, username, actorRole) {
        if (!mongoose.isValidObjectId(orderId) || !mongoose.isValidObjectId(photoId))
            throw fail("El identificador del pedido o de la foto no es válido.", 400);
        const actor = await this.getActor(username);
        const order = await this.orderRepo.findById(orderId);
        if (!order || (actorRole !== "admin" && order.username !== username))
            throw fail("Pedido no encontrado.", 404);
        if (!order.photos.some((item) => String(item) === String(photoId)))
            throw fail("La foto no pertenece a este pedido.", 404);
        const photo = await this.photoRepo.findById(photoId).select("+original_file_path");
        if (!photo || photo.type !== "photo" || !photo.preview_protected || !photo.original_file_path)
            throw fail("El original no está disponible.", 404);
        await this.ensureSalesStatuses(order, actor, actorRole);
        const sale = order.sales_statuses.find(
            (item) => item.photographer_username === photo.owner_username
        );
        if (!sale || !["paid", "delivered"].includes(sale.status))
            throw fail("El original se habilita cuando la sub-venta del fotógrafo está abonada.", 403);

        const path = getOriginalPhotoPath(photo.original_file_path);
        try {
            await stat(path);
        } catch (error) {
            if (error.code === "ENOENT")
                throw fail("El archivo original no está disponible.", 404);
            throw error;
        }
        const event = createEvent(
            "DOWNLOAD",
            actor._id,
            actorRole,
            sale.photographerId,
            "El cliente descargó el original.",
            photo._id
        );
        const result = await this.orderRepo.updateOne({
            _id: order._id,
            photos: photo._id,
            ...(actorRole === "admin" ? {} : { username }),
            sales_statuses: {
                $elemMatch: {
                    photographer_username: photo.owner_username,
                    status: { $in: ["paid", "delivered"] },
                },
            },
        }, { $push: { events: event } }, { runValidators: true });
        if (!result.matchedCount)
            throw fail("El pago cambió o el permiso de descarga venció. Volvé a intentar.", 403);

        const extension = extname(photo.original_file_path).toLowerCase();
        const mimeType = mimeTypeForImage(extension);
        if (!mimeType)
            throw fail("El formato del original no es compatible.", 404);
        return {
            path,
            contentType: mimeType,
            fileName: `${photo._id}${extension}`,
        };
    }

    async updatePhotographerSaleStatus(
        id,
        username,
        status,
        reason = "",
        actorRole = "photographer",
        photographerId,
        photographerUsername
    ) {
        if (!mongoose.isValidObjectId(id))
            throw fail("El identificador del pedido no es válido.", 400);
        if (!["pending", "paid", "rejected", "delivered", "cancelled"].includes(status))
            throw fail("El estado de la venta no es válido.", 400);
        if (status === "cancelled" && actorRole !== "admin")
            throw fail("Solo un administrador puede cancelar una venta.", 403);
        if (status === "rejected" && (typeof reason !== "string" || !reason.trim() || reason.trim().length > 1000))
            throw fail("Indicá un motivo de rechazo de hasta 1000 caracteres.", 400);

        const actor = await this.getActor(username);
        const order = await this.orderRepo.findById(id).populate("photos");
        if (!order)
            throw fail("Venta no encontrada.", 404);
        await this.ensureSalesStatuses(order, actor, actorRole);

        let photographer;
        if (actorRole === "admin") {
            if (photographerId) {
                photographer = await this.getPhotographerById(photographerId);
            } else if (photographerUsername) {
                if (typeof photographerUsername !== "string")
                    throw fail("El fotógrafo indicado no es válido.", 400);
                photographer = await this.userRepo.findOne({ user_name: photographerUsername }).select("_id user_name");
            } else if (order.sales_statuses.length === 1) {
                photographer = await this.userRepo.findOne({
                    user_name: order.sales_statuses[0].photographer_username,
                }).select("_id user_name");
            }
            if (!photographer)
                throw fail("Indicá el fotógrafo de la sub-venta que querés actualizar.", 400);
        } else {
            photographer = { _id: actor._id, user_name: username };
        }

        const sale = await this.getSaleForPhotographer(order, photographer);
        if (!sale)
            throw fail("Venta no encontrada.", 404);
        const currentStatus = sale.status || "pending";
        if (status === currentStatus)
            return { order_id: String(order._id), photographerId: String(photographer._id), status };
        if (status === "pending")
            throw fail("No se puede volver una venta a pendiente.", 409);
        if (status === "paid" && currentStatus !== "receipt_sent")
            throw fail("La venta debe tener un comprobante o aviso de WhatsApp antes de abonarse.", 409);
        if (status === "rejected" && currentStatus !== "receipt_sent")
            throw fail("Solo se puede rechazar un comprobante recibido.", 409);
        if (status === "delivered" && currentStatus !== "paid")
            throw fail("La venta debe estar abonada antes de marcarse como entregada.", 409);
        if (status === "cancelled" && (
            ["paid", "delivered"].includes(currentStatus)
            || sale.paidAt
            || !["pending", "receipt_sent", "rejected"].includes(currentStatus)
        ))
            throw fail("Solo se puede cancelar una venta antes del pago.", 409);

        const updates = {
            status,
            photographerId: sale.photographerId || photographer._id,
        };
        if (status === "paid") {
            updates.paidAt = new Date();
            updates.rejectionReason = "";
        }
        if (status === "rejected")
            updates.rejectionReason = reason.trim();
        const note = status === "rejected"
            ? reason.trim()
            : status === "cancelled"
                ? "Venta cancelada por un administrador antes del pago."
                : `Estado de la venta actualizado a ${status}.`;
        await this.updateSaleAtomically(
            order._id,
            photographer.user_name,
            currentStatus,
            updates,
            createEvent(`SALE_${status.toUpperCase()}`, actor._id, actorRole, photographer._id, note)
        );
        return { order_id: String(order._id), photographerId: String(photographer._id), status };
    }
}