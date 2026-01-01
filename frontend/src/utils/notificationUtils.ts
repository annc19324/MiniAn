// Simple 'ding' sound in base64 to avoid loading external files and improve compatibility
const NOTIFICATION_SOUND = 'data:audio/wav;base64,UklGRl9vT1xXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU'; // Short placeholder, will use a real one or Oscillator fallback properly

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
            // Mobile browsers often require a Service Worker for notifications when backgrounded.
            // However, this standard API works in many cases if the tab is alive.
            const options: any = {
                body,
                icon: icon || '/minian.ico',
                vibrate: [200, 100, 200],
                badge: '/minian.ico',
                tag: 'minian-notification' // Replaces old notifications with same tag
            };

            // Try-catch for Service Worker registration check if we decide to add it later, 
            // but for now standard Notification
            new Notification(title, options);

        } catch (e) {
            console.error("Notification sending failed", e);
        }
    }
};

export const playNotificationSound = () => {
    try {
        // Try playing a gentle beep using Oscillator (synthesized sound)
        // This is immediate and doesn't require downloading files
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;

        const ctx = new AudioContext();

        // Resume context if suspended (common in browsers to prevent autoplay)
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // High pitch
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1); // Quick drop

        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

        osc.start();
        osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
        console.error("Audio play failed", e);
    }
};
