
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
            await LocalNotifications.requestPermissions();
            // Random ID to allow multiple notifications to stack
            const notifId = Math.floor(Math.random() * 100000);

            await LocalNotifications.schedule({
                notifications: [{
                    title,
                    body: body || '',
                    id: notifId,
                    schedule: { at: new Date(Date.now() + 100) },
                    sound: 'annc19324_sound.mp3', // Reuse the custom sound or default
                    actionTypeId: 'OPEN_APP_ACTION',
                    smallIcon: 'ic_launcher',
                    channelId: 'general_channel_v1'
                }]
            });

            // Channel for General Messages
            await LocalNotifications.createChannel({
                id: 'general_channel_v1',
                name: 'Tin nhắn & Thông báo',
                importance: 4, // High but maybe not Max
                visibility: 1,
                sound: 'annc19324_sound.mp3',
                vibration: true
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
