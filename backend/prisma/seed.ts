import { PrismaClient, UserRole, PaymentMethod, OrderStatus, SaleStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Super-Admin Plateforme (Propriétaire) ──────────────────────────────
  const superAdminHash = await bcrypt.hash('SuperAdmin@2026!', 12);
  const superAdmin = await prisma.user.findFirst({
    where: { email: 'superadmin@stocktn.tn' },
  });
  if (!superAdmin) {
    await prisma.user.create({
      data: {
        email: 'superadmin@stocktn.tn',
        passwordHash: superAdminHash,
        role: UserRole.SUPER_ADMIN,
        isActive: true,
        isVerified: true,
      },
    });
    console.log('👑 Super-Admin créé : superadmin@stocktn.tn / SuperAdmin@2026!');
  }

  // ─── Tenant démo ─────────────────────────────────────────────────────────
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

  const tenant = await prisma.tenant.upsert({
    where: { email: 'demo@stocktn.tn' },
    update: {
      status: 'ACTIVE',
      plan: 'YEARLY',
      subscriptionExpiresAt: oneYearFromNow,
    },
    create: {
      name: 'Boutique Mobile Demo',
      email: 'demo@stocktn.tn',
      phone: '+216 22 000 000',
      plan: 'YEARLY',
      status: 'ACTIVE',
      subscriptionExpiresAt: oneYearFromNow,
    },
  });
  console.log(`✅ Tenant créé : ${tenant.name}`);

  // ─── Utilisateurs de la boutique ──────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin@2026!', 12);
  const employeeHash = await bcrypt.hash('Employe@2026!', 12);

  const admin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@demo.tn' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'admin@demo.tn',
      passwordHash: adminHash,
      role: UserRole.ADMIN,
      isActive: true,
      isVerified: true,
    },
  });

  const employee = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'employe@demo.tn' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'employe@demo.tn',
      passwordHash: employeeHash,
      role: UserRole.EMPLOYEE,
      isActive: true,
      isVerified: true,
    },
  });
  console.log(`✅ Utilisateurs créés : admin@demo.tn, employe@demo.tn`);

  // ─── Catégories ───────────────────────────────────────────────────────────
  const categoryNames = ['Coques', 'Câbles', 'Écouteurs', 'Power Banks', 'Verres Trempés', 'Chargeurs', 'Accessoires'];
  const categories: Record<string, any> = {};

  for (const name of categoryNames) {
    const cat = await prisma.category.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name } },
      update: {},
      create: { tenantId: tenant.id, name },
    });
    categories[name] = cat;
  }
  console.log(`✅ ${categoryNames.length} catégories créées`);

  // ─── Fournisseurs ─────────────────────────────────────────────────────────
  let supplier1 = await prisma.supplier.findFirst({ where: { tenantId: tenant.id, name: 'TechDistrib Tunisie' } });
  if (!supplier1) {
    supplier1 = await prisma.supplier.create({
      data: {
        tenantId: tenant.id,
        name: 'TechDistrib Tunisie',
        phone: '+216 71 000 111',
        email: 'contact@techdistrib.tn',
        city: 'Tunis',
        paymentTerms: 'Paiement à 30 jours',
      },
    });
  }

  let supplier2 = await prisma.supplier.findFirst({ where: { tenantId: tenant.id, name: 'MobileGross Sfax' } });
  if (!supplier2) {
    supplier2 = await prisma.supplier.create({
      data: {
        tenantId: tenant.id,
        name: 'MobileGross Sfax',
        phone: '+216 74 000 222',
        email: 'vente@mobilegross.tn',
        city: 'Sfax',
        paymentTerms: 'Comptant',
      },
    });
  }
  console.log(`✅ 2 fournisseurs créés`);

  // ─── Produits ─────────────────────────────────────────────────────────────
  const productsData = [
    { name: 'Coque iPhone 15 Noir', ref: 'COQ-IP15-BLK', cat: 'Coques', buy: 4.500, sell: 12.000, qty: 45, min: 10 },
    { name: 'Coque iPhone 15 Transparent', ref: 'COQ-IP15-TRS', cat: 'Coques', buy: 3.000, sell: 9.000, qty: 30, min: 10 },
    { name: 'Coque Samsung S24 Silicone', ref: 'COQ-S24-SIL', cat: 'Coques', buy: 3.500, sell: 10.000, qty: 25, min: 8 },
    { name: 'Câble USB-C 1m', ref: 'CAB-USBC-1M', cat: 'Câbles', buy: 2.500, sell: 7.000, qty: 80, min: 20 },
    { name: 'Câble Lightning Apple 1m', ref: 'CAB-LTNG-1M', cat: 'Câbles', buy: 3.000, sell: 8.500, qty: 50, min: 15 },
    { name: 'Câble Micro-USB 2m', ref: 'CAB-MUSB-2M', cat: 'Câbles', buy: 1.500, sell: 4.500, qty: 60, min: 15 },
    { name: 'Écouteurs Bluetooth TWS', ref: 'ECO-TWS-001', cat: 'Écouteurs', buy: 12.000, sell: 29.900, qty: 20, min: 5 },
    { name: 'Écouteurs filaires Jack 3.5', ref: 'ECO-JACK-001', cat: 'Écouteurs', buy: 4.000, sell: 10.000, qty: 35, min: 10 },
    { name: 'Power Bank 10000mAh', ref: 'PWR-10K-001', cat: 'Power Banks', buy: 18.000, sell: 39.900, qty: 15, min: 5 },
    { name: 'Power Bank 20000mAh', ref: 'PWR-20K-001', cat: 'Power Banks', buy: 28.000, sell: 59.900, qty: 8, min: 3 },
    { name: 'Verre Trempé iPhone 15', ref: 'VTR-IP15-001', cat: 'Verres Trempés', buy: 2.000, sell: 6.000, qty: 60, min: 20 },
    { name: 'Verre Trempé Samsung S24', ref: 'VTR-S24-001', cat: 'Verres Trempés', buy: 2.000, sell: 6.000, qty: 45, min: 15 },
    { name: 'Chargeur USB-C 20W', ref: 'CHG-USBC-20W', cat: 'Chargeurs', buy: 8.000, sell: 19.900, qty: 30, min: 8 },
    { name: 'Chargeur Sans Fil 15W', ref: 'CHG-WIFI-15W', cat: 'Chargeurs', buy: 15.000, sell: 34.900, qty: 4, min: 5 },
    { name: 'Support Voiture Magnétique', ref: 'ACC-SUPP-MAG', cat: 'Accessoires', buy: 6.000, sell: 14.900, qty: 20, min: 5 },
  ];

  const products: Record<string, any> = {};
  for (const p of productsData) {
    let product = await prisma.product.findFirst({ where: { tenantId: tenant.id, reference: p.ref } });
    if (!product) {
      product = await prisma.product.create({
        data: {
          tenantId: tenant.id,
          categoryId: categories[p.cat].id,
          name: p.name,
          reference: p.ref,
          priceBuy: p.buy,
          priceSell: p.sell,
          qty: p.qty,
          minStock: p.min,
        },
      });
    }
    products[p.ref] = product;
  }
  console.log(`✅ ${productsData.length} produits créés`);

  // ─── Bon de commande démo ─────────────────────────────────────────────────
  const existingOrder = await prisma.purchaseOrder.findFirst({
    where: { tenantId: tenant.id, invoiceNumber: 'FAC-2026-001' }
  });
  if (!existingOrder) {
    await prisma.purchaseOrder.create({
      data: {
        tenantId: tenant.id,
        supplierId: supplier1!.id,
        invoiceNumber: 'FAC-2026-001',
        status: OrderStatus.VALIDATED,
        createdBy: admin.id,
        date: new Date('2026-05-10'),
        items: {
          create: [
            { productId: products['COQ-IP15-BLK'].id, qty: 20, priceBuy: 4.500 },
            { productId: products['CAB-USBC-1M'].id, qty: 50, priceBuy: 2.500 },
            { productId: products['VTR-IP15-001'].id, qty: 30, priceBuy: 2.000 },
          ],
        },
      },
    });
  }
  console.log(`✅ Bon de commande démo créé`);

  // ─── Ventes démo ─────────────────────────────────────────────────────────
  const existingSales = await prisma.sale.count({ where: { tenantId: tenant.id } });
  if (existingSales === 0) {
    const salesData = [
      {
        date: new Date('2026-05-18'),
        payment: PaymentMethod.CASH,
        items: [
          { ref: 'COQ-IP15-BLK', qty: 2, price: 12.000 },
          { ref: 'VTR-IP15-001', qty: 2, price: 6.000 },
        ],
      },
      {
        date: new Date('2026-05-19'),
        payment: PaymentMethod.TRANSFER,
        items: [
          { ref: 'ECO-TWS-001', qty: 1, price: 29.900 },
          { ref: 'CAB-USBC-1M', qty: 2, price: 7.000 },
        ],
      },
      {
        date: new Date('2026-05-20'),
        payment: PaymentMethod.CASH,
        items: [
          { ref: 'CHG-USBC-20W', qty: 1, price: 19.900 },
          { ref: 'CAB-LTNG-1M', qty: 1, price: 8.500 },
          { ref: 'VTR-IP15-001', qty: 3, price: 6.000 },
        ],
      },
      {
        date: new Date('2026-05-20'),
        payment: PaymentMethod.CASH,
        items: [
          { ref: 'COQ-S24-SIL', qty: 1, price: 10.000 },
          { ref: 'VTR-S24-001', qty: 1, price: 6.000 },
        ],
      },
    ];

    for (const s of salesData) {
      const total = s.items.reduce((acc, i) => acc + i.qty * i.price, 0);
      await prisma.sale.create({
        data: {
          tenantId: tenant.id,
          date: s.date,
          total,
          paymentMethod: s.payment,
          status: SaleStatus.COMPLETED,
          createdBy: employee.id,
          items: {
            create: s.items.map(i => ({
              productId: products[i.ref].id,
              qty: i.qty,
              priceSell: i.price,
            })),
          },
        },
      });
    }
    console.log(`✅ ${salesData.length} ventes démo créées`);
  }

  // ─── Logs d'activité ─────────────────────────────────────────────────────
  const logCount = await prisma.activityLog.count({ where: { tenantId: tenant.id } });
  if (logCount === 0) {
    await prisma.activityLog.createMany({
      data: [
        { tenantId: tenant.id, userId: admin.id, action: 'CREATE', entityType: 'purchase_order' },
        { tenantId: tenant.id, userId: admin.id, action: 'VALIDATE', entityType: 'purchase_order' },
        { tenantId: tenant.id, userId: employee.id, action: 'CREATE', entityType: 'sale' },
      ],
    });
  }

  console.log('');
  console.log('🎉 Seed terminé avec succès !');
  console.log('');
  console.log('📋 Comptes de connexion :');
  console.log('   👑 Admin     : admin@demo.tn    / Admin@2026!');
  console.log('   👤 Employé  : employe@demo.tn  / Employe@2026!');
}

main()
  .catch(e => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
