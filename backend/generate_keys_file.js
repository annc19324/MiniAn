const fs = require('fs');
const webpush = require('web-push');
const vapidKeys = webpush.generateVAPIDKeys();
fs.writeFileSync('public_key.txt', vapidKeys.publicKey);
fs.writeFileSync('private_key.txt', vapidKeys.privateKey);
