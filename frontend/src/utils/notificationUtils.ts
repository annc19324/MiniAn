
export const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
        console.warn("This browser does not support desktop notification");
        return false;
    }
    const permission = await Notification.requestPermission();
    return permission === 'granted';
};

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import type { Token, ActionPerformed, PushNotificationSchema } from '@capacitor/push-notifications';

export const sendSystemNotification = async (title: string, body?: string, icon?: string) => {
    // === NATIVE LOGIC ===
    if (Capacitor.isNativePlatform()) {
        try {
            // Random ID to allow multiple notifications to stack
            const notifId = Math.floor(Math.random() * 100000);

            await LocalNotifications.schedule({
                notifications: [{
                    title,
                    body: body || '',
                    id: notifId,
                    schedule: { at: new Date(Date.now()) }, // Immediate
                    smallIcon: 'ic_launcher',
                    channelId: 'general_channel_v4'
                }]
            });

            // Channel for General Messages (Default Sound, Heads-up)
            await LocalNotifications.createChannel({
                id: 'general_channel_v4', // v4 for clean update
                name: 'Tin nhắn & Thông báo (Mặc định)',
                importance: 5,
                visibility: 1,
                vibration: true
                // No sound property = System Default
            });
        } catch (e) {
            console.error("Native Notif Error", e);
        }
        return;
    }

    // === WEB LOGIC ===
    if (!("Notification" in window)) return;

    if (Notification.permission === 'granted') {
        try {
            const options: any = {
                body,
                icon: icon || '/minian.ico',
                vibrate: [200, 100, 200],
                badge: '/minian.ico',
                tag: 'minian-notification', // Stacks on web to prevent spam
                silent: true // We handle sound manually in Layout
            };

            const notification = new Notification(title, options);

            notification.onclick = function () {
                window.focus();
                this.close();
            };
        } catch (e) {
            console.error("System Notification Error:", e);
        }
    }
};

// Let's use a known working CDNs sound for "notification".
const RELIABLE_SOUND_URL = "https://codeskulptor-demos.commondatastorage.googleapis.com/GalaxyInvaders/pause.wav";

export const playNotificationSound = () => {
    try {
        const audio = new Audio(RELIABLE_SOUND_URL);
        audio.volume = 0.6;
    } catch (e) {
        console.error("Audio init error:", e);
    }
};

// === NATIVE PUSH REGISTRATION ===
// === NATIVE PUSH LOGIC ===

// 1. Setup Global Listeners (Run once at App root)
export const setupPushListeners = (navigate: (path: string) => void) => {
    if (!Capacitor.isNativePlatform()) return;

    PushNotifications.removeAllListeners();

    PushNotifications.addListener('registration', (token: Token) => {
        console.log('Push Registration Token (Global):', token.value);
        // We can't send to backend here easily without auth context, 
        // so we just log it. The specific register call will handle the backend sync.
    });

    PushNotifications.addListener('registrationError', (error: any) => {
        console.error('Error on registration:', error);
    });

    // Foreground Notification
    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
        console.log('Push received:', notification);
        const data = notification.data;
        if (data && data.type === 'call_ended') {
            LocalNotifications.cancel({ notifications: [{ id: 1 }] }).catch(console.error);
        }
    });

    // Action Performed (Click) - Push
    PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
        console.log('Push action performed:', notification.actionId);
        const data = notification.notification.data;
        if (data) {
            // Handle URL navigation
            if (data.url) {
                console.log('Navigating to:', data.url);
                navigate(data.url);
            }
            // Handle Call Answer/Decline Actions if any
            if (notification.actionId === 'answer' && data.conversationId) {
                navigate(`/chat`);
            } else if (data.type === 'call_incoming') {
                navigate(`/chat`);
            } else if (data.type === 'call_ended') {
                // Do nothing or navigate to chat to see missed call
                // But most importantly, cancel notification
                LocalNotifications.cancel({ notifications: [{ id: 1 }] }).catch(console.error);
                // No navigation needed, or maybe navigate home
            }
        }
    });

    // Action Performed (Click) - Local
    LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
        console.log('Local action performed:', notification.actionId);
        // Default Local Notification behavior is to open app.
        // We just need to handle specific navigation if 'extra' data is present.
        // But sendSystemNotification just sends title/body.
        // If we want navigation, we should add 'extra' or data to it.
        // For now, at least it logs and maybe we can direct to /notifications
        if (notification.notification.extra && notification.notification.extra.url) {
            navigate(notification.notification.extra.url);
        } else {
            // Fallback to home or notifications
            // navigate('/notifications'); // Optional
        }
    });
};

// 2. Register & Sync Token (Run when User is Logged In)
export const registerPushToken = async (subscribeApiCall: (sub: any) => Promise<any>) => {
    if (!Capacitor.isNativePlatform()) return;

    try {
        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
            permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
            console.log('User denied permissions!');
            return;
        }

        // Create Channels (Update ID to v2/v5 to force refresh audio settings)
        // 1. General
        await PushNotifications.createChannel({
            id: 'general_channel_v5', // Increment version
            name: 'Tin nhắn & Thông báo',
            description: 'Thông báo chung',
            importance: 4, // High but not max
            visibility: 1,
            vibration: true,
        });

        // 2. Calls (Max Priority + Sound)
        await PushNotifications.createChannel({
            id: 'call_channel_v2', // Increment to apply new sound settings if any
            name: 'Cuộc gọi đến',
            description: 'Thông báo cuộc gọi video',
            importance: 5, // MAX importance for Heads-up
            visibility: 1,
            vibration: true,
            sound: 'annc19324_sound.mp3' // Ensure this file is in res/raw
        });

        await PushNotifications.register();

        // Listener for the specific registration event to sync with backend
        // We add a specific ONE-TIME listener just for this sync? 
        // Or we rely on the global listener? 
        // Problem: Global listener has no access to 'subscribeApiCall'.
        // Solution: Get token explicitly? No, Capacitor only gives token via event.
        // We must add a listener here too, OR store the token in a global store.
        // Let's add a temporary listener securely.

        PushNotifications.addListener('registration', async (token: Token) => {
            // Send to backend
            const subscription = {
                endpoint: `fcm:${token.value}`,
                keys: { p256dh: 'fcm', auth: 'fcm' }
            };
            try {
                await subscribeApiCall(subscription);
                console.log("Push token synced with backend");
            } catch (e) {
                console.error("Failed to sync push token", e);
            }
        });

    } catch (e) {
        console.error("Push Register Error:", e);
    }
};
