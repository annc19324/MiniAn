// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

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
    });