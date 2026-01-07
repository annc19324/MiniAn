
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

            // Channel for General Messages (Default Sound)
            await LocalNotifications.createChannel({
                id: 'general_channel_v4', // v4 for clean update
                name: 'Tin nhắn & Thông báo (Mặc định)',
                importance: 4,
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
        audio.play().catch(e => console.error("Audio play blocked:", e));
    } catch (e) {
        console.error("Audio init error:", e);
    }
};
