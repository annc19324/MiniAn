
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function debugMessages() {
    try {
        console.log("Connecting to DB...");
        // Fetch last 10 messages
        const messages = await prisma.message.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' }
        });

        console.log("Found messages:", messages.length);
        messages.forEach(msg => {
            console.log(`Msg ID: ${msg.id}, Content: ${msg.content}`);
            console.log(`Reactions Raw:`, msg.reactions);
            console.log(`Reactions Type:`, typeof msg.reactions);
            if (msg.reactions) {
                console.log(`Is Array?`, Array.isArray(msg.reactions));
            }
            console.log("---");
        });

    } catch (e) {
        console.error("Error in debugMessages:", e);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

debugMessages();
