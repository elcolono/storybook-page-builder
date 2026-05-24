# Storybook Page Builder

`storybook-page-builder` is a React-focused Storybook 9 addon that adds a visual page builder tab powered by [Puck](https://puckeditor.com/). It lets teams prototype real features and pages from the components already documented in Storybook.

## Features

- Discovers component-backed Storybook stories and exposes them as Puck components
- Maps primitive Storybook `args` and `argTypes` to editable Puck fields
- Supports `parameters.pageBuilder` for labels, categories, field overrides, defaults, filtering, descriptions, and explicit slots
- Renders the actual React components in the builder canvas
- Provides layout primitives for sections, stacks, grids, and nested slots
- Saves multiple named builds in browser `localStorage`
- Supports build save, save as, load, duplicate, delete, JSON import, and JSON export
- Includes mobile, tablet, desktop, and full-width canvas viewports

## Compatibility

- Storybook: `^9.0.0`
- React: `>=18 <20`
- Frameworks: React Storybooks, including `@storybook/react-vite`

The addon is browser-local by design. Saved builds are stored in `localStorage`, and exported JSON files are the portability mechanism for sharing or backing up prototypes.

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

Start Storybook and open the `Page Builder` tab.

## How Discovery Works

The addon reads Storybook metadata from the preview runtime, where resolved `args`, `argTypes`, and story parameters are available. Component-backed stories become builder entries, deduplicated by component title.

For inferred fields, the addon supports primitive, serializable controls:

- `string` to `text` or `textarea`
- `boolean` to a boolean radio field
- `number` to `number`
- enum/select/radio controls to `select` or `radio`

Complex props are skipped for editable fields and iframe args:

- functions
- objects and arrays
- render props
- `ReactNode`
- implicit `children`

The component still appears in the builder even when some props are skipped.

## Page Builder Parameters

Stories can customize builder behavior with `parameters.pageBuilder` on meta or individual stories.

```ts
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta = {
  component: Button,
  title: 'Forms/Button',
  parameters: {
    pageBuilder: {
      category: 'Marketing',
      excludeArgs: ['onClick'],
    },
  },
} satisfies Meta<typeof Button>;

export default meta;

export const Primary: StoryObj<typeof meta> = {
  args: {
    label: 'Save changes',
    primary: true,
  },
  parameters: {
    pageBuilder: {
      label: 'Primary Button',
      defaultProps: {
        label: 'Start prototype',
      },
    },
  },
};
```

Supported keys:

- `enabled`
- `label`
- `category`
- `fields`
- `defaultProps`
- `includeArgs`
- `excludeArgs`
- `description`
- `slots`

`fields` overrides inferred Puck fields. `defaultProps` override story args for new builder blocks. `includeArgs` and `excludeArgs` filter which props become editable fields. `slots` are explicit-only in this release; the addon does not infer layout regions automatically.

## Build Library

The Page Builder keeps the current draft autosaved and also provides a local build catalog:

- `Save` updates the active build and increases its revision
- `Save as` creates a named copy
- `Builds` opens the local build library
- `Import` accepts an exported build JSON payload
- `Export` downloads the active build as JSON
- `JSON` opens the current builder payload for manual inspection or import

Imported and loaded builds are normalized against the current component registry. If a component type no longer exists, that block is ignored instead of breaking the canvas.

## Development

```sh
pnpm install
pnpm start
```

Useful scripts:

- `pnpm build` builds the addon package into `dist`
- `pnpm build-storybook -- --test --quiet` verifies the addon in a production Storybook build
- `pnpm lint` runs ESLint
- `npm run prerelease` checks publish metadata
- `npm_config_cache=/private/tmp/storybook-builder-npm-cache npm pack --dry-run` previews the npm tarball contents

## Publishing

This repository is prepared for the Storybook Addon Kit release flow:

- `pnpm run release` runs the package build and `auto shipit`
- GitHub Actions publishes through `.github/workflows/release.yml`
- The package requires an `NPM_TOKEN` repository secret before publishing
- Release PRs should be labeled for Auto, for example `minor` for the first `0.1.0` release
