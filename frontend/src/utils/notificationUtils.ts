
export const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
        console.warn("This browser does not support desktop notification");
        return false;
    }
    const permission = await Notification.requestPermission();
    return permission === 'granted';
};

export const sendSystemNotification = (title: string, body?: string, icon?: string) => {
    if (!("Notification" in window)) {
        console.log("System Notification: Browser does not support notifications.");
        return;
    }

    console.log("System Notification: Attempting to send...", title, Notification.permission);

    if (Notification.permission === 'granted') {
        try {
            const options: any = {
                body,
                icon: icon || '/minian.ico',
                vibrate: [200, 100, 200],
                badge: '/minian.ico',
                tag: 'minian-notification',
                silent: true // We play our custom sound to avoid double noise
            };

            const notification = new Notification(title, options);

            notification.onclick = function () {
                window.focus();
                this.close();
            };
            console.log("System Notification: Sent successfully.");
        } catch (e) {
            console.error("System Notification: Failed to send", e);
        }
    } else {
        console.warn("System Notification: Permission not granted. Current state:", Notification.permission);
    }
};

const NOTIFICATION_AUDIO_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

export const playNotificationSound = () => {
    try {
        console.log("Playing notification sound via HTML5 Audio...");
        const audio = new Audio(NOTIFICATION_AUDIO_URL);
        audio.volume = 0.5;

        const playPromise = audio.play();

        if (playPromise !== undefined) {
            playPromise.then(_ => {
                console.log("Audio playback started.");
            })
                .catch(error => {
                    console.warn("Audio playback prevented by browser autoplay policy.", error);
                });
        }
    } catch (e) {
        console.error("Audio constructor failed", e);
    }
};
