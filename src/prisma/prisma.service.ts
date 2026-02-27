import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { ERROR_MESSAGES } from '../constants/error-messages';
import { getDatabaseUrl } from '../utils/database-url';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const url = getDatabaseUrl();
    if (!process.env.DATABASE_URL) {
      throw new Error(ERROR_MESSAGES.ENV.DATABASE_URL_REQUIRED);
    }
    const adapter = new PrismaPg({ connectionString: url });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
