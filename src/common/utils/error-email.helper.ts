import { Logger } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';
import path from 'path';

type ErrorContext = Record<string, unknown>;

type NotifyProductionErrorParams = {
  functionName: string;
  error: unknown;
  context?: ErrorContext;
};

const logger = new Logger('ErrorEmailHelper');
let transporter: Transporter | null | undefined;
let recipientLoadFailed = false;
let configWarningShown = false;

const normalizeError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    name: 'UnknownError',
    message: typeof error === 'string' ? error : 'Unknown error',
    stack: undefined,
  };
};

const safeStringify = (value: unknown) => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return '[unserializable context]';
  }
};

const isProductionEnvironment = () => (process.env.NODE_ENV ?? '').toLowerCase() === 'production';

const loadRecipients = (): string[] => {
  try {
    const constantsPath = path.resolve(process.cwd(), 'constant.js');
    const constants = require(constantsPath) as {
      ERROR_ALERT_EMAILS?: unknown;
      errorAlertEmails?: unknown;
      ERROR_EMAILS?: unknown;
    };

    const rawRecipients =
      constants.ERROR_ALERT_EMAILS ?? constants.errorAlertEmails ?? constants.ERROR_EMAILS ?? [];

    if (!Array.isArray(rawRecipients)) {
      return [];
    }

    return rawRecipients
      .filter((recipient): recipient is string => typeof recipient === 'string')
      .map((recipient) => recipient.trim())
      .filter(Boolean);
  } catch (error) {
    if (!recipientLoadFailed) {
      recipientLoadFailed = true;
      logger.warn(
        `Unable to load production error email recipients from constant.js: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }

    return [];
  }
};

const getTransporter = (): Transporter | null => {
  if (transporter !== undefined) {
    return transporter;
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 0);
  const from = process.env.SMTP_FROM;
  const secure =
    (process.env.SMTP_SECURE ?? '').toLowerCase() === 'true' || Number(process.env.SMTP_PORT) === 465;

  if (!host || !port || !from) {
    if (!configWarningShown) {
      configWarningShown = true;
      logger.warn(
        'SMTP configuration is incomplete. Set SMTP_HOST, SMTP_PORT, and SMTP_FROM to enable production error emails.',
      );
    }

    transporter = null;
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
  });

  return transporter;
};

export const notifyProductionError = async ({
  functionName,
  error,
  context,
}: NotifyProductionErrorParams) => {
  if (!isProductionEnvironment()) {
    return;
  }

  const recipients = loadRecipients();
  if (recipients.length === 0) {
    return;
  }

  const mailTransporter = getTransporter();
  if (!mailTransporter) {
    return;
  }

  const normalizedError = normalizeError(error);
  const stackPreview = normalizedError.stack?.split('\n').slice(0, 12).join('\n') ?? 'No stack trace';

  const subject = `[ERP][PROD] ${functionName} failed`;
  const text = [
    `Environment: ${process.env.NODE_ENV ?? 'unknown'}`,
    `Function: ${functionName}`,
    `Error Name: ${normalizedError.name}`,
    `Error Message: ${normalizedError.message}`,
    `Occurred At: ${new Date().toISOString()}`,
    '',
    'Context:',
    safeStringify(context ?? {}),
    '',
    'Stack:',
    stackPreview,
  ].join('\n');

  try {
    await mailTransporter.sendMail({
      from: process.env.SMTP_FROM,
      to: recipients.join(','),
      subject,
      text,
    });
  } catch (sendError) {
    logger.error(
      `Failed to send production error email for ${functionName}`,
      sendError instanceof Error ? sendError.stack : undefined,
    );
  }
};
