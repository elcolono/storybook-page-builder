import { fileURLToPath } from 'node:url';

export const viteFinal = async (config: unknown) => {
  return config;
};

export const webpack = async (config: unknown) => {
  return config;
};

export const stories = (entries: Array<string | Record<string, unknown>> = []) => [
  ...entries,
  fileURLToPath(import.meta.resolve('./runtime.stories.js')),
];
