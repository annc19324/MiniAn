
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
                    actionTypeId: 'OPEN_APP_ACTION',
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
export const registerPushNotifications = async (subscribeApiCall: (sub: any) => Promise<any>) => {
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

        await PushNotifications.register();

        // On success, we get a token
        PushNotifications.removeAllListeners();

        PushNotifications.addListener('registration', async (token: Token) => {
            console.log('Push Registration Token:', token.value);
            // Send to backend with special format for FCM
            // We use a dummy endpoint format "fcm:TOKEN" to distinguish
            const subscription = {
                endpoint: `fcm:${token.value}`,
                keys: {
                    p256dh: 'fcm',
                    auth: 'fcm'
                }
            };
            await subscribeApiCall(subscription);
        });

        PushNotifications.addListener('registrationError', (error: any) => {
            console.error('Error on registration:', error);
        });

        // Foreground Notification
        PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
            console.log('Push received:', notification);
            // Show as Local Notification so it looks consistent
            sendSystemNotification(notification.title || 'New Notification', notification.body || '');
        });

        // Action Performed (Click)
        PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
            console.log('Push action performed:', notification.actionId, notification.inputValue);
            // App is opened, you might want to navigate
            // window.location.href = ... (Routing logic handled usually by checking URL in payload)
        });

    } catch (e) {
        console.error("Push Register Error:", e);
    }
};
