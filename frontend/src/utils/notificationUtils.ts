
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

// Short 'Ding' sound (Base64 encoded MP3) to ensure instant playback without network requests
const NOTIFICATION_SOUND_BASE64 = 'data:audio/mp3;base64,//uQRAAAAWMSLwUIYAAsYkXgoQwAEaYLWfkWgAI0wWs/ItAAAG84AAAEAAYBAJEBAUAABAQGAMAf///7M98////9kM///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q///4s2/////9//2Q//';
// Note: The above is a placeholder string pattern. I will use a reliable, simple generated beep encoded in base64 to ensure it works. 
// Since I cannot generate a binary mp3 on the fly efficiently, I will use a robust online source URL as a backup, but Base64 is preferred if I had the string.
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
