import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ContactsRepository {
  constructor(private readonly prisma: PrismaService) {}

  listContacts(where: Prisma.ContactWhereInput, skip: number, take: number) {
    return this.prisma.contact.findMany({
      where,
      skip,
      take,
      orderBy: [{ fullName: 'asc' }, { createdAt: 'desc' }],
      include: {
        company: true,
        convertedLeads: {
          where: { isDeleted: false },
          orderBy: { updatedAt: 'desc' },
          take: 5,
        },
        primaryDeals: {
          orderBy: { updatedAt: 'desc' },
          take: 5,
          include: {
            company: true,
            sourceLead: true,
          },
        },
        primaryForCompanies: true,
      },
    });
  }

  countContacts(where: Prisma.ContactWhereInput) {
    return this.prisma.contact.count({ where });
  }

  findContactById(tenantId: string, id: string) {
    return this.prisma.contact.findFirst({
      where: { tenantId, id },
      include: {
        company: true,
        convertedLeads: {
          where: { isDeleted: false },
          orderBy: { updatedAt: 'desc' },
        },
        primaryDeals: {
          orderBy: { updatedAt: 'desc' },
          include: {
            company: true,
            sourceLead: true,
          },
        },
        primaryForCompanies: true,
      },
    });
  }

  findContactByEmail(tenantId: string, email: string) {
    return this.prisma.contact.findFirst({
      where: {
        tenantId,
        email: {
          equals: email,
          mode: 'insensitive',
        },
      },
      include: {
        company: true,
      },
    });
  }

  findContactByCompanyAndName(tenantId: string, companyId: string, fullName: string) {
    return this.prisma.contact.findFirst({
      where: {
        tenantId,
        companyId,
        fullName: {
          equals: fullName,
          mode: 'insensitive',
        },
      },
      include: {
        company: true,
      },
    });
  }

  createContact(data: Prisma.ContactCreateInput) {
    return this.prisma.contact.create({
      data,
      include: {
        company: true,
        convertedLeads: {
          where: { isDeleted: false },
          orderBy: { updatedAt: 'desc' },
        },
        primaryDeals: {
          orderBy: { updatedAt: 'desc' },
          include: {
            company: true,
            sourceLead: true,
          },
        },
        primaryForCompanies: true,
      },
    });
  }

  updateContact(id: string, data: Prisma.ContactUpdateInput) {
    return this.prisma.contact.update({
      where: { id },
      data,
      include: {
        company: true,
        convertedLeads: {
          where: { isDeleted: false },
          orderBy: { updatedAt: 'desc' },
        },
        primaryDeals: {
          orderBy: { updatedAt: 'desc' },
          include: {
            company: true,
            sourceLead: true,
          },
        },
        primaryForCompanies: true,
      },
    });
  }

  deleteContact(id: string) {
    return this.prisma.contact.delete({ where: { id } });
  }

  findCompanyById(tenantId: string, id: string) {
    return this.prisma.company.findFirst({
      where: { tenantId, id },
      include: {
        primaryContact: true,
      },
    });
  }

  findCompanyByNormalizedName(tenantId: string, normalizedName: string) {
    return this.prisma.company.findFirst({
      where: { tenantId, normalizedName },
      include: {
        primaryContact: true,
      },
    });
  }

  createCompany(data: Prisma.CompanyCreateInput) {
    return this.prisma.company.create({
      data,
      include: {
        primaryContact: true,
      },
    });
  }

  updateCompany(id: string, data: Prisma.CompanyUpdateInput) {
    return this.prisma.company.update({
      where: { id },
      data,
      include: {
        primaryContact: true,
      },
    });
  }
}
