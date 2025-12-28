// src/controllers/postController.ts
import { Request, Response } from 'express';
import { prisma } from '../server';
import { AuthRequest } from '../middleware/authMiddleware';
import { uploadImage } from '../utils/upload';

// Tạo bài viết
export const createPost = async (req: AuthRequest, res: Response) => {
    const { content } = req.body;
    const file = req.file;

    try {
        let imageUrl: string | undefined;

        if (file) {
            imageUrl = await uploadImage(file);
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
                OR: [
                    { authorId: userId },
                    { author: { followers: { some: { followerId: userId } } } },
                ],
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
                await prisma.notification.create({
                    data: {
                        type: 'like',
                        content: `${req.user?.username} đã thích bài viết của bạn`,
                        userId: post!.authorId,
                        senderId: userId,
                        postId: Number(postId),
                    },
                });
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
    const { content } = req.body;
    const userId = req.user!.id;

    try {
        const comment = await prisma.comment.create({
            data: {
                content,
                postId: Number(postId),
                authorId: userId,
            },
            include: {
                author: { select: { username: true, fullName: true, avatar: true } },
            },
        });

        // Tạo notification
        const post = await prisma.post.findUnique({ where: { id: Number(postId) } });
        if (post?.authorId !== userId) {
            await prisma.notification.create({
                data: {
                    type: 'comment',
                    content: `${req.user?.username} đã bình luận bài viết của bạn`,
                    userId: post!.authorId,
                    senderId: userId,
                    postId: Number(postId),
                    commentId: comment.id,
                },
            });
        }

        res.status(201).json({ message: 'Bình luận thành công', comment });
    } catch (error) {
        res.status(500).json({ error });
    }
};

// Lấy bài viết của một user cụ thể
export const getUserPosts = async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;

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

        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy bài viết user', error });
    }
};