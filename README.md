# Storybook Page Builder

`storybook-page-builder` is a React-focused Storybook addon that embeds [Puck](https://puckeditor.com/) into a dedicated Storybook tab and auto-discovers builder-friendly stories out of the box.

## What It Does

- Reads the Storybook index in the manager and turns builder-friendly stories into Puck sidebar entries
- Maps simple Storybook `args` and `argTypes` to editable Puck fields
- Renders discovered stories through Storybook preview so the canvas shows real Storybook-backed output
- Persists draft builder data in `localStorage`
- Keeps a JSON workspace available for quick import/export while iterating

## Supported Auto-Mapping

The first cut intentionally focuses on primitive, serializable controls:

- `string` -> `text` or `textarea`
- `boolean` -> radio-style boolean field
- `number` -> `number`
- enum/select/radio controls -> `select` or `radio`

These values are skipped safely for now:

- functions
- objects and arrays
- render props
- `ReactNode`
- implicit slots or `children`

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

## Optional Story Overrides

The addon works best when stories already expose simple controls, but teams can refine discovery with `parameters.pageBuilder` on meta or individual stories.

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
    },
  },
};
```

Supported keys in `parameters.pageBuilder`:

- `enabled`
- `label`
- `category`
- `fields`
- `defaultProps`
- `includeArgs`
- `excludeArgs`
- `description`
- `slots`

`slots` are explicit-only in v1. The addon does not infer `children` or layout regions automatically.

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

- perfect support for every Storybook story shape
- automatic slot inference
- file persistence
- non-React Storybooks
- advanced control synchronization beyond primitive args

## Next Likely Steps

- Strengthen slot-aware preview rendering for stories that opt into `parameters.pageBuilder.slots`
- Add broader field mappings for dates, colors, and richer control metadata
- Introduce higher-level tests around discovery, persistence, and invalid JSON recovery
- Explore optional global filtering for very large Storybooks
