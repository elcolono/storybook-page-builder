import { resolve } from 'node:path';

/**
 * to load the built addon in this test Storybook
 */
export function previewAnnotations(entry = []) {
  return [...entry, resolve(__dirname, '../dist/preview.js')];
}

export function managerEntries(entry = []) {
  return [...entry, resolve(__dirname, '../dist/manager.js')];
}

export const viteFinal = async (config: unknown) => config;

export const webpack = async (config: unknown) => config;

export const stories = (entries: Array<string | Record<string, unknown>> = []) => [
  ...entries,
  resolve(__dirname, '../dist/runtime.stories.js'),
];
