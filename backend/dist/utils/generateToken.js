"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = void 0;
// src/utils/generateToken.ts
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Hàm tạo JWT token
const generateToken = (id) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET không được định nghĩa trong .env');
    }
    return jsonwebtoken_1.default.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d', // Token có hiệu lực 30 ngày
    });
};
exports.generateToken = generateToken;
//# sourceMappingURL=generateToken.js.map