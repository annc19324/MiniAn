
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
    console.log('Starting debug script...');
    try {
        console.log('Connecting to DB...');
        await prisma.$connect();
        console.log('Connected.');

        console.log('Querying Users...');
        const users = await prisma.user.findMany({ take: 1 });
        console.log('Users found:', users.length);

        console.log('Querying Messages...');
        const messages = await prisma.message.findMany({ take: 1 });
        console.log('Messages found:', messages.length);

        console.log('Querying Comments...');
        const comments = await prisma.comment.findMany({ take: 1 });
        console.log('Comments found:', comments.length);

    } catch (error: any) {
        console.error('FATAL ERROR:', error);
        if (error.code) console.error('Error Code:', error.code);
        if (error.meta) console.error('Error Meta:', error.meta);
    } finally {
        await prisma.$disconnect();
        console.log('Disconnected.');
    }
}

main().catch(e => console.error(e));
