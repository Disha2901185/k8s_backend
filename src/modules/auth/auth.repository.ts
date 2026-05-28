import { Injectable } from '@nestjs/common';
import { Prisma, Session, TenantLeadCredential } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  createSession(data: Prisma.SessionCreateInput): Promise<Session> {
    return this.prisma.session.create({ data });
  }

  findSessionById(id: string) {
    return this.prisma.session.findUnique({ where: { id } });
  }

  revokeSession(id: string) {
    return this.prisma.session.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  findLeadApiCredentialByTenantId(tenantId: string) {
    return this.prisma.tenantLeadCredential.findUnique({ where: { tenantId } });
  }

  createLeadApiCredential(
    data: Prisma.TenantLeadCredentialCreateInput,
  ): Promise<TenantLeadCredential> {
    return this.prisma.tenantLeadCredential.create({ data });
  }

  updateLeadApiCredential(
    tenantId: string,
    data: Prisma.TenantLeadCredentialUpdateInput,
  ): Promise<TenantLeadCredential> {
    return this.prisma.tenantLeadCredential.update({
      where: { tenantId },
      data,
    });
  }
}