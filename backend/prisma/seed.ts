// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });  // ← THÊM { adapter } vào đây!

async function main() {
    const hashedPassword = await bcrypt.hash('Zeanokai@1', 10);

    await prisma.user.upsert({
        where: { email: 'admin@minian.com' },
        update: {},
        create: {
            username: 'admin',
            email: 'admin@minian.com',
            password: hashedPassword,
            fullName: 'Administrator',
            role: 'ADMIN',
            coins: 9999,
            isVip: true,
        },
    });

    console.log('Seed admin thành công!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();  // ← Đóng pool để tránh leak
    });