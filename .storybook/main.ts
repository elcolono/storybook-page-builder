import { resolve } from 'node:path';

import { defineMain } from '@storybook/react-vite/node';

const config = defineMain({
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: ['@storybook/addon-docs', resolve(__dirname, 'local-preset.ts')],
  framework: '@storybook/react-vite',
});

export default config;
