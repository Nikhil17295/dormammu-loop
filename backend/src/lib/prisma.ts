import { PrismaClient } from "@prisma/client";

// Global PrismaClient instance for database queries
export const prisma = new PrismaClient();
