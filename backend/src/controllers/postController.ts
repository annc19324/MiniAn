// src/controllers/postController.ts
import { Request, Response } from 'express';
import { prisma } from '../server';
import { AuthRequest } from '../middleware/authMiddleware';
import { uploadMedia } from '../utils/upload';

// Tạo bài viết
export const createPost = async (req: AuthRequest, res: Response) => {
    const { content } = req.body;
    const file = req.file;

    try {
        let imageUrl: string | undefined;

        if (file) {
            const uploadRes = await uploadMedia(file);
            imageUrl = uploadRes.url;
        }

        const post = await prisma.post.create({
            data: {
                content,
                image: imageUrl,
                authorId: req.user!.id,
            },
            include: {
                author: {
                    select: { id: true, username: true, fullName: true, avatar: true },
                },
            },
        });

        res.status(201).json({ message: 'Đăng bài thành công', post });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi tạo bài viết', error });
    }
};

// Lấy feed (bài viết của bản thân + người đang follow)
export const getFeed = async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    try {
        const posts = await prisma.post.findMany({
            where: {
                author: {
                    following: {
                        some: {
                            followerId: userId
                        }
                    }
                }
            },
            include: {
                author: {
                    select: { id: true, username: true, fullName: true, avatar: true },
                },
                likes: { select: { userId: true } },
                comments: {
                    include: {
                        author: { select: { username: true, fullName: true, avatar: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                },
                _count: { select: { likes: true, comments: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 20, // pagination sau này mở rộng
        });

        res.json({ posts });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy feed', error });
    }
};

// Like / Unlike
export const toggleLike = async (req: AuthRequest, res: Response) => {
    const { postId } = req.params;
    const userId = req.user!.id;

    try {
        const existingLike = await prisma.like.findUnique({
            where: { postId_userId: { postId: Number(postId), userId } },
        });

        if (existingLike) {
            await prisma.like.delete({
                where: { id: existingLike.id },
            });
            res.json({ message: 'Đã unlike' });
        } else {
            await prisma.like.create({
                data: { postId: Number(postId), userId },
            });

            // Tạo notification (nếu không phải tự like)
            const post = await prisma.post.findUnique({ where: { id: Number(postId) } });
            if (post?.authorId !== userId) {
                const notif = await prisma.notification.create({
                    data: {
                        type: 'like',
                        content: `${req.user?.username} đã thích bài viết của bạn`,
                        userId: post!.authorId,
                        senderId: userId,
                        postId: Number(postId),
                    },
                });

                // Socket Emit
                const { io } = require('../server'); // Dynamic require to avoid circular dependency
                io.to(post!.authorId.toString()).emit('new_notification', notif);
            }

            res.json({ message: 'Đã like' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Lỗi like', error });
    }
};

// Comment
export const createComment = async (req: AuthRequest, res: Response) => {
    const { postId } = req.params;
    const { content, parentId } = req.body;
    const userId = req.user!.id;
    const file = req.file;

    try {
        let imageUrl: string | undefined;

        if (file) {
            // Comments only support images
            if (!file.mimetype.startsWith('image/')) {
                return res.status(400).json({ message: 'Bình luận chỉ hỗ trợ ảnh' });
            }
            const uploadRes = await uploadMedia(file);
            imageUrl = uploadRes.url;
        }

        const comment = await prisma.comment.create({
            data: {
                content: content || '', // Content can be empty if there is an image
                image: imageUrl,
                postId: Number(postId),
                authorId: userId,
                parentId: parentId ? Number(parentId) : undefined,
            },
            include: {
                author: { select: { username: true, fullName: true, avatar: true } },
            },
        });

        // Tạo notification
        const post = await prisma.post.findUnique({ where: { id: Number(postId) } });
        if (post?.authorId !== userId) {
            const notif = await prisma.notification.create({
                data: {
                    type: 'comment',
                    content: `${req.user?.username} đã bình luận bài viết của bạn`,
                    userId: post!.authorId,
                    senderId: userId,
                    postId: Number(postId),
                    commentId: comment.id,
                },
            });

            // Socket Emit
            const { io } = require('../server');
            io.to(post!.authorId.toString()).emit('new_notification', notif);
        }

        res.status(201).json({ message: 'Bình luận thành công', comment });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi bình luận', error });
    }
};

// Lấy bài viết của một user cụ thể
export const getUserPosts = async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;
    console.log(`[getUserPosts] Request for UserId: ${userId}`);

    try {
        const posts = await prisma.post.findMany({
            where: { authorId: Number(userId) },
            include: {
                author: {
                    select: { id: true, username: true, fullName: true, avatar: true },
                },
                likes: { select: { userId: true } },
                comments: {
                    include: {
                        author: { select: { username: true, fullName: true, avatar: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                },
                _count: { select: { likes: true, comments: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        console.log(`[getUserPosts] Found ${posts.length} posts for UserId: ${userId}`);
        res.json(posts);
    } catch (error) {
        console.error('[getUserPosts] Error:', error);
        res.status(500).json({ message: 'Lỗi lấy bài viết user', error: String(error) });
    }
};

// Lấy chi tiết một bài viết
export const getPostById = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    try {
        const post = await prisma.post.findUnique({
            where: { id: Number(id) },
            include: {
                author: {
                    select: { id: true, username: true, fullName: true, avatar: true },
                },
                likes: { select: { userId: true } },
                comments: {
                    include: {
                        author: { select: { username: true, fullName: true, avatar: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 3, // Initial load limit
                },
                _count: { select: { likes: true, comments: true } },
            },
        });

        if (!post) {
            return res.status(404).json({ message: 'Không tìm thấy bài viết' });
        }

        res.json(post);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy bài viết', error });
    }
};

// ... (keep other functions like deletePost, updatePost)

export const deletePost = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    try {
        const post = await prisma.post.findUnique({ where: { id: Number(id) } });
        if (!post) return res.status(404).json({ message: 'Không tìm thấy bài viết' });

        if (post.authorId !== userId && req.user?.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Không có quyền xóa bài viết này' });
        }

        // Delete associated notifications/likes/comments first if strict relational integrity isn't set to Cascade
        // But Prisma usually handles Cascade if configured. Let's assume database level cascade or manually delete.
        // For safety/standard:
        await prisma.like.deleteMany({ where: { postId: Number(id) } });
        await prisma.comment.deleteMany({ where: { postId: Number(id) } });
        await prisma.notification.deleteMany({ where: { postId: Number(id) } });

        await prisma.post.delete({ where: { id: Number(id) } });

        res.json({ message: 'Đã xóa bài viết' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi xóa bài viết', error });
    }
};

// Sửa bài viết
export const updatePost = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user!.id;

    try {
        const post = await prisma.post.findUnique({ where: { id: Number(id) } });
        if (!post) return res.status(404).json({ message: 'Không tìm thấy bài viết' });

        if (post.authorId !== userId) {
            return res.status(403).json({ message: 'Không có quyền sửa bài viết này' });
        }

        const updatedPost = await prisma.post.update({
            where: { id: Number(id) },
            data: { content },
            include: {
                author: {
                    select: { id: true, username: true, fullName: true, avatar: true },
                },
                likes: { select: { userId: true } },
                comments: true,
                _count: { select: { likes: true, comments: true } },
            },
        });

        res.json(updatedPost);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi cập nhật bài viết', error });
    }
};

// Lấy danh sách bình luận (Phân trang)
export const getComments = async (req: AuthRequest, res: Response) => {
    const { postId } = req.params;
    const { cursor, limit = 10 } = req.query;

    try {
        const comments = await prisma.comment.findMany({
            where: { postId: Number(postId) },
            include: {
                author: { select: { username: true, fullName: true, avatar: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: Number(limit),
            skip: cursor ? 1 : 0,
            cursor: cursor ? { id: Number(cursor) } : undefined,
        });

        res.json(comments);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy bình luận', error });
    }
};

