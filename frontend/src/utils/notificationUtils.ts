
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

export const playNotificationSound = async () => {
    try {
        console.log("Playing notification sound via Web Audio API...");
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) {
            console.error("AudioContext not supported");
            return;
        }

        const ctx = new AudioContext();

        if (ctx.state === 'suspended') {
            await ctx.resume();
        }

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        // Sound profile: simple 'ding'
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // High pitch A5
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1); // Quick drop to A4

        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

        osc.start();
        osc.stop(ctx.currentTime + 0.5);

        // Clean up context to release hardware resources
        setTimeout(() => {
            if (ctx.state !== 'closed') ctx.close();
        }, 600);

    } catch (e) {
        console.error("Audio play failed", e);
    }
};
