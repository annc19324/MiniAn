
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function checkReactions() {
    try {
        const messages = await prisma.message.findMany({
            where: {
                NOT: {
                    reactions: null
                }
            },
            take: 5
        });
        console.log('Messages with reactions:', JSON.stringify(messages, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

checkReactions();
