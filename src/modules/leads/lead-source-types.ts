import { LeadSourceType } from '@prisma/client';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import fs from 'fs';
import path from 'path';

type BackendConstants = {
  LEAD_SOURCE_TYPES?: unknown;
};

const prismaLeadSourceTypes = Object.values(LeadSourceType) as LeadSourceType[];

const defaultLeadSourceTypes: LeadSourceType[] = [
  LeadSourceType.WEB_FORM,
  LeadSourceType.AI_ASSISTANT,
  LeadSourceType.WHATSAPP,
  LeadSourceType.RESOURCE_DOWNLOAD,
  LeadSourceType.EVENT_REGISTRATION,
  LeadSourceType.EMAIL_INQUIRY,
  LeadSourceType.LINKEDIN,
];

const isLeadSourceType = (value: unknown): value is LeadSourceType =>
  typeof value === 'string' && prismaLeadSourceTypes.includes(value as LeadSourceType);

const unique = (values: LeadSourceType[]) => Array.from(new Set(values));

const resolveConstantsPath = () => {
  const candidates = [
    path.resolve(process.cwd(), 'constant.js'),
    path.resolve(process.cwd(), 'backend', 'constant.js'),
    path.resolve(__dirname, '../../../constant.js'),
    path.resolve(__dirname, '../../../../constant.js'),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate));
};

const loadLeadSourceTypesFromConstants = (): LeadSourceType[] => {
  try {
    const constantsPath = resolveConstantsPath();
    if (!constantsPath) {
      return defaultLeadSourceTypes;
    }

    delete require.cache[require.resolve(constantsPath)];
    const constants = require(constantsPath) as BackendConstants;
    const raw = constants.LEAD_SOURCE_TYPES;

    if (!Array.isArray(raw)) {
      return defaultLeadSourceTypes;
    }

    const configured = raw.filter(isLeadSourceType);
    return configured.length > 0 ? unique(configured) : defaultLeadSourceTypes;
  } catch {
    return defaultLeadSourceTypes;
  }
};

export const getAllowedLeadSourceTypes = () => loadLeadSourceTypesFromConstants();

export const ALLOWED_LEAD_SOURCE_TYPES = getAllowedLeadSourceTypes();

export const isAllowedLeadSourceType = (value: unknown): value is LeadSourceType =>
  typeof value === 'string' && getAllowedLeadSourceTypes().includes(value as LeadSourceType);

@ValidatorConstraint({ name: 'isAllowedLeadSourceType', async: false })
export class AllowedLeadSourceTypeConstraint implements ValidatorConstraintInterface {
  validate(value: unknown) {
    return isAllowedLeadSourceType(value);
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} must be one of the following values: ${getAllowedLeadSourceTypes().join(', ')}`;
  }
}

export const IsAllowedLeadSourceType = (validationOptions?: ValidationOptions) =>
  (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: AllowedLeadSourceTypeConstraint,
    });
  };
