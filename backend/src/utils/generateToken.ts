// src/utils/generateToken.ts
import jwt from 'jsonwebtoken';

// Hàm tạo JWT token
export const generateToken = (id: number): string => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET không được định nghĩa trong .env');
    }

    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d', // Token có hiệu lực 30 ngày
    });
};