import { execSync } from 'child_process';

export default async function globalSetup() {
  console.log('\n🔧 Setting up integration tests...');
  
  // Apply migrations to test database
  process.env.DATABASE_URL = 'postgresql://mvp_user:mvp_secret_2026@localhost:5433/mvp_test?schema=public';
  
  try {
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    });
    console.log('✅ Migrations applied to mvp_test');
  } catch (error) {
    console.error('❌ Failed to apply migrations:', error);
    throw error;
  }
}
