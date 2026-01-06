// src/utils/upload.ts
import { v2 as cloudinary } from 'cloudinary';
import { Request } from 'express';

if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error("Cloudinary config missing!");
}

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadMedia = async (file: Express.Multer.File): Promise<{ url: string, type: 'image' | 'video' }> => {
    return new Promise((resolve, reject) => {
        // Simple check for video mime type
        const isVideo = file.mimetype.startsWith('video/');
        const resourceType = isVideo ? 'video' : 'image';

        cloudinary.uploader.upload_stream(
            {
                resource_type: resourceType,
                folder: isVideo ? 'minian/videos' : 'minian/images'
            },
            (error, result) => {
                if (error) return reject(error);
                resolve({
                    url: result!.secure_url,
                    type: resourceType
                });
            }
        ).end(file.buffer);
    });
};

// Keep backward compatibility if needed, or refactor all usages
export const uploadImage = async (file: Express.Multer.File): Promise<string> => {
    const res = await uploadMedia(file);
    return res.url;
};