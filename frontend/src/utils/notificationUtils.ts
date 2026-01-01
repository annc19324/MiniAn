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
                icon: icon || '/minian.ico',
                // @ts-ignore
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

export const playNotificationSound = () => {
    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
        oscillator.frequency.exponentialRampToValueAtTime(440, audioContext.currentTime + 0.5); // Drop to A4

        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
        console.error("Audio play failed", e);
    }
};
