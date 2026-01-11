import { Response } from 'express';
import { prisma } from '../db';
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


// Lazy load firebase-admin to avoid crash if not installed
let admin: any;
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    admin = require('firebase-admin');
    if (!admin.apps.length) {
        // Initialize with default strategy (GOOGLE_APPLICATION_CREDENTIALS) 
        // or serviceAccount from env
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
    }
} catch (e) {
    console.log("Firebase Admin not installed or configured. Native Push won't work.");
}

// 2. Helper to Send Notification
export const sendPushNotification = async (userId: number, payload: { title: string, body: string, url?: string }) => {
    try {
        const subs = await prisma.pushSubscription.findMany({
            where: { userId }
        });

        const notificationPayload = JSON.stringify(payload);

        const promises = subs.map(async sub => {
            // Check if it is an FCM Token (Using our 'fcm:' prefix convention)
            if (sub.endpoint.startsWith('fcm:')) {
                if (!admin) return;
                const token = sub.endpoint.split('fcm:')[1];
                try {
                    await admin.messaging().send({
                        token: token,
                        notification: {
                            title: payload.title,
                            body: payload.body,
                        },
                        data: {
                            url: payload.url || '/',
                            ...payload
                        },
                        android: {
                            priority: 'high',
                            notification: {
                                sound: (payload as any).android?.sound || 'default',
                                channelId: (payload as any).android?.channelId || 'general_channel_v6',
                                tag: 'call_incoming' // Replace existing notification to create "looping" ring effect without stacking
                            }
                        }
                    });
                } catch (err: any) {
                    console.error("FCM Send Error:", err);
                    if (err.code === 'messaging/registration-token-not-registered') {
                        await prisma.pushSubscription.delete({ where: { id: sub.id } });
                    }
                }
                return;
            }

            // Normal Web Push
            if (!process.env.VAPID_PUBLIC_KEY) return;
            return webpush.sendNotification(
                {
                    endpoint: sub.endpoint,
                    keys: sub.keys as any
                },
                notificationPayload
            ).catch(async err => {
                if (err.statusCode === 410 || err.statusCode === 404) {
                    await prisma.pushSubscription.delete({ where: { id: sub.id } });
                }
                console.error('Error sending web push:', err);
            });
        });

        await Promise.all(promises);
    } catch (error) {
        console.error('Error in sendPushNotification:', error);
    }
};
