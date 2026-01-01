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
            const notification = new Notification(title, {
                body,
                icon: icon || '/vite.svg', // Default icon
                vibrate: [200, 100, 200]
            });
            notification.onclick = function () {
                window.focus();
                this.close();
            };
        } catch (e) {
            console.error("Notification sending failed", e);
        }
    }
};
