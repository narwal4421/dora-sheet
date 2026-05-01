import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

beforeAll(async () => {
  // Clear tables
  await prisma.comment.deleteMany();
  await prisma.snapshot.deleteMany();
  await prisma.sheet.deleteMany();
  await prisma.workbook.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
