import fs from 'fs';
import path from 'path';

type BackendConstants = {
  ITEM_TYPES?: unknown;
};

const FALLBACK_ITEM_TYPES = ['License', 'Subscription', 'Support', 'Implementation'];

const resolveConstantsPath = () => {
  const candidates = [
    path.resolve(process.cwd(), 'constant.js'),
    path.resolve(process.cwd(), 'backend', 'constant.js'),
    path.resolve(__dirname, '../../../constant.js'),
    path.resolve(__dirname, '../../../../constant.js'),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate));
};

export const getDefaultItemTypes = (): string[] => {
  try {
    const constantsPath = resolveConstantsPath();
    if (!constantsPath) {
      return FALLBACK_ITEM_TYPES;
    }

    delete require.cache[require.resolve(constantsPath)];
    const constants = require(constantsPath) as BackendConstants;
    const raw = constants.ITEM_TYPES;

    if (!Array.isArray(raw)) {
      return FALLBACK_ITEM_TYPES;
    }

    const values = raw
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter(Boolean);

    return values.length ? Array.from(new Set(values)) : FALLBACK_ITEM_TYPES;
  } catch {
    return FALLBACK_ITEM_TYPES;
  }
};
