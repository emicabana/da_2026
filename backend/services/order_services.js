import { getDependency } from "../dependency.js";

export class OrderService {
    constructor() {
        this.orderRepo = getDependency("orderRepo");
        this.photoRepo = getDependency("photoRepo");
        this.albumRepo = getDependency("albumRepo");
        this.couponRepo = getDependency("couponRepo");
        this.userRepo = getDependency("userRepo");
    }

    async getAll() {
        return await this.orderRepo.find().populate("photos");
    }

    async getByUsername(username) {
        return await this.orderRepo.find({ username }).populate("photos");
    }


    async getPhotographerSales(username, isAdmin = false) {
        const photographerPhotos = await this.photoRepo.find(isAdmin ? {} : { owner_username: username }).select("_id");
        if (!photographerPhotos.length)
            return [];
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
            return [{
                ...order.toObject(),
                photos,
                customer: customersByUsername.get(order.username) || {
                    user_name: order.username,
                    display_name: order.username,
                    email: "",
                    phone: "",
                },
                total: Math.max(0, Number((order.total * share).toFixed(2))),
                discount_total: Number(((order.discount_total || 0) * share).toFixed(2)),
            }];
        });
    }

    async getById(id, username) {
        const order = await this.orderRepo.findById(id).populate("photos");
        if (!order || (username && order.username !== username))
            throw Object.assign(new Error("Pedido no encontrado"), { status: 404 });
        return order;
    }

    async create(username, photoIds, couponCode) {
        if (!photoIds || photoIds.length === 0)
            throw Object.assign(new Error("Debe incluir al menos una foto"), { status: 400 });

        // Buscar las fotos y calcular el total
        const photos = await this.photoRepo.find({ _id: { $in: photoIds }, available: true });

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
        const order = await this.orderRepo.create({
            username,
            photos: photoIds,
            total,
            discount_total: Number((grossTotal - total).toFixed(2)),
            coupon_code: coupon?.code || null,
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

    async updateStatus(id, status) {
        if (!["pending", "paid", "delivered"].includes(status))
            throw Object.assign(new Error("El estado del pedido debe ser pending, paid o delivered"), { status: 400 });
        const updated = await this.orderRepo.findByIdAndUpdate(
            id,
            { status },
            { new: true, runValidators: true }
        );
        if (!updated)
            throw Object.assign(new Error("Pedido no encontrado"), { status: 404 });
        return updated.populate("photos");
    }
}