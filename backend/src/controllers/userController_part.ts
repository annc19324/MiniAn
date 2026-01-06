
// Logic for getting followers list
export const getFollowers = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    try {
        const user = await prisma.user.findUnique({
            where: { id: Number(id) },
            select: {
                followers: {
                    select: {
                        follower: {
                            select: { id: true, username: true, fullName: true, avatar: true, isVip: true }
                        }
                    }
                }
            }
        });

        if (!user) return res.status(404).json({ message: 'User not found' });

        const followers = user.followers.map(f => f.follower);
        res.json(followers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Logic for getting following list
export const getFollowing = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    try {
        const user = await prisma.user.findUnique({
            where: { id: Number(id) },
            select: {
                following: {
                    select: {
                        following: {
                            select: { id: true, username: true, fullName: true, avatar: true, isVip: true }
                        }
                    }
                }
            }
        });

        if (!user) return res.status(404).json({ message: 'User not found' });

        const following = user.following.map(f => f.following);
        res.json(following);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
