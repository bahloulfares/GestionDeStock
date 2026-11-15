import { execSync } from 'child_process';

export default async function globalSetup() {
  console.log('\n🔧 Setting up integration tests...');
  
  // Use DATABASE_URL_TEST with fallback
  const dbUrl = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL || 'postgresql://mvp_user:mvp_secret_2026@localhost:5433/mvp_test?schema=public';
  
  console.log(`Using database: ${dbUrl.replace(/:[^:@]+@/, ':****@')}`);
  
  try {
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: dbUrl },
    });
    console.log('✅ Migrations applied');
  } catch (error) {
    console.error('❌ Failed to apply migrations:', error);
    throw error;
  }
}
