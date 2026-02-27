import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    // Placeholder so `prisma generate` (e.g. postinstall) works without .env
    url: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/placeholder',
  },
});
