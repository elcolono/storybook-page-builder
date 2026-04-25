# Storybook Page Builder

`storybook-page-builder` is an experimental Storybook addon that embeds [Puck](https://puckeditor.com/) directly into a custom Storybook tab. The current MVP is a focused spike: a small curated component registry, nested layout support, and local draft persistence.

## Current MVP

- Puck rendered inside a dedicated Storybook tab
- Manual builder registry for a small React component set
- Nested editing with slot-based layout blocks
- Draft persistence in `localStorage`
- JSON copy/import workflow for quick experimentation

## Install

```sh
npm install --save-dev storybook-page-builder
```

Register the addon in your Storybook config:

```ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  addons: ['storybook-page-builder'],
};

export default config;
```

## Development

```sh
npm install
npm run start
```

Useful scripts:

- `npm run build` builds the addon package
- `npm run build-storybook` verifies the addon inside a production Storybook build
- `npm run lint` runs ESLint

## Scope

This repository currently optimizes for a strong technical spike, not a full builder platform. The following are intentionally out of scope for the first cut:

- automatic Storybook story introspection
- file persistence
- slot/region APIs for external consumers
- controls synchronization
- non-React Storybooks

## Next Likely Steps

- Extract the internal builder registry into a user-facing configuration API
- Allow projects to register their own components instead of relying on the demo registry
- Explore mapping a subset of Storybook metadata into that registry
- Add tests around persistence and invalid JSON recovery
