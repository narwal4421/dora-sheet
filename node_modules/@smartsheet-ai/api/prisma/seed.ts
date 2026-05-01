import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@smartsheet.ai' },
    update: {},
    create: {
      email: 'admin@smartsheet.ai',
      name: 'Admin User',
      passwordHash,
      role: Role.ADMIN,
    },
  });

  const editor = await prisma.user.upsert({
    where: { email: 'demo@smartsheet.ai' },
    update: {},
    create: {
      email: 'demo@smartsheet.ai',
      name: 'Demo Editor',
      passwordHash,
      role: Role.EDITOR,
    },
  });

  let workspace = await prisma.workspace.findFirst({ where: { name: 'Demo Workspace' } });
  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: 'Demo Workspace',
        members: {
          create: [
            { userId: admin.id, role: Role.ADMIN },
            { userId: editor.id, role: Role.EDITOR },
          ],
        },
      },
    });
  }

  let workbook = await prisma.workbook.findFirst({ where: { name: 'Business Dashboard', workspaceId: workspace.id } });
  if (!workbook) {
    workbook = await prisma.workbook.create({
      data: {
        name: 'Business Dashboard',
        workspaceId: workspace.id,
        sheets: {
          create: [
            { name: 'Financial Manager', order: 0, rowCount: 100, colCount: 26, data: {} },
            { name: 'Sales CRM', order: 1, rowCount: 100, colCount: 26, data: {} },
            { name: 'Inventory Manager', order: 2, rowCount: 100, colCount: 26, data: {} },
            { name: 'Payroll Manager', order: 3, rowCount: 100, colCount: 26, data: {} },
          ]
        }
      },
    });
  }

  console.log('Seed completed successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
