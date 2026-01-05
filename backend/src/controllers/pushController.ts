import { Response } from 'express';
import { prisma } from '../server';
import { AuthRequest } from '../middleware/authMiddleware';
import webpush from 'web-push';

// Helper to init web-push
// This should really be in a config file or initialized once at startup
// But for simplicity/safety ensuring envs are loaded
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT) {
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT,
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}

// 1. Subscribe Endpoint
export const subscribe = async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const subscription = req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
        return res.status(400).json({ message: 'Invalid subscription payload' });
    }

    try {
        // Check if subscription already exists for this endpoint
        const existing = await prisma.pushSubscription.findUnique({
            where: { endpoint: subscription.endpoint }
        });

        if (existing) {
            // Update user if keys changed or just ensure it's linked to current user
            // If linked to another user, update it? Or just silently succeed.
            // Let's update userId to current user (e.g. user logged in on shared device)
            await prisma.pushSubscription.update({
                where: { endpoint: subscription.endpoint },
                data: {
                    userId,
                    keys: subscription.keys
                }
            });
        } else {
            await prisma.pushSubscription.create({
                data: {
                    userId,
                    endpoint: subscription.endpoint,
                    keys: subscription.keys
                }
            });
        }

        res.status(201).json({ message: 'Subscribed successfully' });
    } catch (error) {
        console.error('Push Subscription Error:', error);
        res.status(500).json({ message: 'Failed to subscribe' });
    }
};

// 2. Helper to Send Notification
export const sendPushNotification = async (userId: number, payload: { title: string, body: string, url?: string }) => {
    if (!process.env.VAPID_PUBLIC_KEY) return; // Not configured

    try {
        const subs = await prisma.pushSubscription.findMany({
            where: { userId }
        });

        const notificationPayload = JSON.stringify(payload);

        // Send to all user's subscriptions
        const promises = subs.map(sub =>
            webpush.sendNotification(
                {
                    endpoint: sub.endpoint,
                    keys: sub.keys as any
                },
                notificationPayload
            ).catch(async err => {
                if (err.statusCode === 410 || err.statusCode === 404) {
                    // Subscription expired/invalid
                    await prisma.pushSubscription.delete({ where: { id: sub.id } });
                }
                console.error('Error sending push:', err);
            })
        );

        await Promise.all(promises);
    } catch (error) {
        console.error('Error in sendPushNotification:', error);
    }
};
