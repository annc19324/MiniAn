"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadImage = void 0;
// src/utils/upload.ts
const cloudinary_1 = require("cloudinary");
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error("Cloudinary config missing!");
}
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
const uploadImage = async (file) => {
    return new Promise((resolve, reject) => {
        cloudinary_1.v2.uploader.upload_stream({ resource_type: 'image', folder: 'minian/posts' }, (error, result) => {
            if (error)
                return reject(error);
            resolve(result.secure_url);
        }).end(file.buffer);
    });
};
exports.uploadImage = uploadImage;
//# sourceMappingURL=upload.js.map