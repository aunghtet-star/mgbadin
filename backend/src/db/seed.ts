import { pool } from './index';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

async function seed() {
  console.log('Seeding database...');
  
  try {
    // Create default admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    await pool.query(`
      INSERT INTO users (username, password_hash, role, balance)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (username) DO NOTHING
    `, ['admin', adminPassword, 'ADMIN', 0]);

    // Create default collector user
    const userPassword = await bcrypt.hash('user123', 10);
    await pool.query(`
      INSERT INTO users (username, password_hash, role, balance)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (username) DO NOTHING
    `, ['user', userPassword, 'COLLECTOR', 0]);

    console.log('✅ Database seeded successfully!');
    console.log('Default users created:');
    console.log('  - admin / admin123 (ADMIN)');
    console.log('  - user / user123 (COLLECTOR)');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

seed();
