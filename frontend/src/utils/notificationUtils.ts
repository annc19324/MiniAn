
export const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
        console.warn("This browser does not support desktop notification");
        return false;
    }
    const permission = await Notification.requestPermission();
    return permission === 'granted';
};

export const sendSystemNotification = (title: string, body?: string, icon?: string) => {
    if (!("Notification" in window)) return;

    if (Notification.permission === 'granted') {
        try {
            const options: any = {
                body,
                icon: icon || '/minian.ico',
                vibrate: [200, 100, 200],
                badge: '/minian.ico',
                tag: 'minian-notification',
                silent: true // We handle sound manually
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
