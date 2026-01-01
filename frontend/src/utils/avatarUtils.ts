// src/utils/avatarUtils.ts

/**
 * Generate avatar URL based on:
 * 1. If no avatar, return UI Avatars placeholder
 * 2. If it's a full Cloudinary URL (starts with http), return as is
 * 3. If it's default-avatar.jpg, return from backend static uploads
 * 4. Otherwise assume it's a relative path in uploads folder
 */
export const getAvatarUrl = (avatar: string | undefined, username?: string): string => {
    // No avatar provided, use UI Avatars placeholder
    if (!avatar) {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(username || 'User')}&background=random&color=fff&length=1`;
    }

    // Full URL (Cloudinary or other CDN), return as is
    if (avatar.startsWith('http')) {
        return avatar;
    }

    // Default avatar - special case for new users without custom avatars
    if (avatar === 'default-avatar.jpg' || avatar === 'default-avatar.png') {
        const baseUrl = (import.meta.env.VITE_API_URL || '').replace('/api', '');
        return `${baseUrl}/uploads/default-avatar.jpg`;
    }

    // Any other relative path (legacy or future use), assume it's in uploads folder
    const baseUrl = (import.meta.env.VITE_API_URL || '').replace('/api', '');
    return `${baseUrl}/uploads/${avatar}`;
};
