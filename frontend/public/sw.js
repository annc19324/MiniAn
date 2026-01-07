self.addEventListener('push', function (event) {
    if (event.data) {
        const payload = event.data.json();
        const options = {
            body: payload.body,
            icon: '/minian.ico',
            badge: '/minian.ico',
            data: {
                url: payload.url || '/'
            },
            vibrate: [200, 100, 200, 100, 200, 100, 200],
            renotify: true, // Re-alert if stacking
            tag: 'call_notification', // Overwrite old notifications
            sound: '/annc19324_sound.mp3' // Attempt to play custom sound (OS dependent)
        };

        event.waitUntil(
            self.registration.showNotification(payload.title, options)
        );
    }
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            // If a window is open, focus it
            if (clientList.length > 0) {
                let client = clientList[0];
                for (let i = 0; i < clientList.length; i++) {
                    if (clientList[i].focused) {
                        client = clientList[i];
                    }
                }
                if (client.url && client.url.includes(event.notification.data.url)) {
                    return client.focus();
                }
                return client.focus().then(c => c ? c.navigate(event.notification.data.url) : clients.openWindow(event.notification.data.url));
            }
            return clients.openWindow(event.notification.data.url);
        })
    );
});
