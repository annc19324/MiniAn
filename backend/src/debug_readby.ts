import { prisma } from './db';

async function main() {
    try {
        // Find a group room
        const room = await prisma.room.findFirst({
            where: { isGroup: true },
            include: { users: true }
        });

        if (!room) {
            console.log("No group room found.");
            return;
        }

        console.log(`Found Room: ${room.id}, Name: ${room.name}, Members: ${room.users.length}`);

        // Find latest message
        const msg = await prisma.message.findFirst({
            where: { roomId: room.id },
            orderBy: { createdAt: 'desc' }
        });

        if (!msg) {
            console.log("No message in room.");
            return;
        }

        console.log(`Message ID: ${msg.id}, Content: ${msg.content}`);
        console.log(`ReadBy:`, msg.readBy);
        console.log(`Is Array?`, Array.isArray(msg.readBy));

        // Test append logic manually?
        // We won't modify data here to avoid affecting user state, just read.
    } catch (e) {
        console.error(e);
    }
}

main();
