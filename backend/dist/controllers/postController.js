"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPostById = exports.getUserPosts = exports.createComment = exports.toggleLike = exports.getFeed = exports.createPost = void 0;
const server_1 = require("../server");
const upload_1 = require("../utils/upload");
// Tạo bài viết
const createPost = async (req, res) => {
    const { content } = req.body;
    const file = req.file;
    try {
        let imageUrl;
        if (file) {
            imageUrl = await (0, upload_1.uploadImage)(file);
        }
        const post = await server_1.prisma.post.create({
            data: {
                content,
                image: imageUrl,
                authorId: req.user.id,
            },
            include: {
                author: {
                    select: { id: true, username: true, fullName: true, avatar: true },
                },
            },
        });
        res.status(201).json({ message: 'Đăng bài thành công', post });
    }
    catch (error) {
        res.status(500).json({ message: 'Lỗi tạo bài viết', error });
    }
};
exports.createPost = createPost;
// Lấy feed (bài viết của bản thân + người đang follow)
const getFeed = async (req, res) => {
    const userId = req.user.id;
    try {
        const posts = await server_1.prisma.post.findMany({
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
    }
    catch (error) {
        res.status(500).json({ message: 'Lỗi lấy feed', error });
    }
};
exports.getFeed = getFeed;
// Like / Unlike
const toggleLike = async (req, res) => {
    const { postId } = req.params;
    const userId = req.user.id;
    try {
        const existingLike = await server_1.prisma.like.findUnique({
            where: { postId_userId: { postId: Number(postId), userId } },
        });
        if (existingLike) {
            await server_1.prisma.like.delete({
                where: { id: existingLike.id },
            });
            res.json({ message: 'Đã unlike' });
        }
        else {
            await server_1.prisma.like.create({
                data: { postId: Number(postId), userId },
            });
            // Tạo notification (nếu không phải tự like)
            const post = await server_1.prisma.post.findUnique({ where: { id: Number(postId) } });
            if (post?.authorId !== userId) {
                const notif = await server_1.prisma.notification.create({
                    data: {
                        type: 'like',
                        content: `${req.user?.username} đã thích bài viết của bạn`,
                        userId: post.authorId,
                        senderId: userId,
                        postId: Number(postId),
                    },
                });
                // Socket Emit
                const { io } = require('../server'); // Dynamic require to avoid circular dependency
                io.to(post.authorId.toString()).emit('new_notification', notif);
            }
            res.json({ message: 'Đã like' });
        }
    }
    catch (error) {
        res.status(500).json({ message: 'Lỗi like', error });
    }
};
exports.toggleLike = toggleLike;
// Comment
const createComment = async (req, res) => {
    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;
    try {
        const comment = await server_1.prisma.comment.create({
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
        const post = await server_1.prisma.post.findUnique({ where: { id: Number(postId) } });
        if (post?.authorId !== userId) {
            const notif = await server_1.prisma.notification.create({
                data: {
                    type: 'comment',
                    content: `${req.user?.username} đã bình luận bài viết của bạn`,
                    userId: post.authorId,
                    senderId: userId,
                    postId: Number(postId),
                    commentId: comment.id,
                },
            });
            // Socket Emit
            const { io } = require('../server');
            io.to(post.authorId.toString()).emit('new_notification', notif);
        }
        res.status(201).json({ message: 'Bình luận thành công', comment });
    }
    catch (error) {
        res.status(500).json({ error });
    }
};
exports.createComment = createComment;
// Lấy bài viết của một user cụ thể
const getUserPosts = async (req, res) => {
    const { userId } = req.params;
    console.log(`[getUserPosts] Request for UserId: ${userId}`);
    try {
        const posts = await server_1.prisma.post.findMany({
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
    }
    catch (error) {
        console.error('[getUserPosts] Error:', error);
        res.status(500).json({ message: 'Lỗi lấy bài viết user', error: String(error) });
    }
};
exports.getUserPosts = getUserPosts;
// Lấy chi tiết một bài viết
const getPostById = async (req, res) => {
    const { id } = req.params;
    try {
        const post = await server_1.prisma.post.findUnique({
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
                },
                _count: { select: { likes: true, comments: true } },
            },
        });
        if (!post) {
            return res.status(404).json({ message: 'Không tìm thấy bài viết' });
        }
        res.json(post);
    }
    catch (error) {
        res.status(500).json({ message: 'Lỗi lấy bài viết', error });
    }
};
exports.getPostById = getPostById;
//# sourceMappingURL=postController.js.map