import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

enum Role {
    ADMIN = 'ADMIN',
    COLLECTOR = 'COLLECTOR',
}

async function main() {
    console.log('Seeding database...');

    // Create default admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            username: 'admin',
            passwordHash: adminPassword,
            role: Role.ADMIN,
            balance: 0,
        },
    });
    console.log(`Created admin user: ${admin.username}`);

    // Create default collector user
    const collectorPassword = await bcrypt.hash('user123', 10);
    const collector = await prisma.user.upsert({
        where: { username: 'user' },
        update: {},
        create: {
            username: 'user',
            passwordHash: collectorPassword,
            role: Role.COLLECTOR,
            balance: 10000,
        },
    });
    console.log(`Created collector user: ${collector.username}`);

    // Create a default game phase
    const phase = await prisma.gamePhase.upsert({
        where: { id: '00000000-0000-0000-0000-000000000001' },
        update: {},
        create: {
            id: '00000000-0000-0000-0000-000000000001',
            name: 'Jan-07',
            active: true,
            globalLimit: 50000,
        },
    });
    console.log(`Created game phase: ${phase.name}`);

    console.log('Seeding completed!');
    await prisma.$disconnect();
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
