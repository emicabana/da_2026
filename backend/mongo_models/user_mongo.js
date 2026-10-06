import mongoose from "mongoose";
import { ROLES, VALID_ROLES } from "../roles.js";
import { USERNAME_PATTERN } from "../validation.js";

export default mongoose.model("User", new mongoose.Schema({
    user_name: { type: String, required: true, unique: true, match: USERNAME_PATTERN },
    password: { type: String, required: true },
    display_name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: { type: String, enum: VALID_ROLES, default: ROLES.CUSTOMER }
}));