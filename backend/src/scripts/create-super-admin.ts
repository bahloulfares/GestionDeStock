#!/usr/bin/env node
/**
 * Script de creation d'un SUPER_ADMIN
 * Usage : npm run create-super-admin
 * Variables requises : SUPER_ADMIN_EMAIL et SUPER_ADMIN_PASSWORD
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 12;

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('Variables manquantes : SUPER_ADMIN_EMAIL et SUPER_ADMIN_PASSWORD requis');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Le mot de passe doit contenir au moins 8 caracteres');
    process.exit(1);
  }

  // Verifier si un SUPER_ADMIN avec cet email existe deja
  const existing = await prisma.user.findFirst({
    where: { email, role: 'SUPER_ADMIN' },
  });

  if (existing) {
    console.error(`Un SUPER_ADMIN avec l'email ${email} existe deja`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      tenantId: null,
      email,
      passwordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
      isVerified: true,
    },
  });

  console.log(`SUPER_ADMIN cree avec succes : ${user.email} (id: ${user.id})`);
  process.exit(0);
}

main()
  .catch((err) => {
    console.error('Erreur :', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
