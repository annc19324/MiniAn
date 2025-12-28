// src/utils/upload.ts
import { v2 as cloudinary } from 'cloudinary';
import { Request } from 'express';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadImage = async (file: Express.Multer.File): Promise<string> => {
    return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
            { resource_type: 'image', folder: 'minian/posts' },
            (error, result) => {
                if (error) return reject(error);
                resolve(result!.secure_url);
            }
        ).end(file.buffer);
    });
};