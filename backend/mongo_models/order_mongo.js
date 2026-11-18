import mongoose from "mongoose";

const saleStatuses = ["pending", "receipt_sent", "paid", "rejected", "delivered", "cancelled"];

const receiptSchema = new mongoose.Schema({
    filePath: { type: String, default: null },
    mimeType: { type: String, default: null },
    originalName: { type: String, default: null },
    uploadedAt: { type: Date, default: null },
    sentViaWhatsapp: { type: Boolean, default: false },
}, { _id: false });

const photographerSaleSchema = new mongoose.Schema({
    photographerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    photographer_username: { type: String, required: true },
    subtotal: { type: Number, min: 0, default: 0 },
    discount_total: { type: Number, min: 0, default: 0 },
    status: { type: String, enum: saleStatuses, default: "pending" },
    receipt: { type: receiptSchema, default: () => ({}) },
    rejectionReason: { type: String, default: "" },
    paidAt: { type: Date, default: null },
}, { _id: false });

const orderEventSchema = new mongoose.Schema({
    type: { type: String, required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    actorRole: { type: String, enum: ["admin", "photographer", "customer"], required: true },
    photographerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    photoId: { type: mongoose.Schema.Types.ObjectId, ref: "Photo", default: null },
    note: { type: String, default: "", maxlength: 1000 },
    createdAt: { type: Date, default: Date.now },
}, { _id: false });

const orderSchema = new mongoose.Schema({
    username: { type: String, required: true },
    photos: [{ type: mongoose.Schema.Types.ObjectId, ref: "Photo", required: true }],
    total: { type: Number, required: true },
    discount_total: { type: Number, default: 0 },
    coupon_code: { type: String, default: null },
    status: { type: String, enum: ["pending", "paid", "delivered"], default: "pending" },
    sales_statuses: { type: [photographerSaleSchema], default: [] },
    events: { type: [orderEventSchema], default: [] },
    created_at: { type: Date, default: Date.now }
});

for (const method of ["toJSON", "toObject"]) {
    orderSchema.set(method, {
        transform(document, result) {
            for (const sale of result.sales_statuses || []) {
                if (!sale.receipt) continue;
                sale.receipt.hasFile = Boolean(sale.receipt.filePath);
                delete sale.receipt.filePath;
            }
            return result;
        },
    });
}

export default mongoose.model("Order", orderSchema);