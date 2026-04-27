import '@puckeditor/core/puck.css';

import { Puck, type Config, type Data, type Slot } from '@puckeditor/core';
import { EditIcon } from '@storybook/icons';
import type { API_PreparedStoryIndex, StoryEntry } from 'storybook/manager-api';
import { useStorybookApi, useStorybookState } from 'storybook/manager-api';
import { Button, H1, IconButton, Link, Placeholder } from 'storybook/internal/components';
import React, { useEffect, useId, useMemo, useState } from 'react';
import { styled } from 'storybook/theming';

import { STORAGE_KEY } from '../constants';

interface TabProps {
  active?: boolean;
}

type BuilderData = Data;

type PageBuilderSlots =
  | string[]
  | Record<
      string,
      {
        allow?: string[];
      }
    >;

type PageBuilderParameter = {
  enabled?: boolean;
  label?: string;
  category?: string;
  fields?: Record<string, unknown>;
  defaultProps?: Record<string, unknown>;
  includeArgs?: string[];
  excludeArgs?: string[];
  description?: string;
  slots?: PageBuilderSlots;
};

type PrimitiveFieldValue = string | number | boolean;

type DiscoveredBuilderEntry = {
  storyId: string;
  title: string;
  name: string;
  label: string;
  category: string;
  description?: string;
  defaultProps: Record<string, unknown>;
  fields: NonNullable<Config['components']>[string]['fields'];
  pageBuilder: PageBuilderParameter;
  slotNames: string[];
  unsupportedReason?: string;
};

type DiscoveredStoryCandidate = {
  entry: DiscoveredBuilderEntry;
  componentLabel: string;
  componentCategory: string;
};

type BuilderComponentDefinition = {
  label: string;
  category: string;
  fields: NonNullable<Config['components']>[string]['fields'];
  defaultProps?: Record<string, unknown>;
  render: NonNullable<Config['components']>[string]['render'];
};

const TabWrapper = styled.div(({ theme }) => ({
  background: `linear-gradient(180deg, ${theme.appBg} 0%, ${theme.appContentBg} 100%)`,
  color: theme.textColor,
  width: '100%',
  height: '100%',
  minHeight: 0,
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
}));

const TabInner = styled.div({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  minWidth: 0,
  width: '100%',
});

const Actions = styled.div({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.75rem',
  alignItems: 'center',
  justifyContent: 'flex-end',
});

const BuilderShell = styled.div(({ theme }) => ({
  flex: 1,
  minHeight: 0,
  minWidth: 0,
  width: '100%',
  background: theme.appContentBg,
  overflow: 'hidden',
  boxShadow: theme.base === 'light' ? 'inset 0 1px 0 rgba(15, 23, 42, 0.03)' : 'none',
}));

const Note = styled.p(({ theme }) => ({
  margin: 0,
  color: theme.textMutedColor,
  maxWidth: 760,
}));

const ImportArea = styled.textarea(({ theme }) => ({
  width: '100%',
  minHeight: 180,
  resize: 'vertical',
  boxSizing: 'border-box',
  borderRadius: 12,
  border: `1px solid ${theme.appBorderColor}`,
  background: theme.base === 'light' ? '#f8fafc' : theme.appBg,
  color: theme.textColor,
  padding: '0.875rem 1rem',
  fontFamily: theme.fontCode,
  fontSize: 12,
  lineHeight: 1.5,
}));

const StatusText = styled.span(({ theme }) => ({
  color: theme.textMutedColor,
  fontSize: 12,
}));

const ModalBackdrop = styled.div({
  position: 'fixed',
  inset: 0,
  background: 'rgba(15, 23, 42, 0.42)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem',
  zIndex: 1000,
  backdropFilter: 'blur(4px)',
});

const ModalCard = styled.div(({ theme }) => ({
  width: 'min(880px, 100%)',
  maxHeight: 'min(80vh, 900px)',
  background: theme.appContentBg,
  border: `1px solid ${theme.appBorderColor}`,
  borderRadius: 18,
  boxShadow: '0 30px 80px rgba(15, 23, 42, 0.22)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
}));

const ModalHeader = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '1rem',
  padding: '1rem 1.25rem',
  borderBottom: `1px solid ${theme.appBorderColor}`,
}));

const ModalBody = styled.div({
  padding: '1.25rem',
  overflow: 'auto',
});

const StoryPreviewFrame = styled.iframe({
  width: '100%',
  minHeight: 320,
  border: 'none',
  borderRadius: 18,
  background: '#ffffff',
});

const StoryPreviewCard = styled.div({
  display: 'grid',
  gap: '0.875rem',
});

const StoryPreviewMeta = styled.div({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem',
  alignItems: 'center',
});

const StoryPreviewBadge = styled.span({
  display: 'inline-flex',
  alignItems: 'center',
  borderRadius: 999,
  background: '#dbeafe',
  color: '#1d4ed8',
  padding: '0.25rem 0.625rem',
  fontSize: '0.75rem',
  fontWeight: 700,
});

const editorViewports = [
  { width: 1200, label: 'Desktop', icon: 'Monitor' },
  { width: 768, label: 'Tablet', icon: 'Tablet' },
  { width: 375, label: 'Mobile', icon: 'Smartphone' },
] as const;

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const getTitleSegments = (title: string) =>
  title
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object';

const isSerializablePrimitive = (value: unknown): value is PrimitiveFieldValue =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';

const isSerializableValue = (value: unknown): value is PrimitiveFieldValue | null | undefined =>
  value == null || isSerializablePrimitive(value);

const createItemId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `puck-${Math.random().toString(36).slice(2, 10)}`;
};

const isComponentRecord = (value: unknown): value is { type: string; props: Record<string, unknown> } => {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.type === 'string' && isRecord(value.props);
};

const getPageBuilderParameter = (parameters: unknown): PageBuilderParameter => {
  if (!isRecord(parameters) || !isRecord(parameters.pageBuilder)) {
    return {};
  }

  return parameters.pageBuilder as PageBuilderParameter;
};

const getSlotNames = (slots: PageBuilderSlots | undefined) => {
  if (!slots) {
    return [];
  }

  return Array.isArray(slots) ? slots.filter((slot): slot is string => typeof slot === 'string') : Object.keys(slots);
};

const getControlType = (argType: unknown): string | undefined => {
  if (!isRecord(argType)) {
    return undefined;
  }

  if (typeof argType.control === 'string') {
    return argType.control;
  }

  if (isRecord(argType.control) && typeof argType.control.type === 'string') {
    return argType.control.type;
  }

  return undefined;
};

const getControlOptions = (argType: unknown): PrimitiveFieldValue[] | undefined => {
  if (!isRecord(argType) || !Array.isArray(argType.options)) {
    return undefined;
  }

  const options = argType.options.filter(isSerializablePrimitive);

  return options.length > 0 ? options : undefined;
};

const toFieldOptions = (options: PrimitiveFieldValue[]) =>
  options.map((option) => ({
    label: typeof option === 'boolean' ? (option ? 'True' : 'False') : String(option),
    value: option,
  }));

const inferField = (argName: string, argType: unknown, value: unknown) => {
  const controlType = getControlType(argType);
  const options = getControlOptions(argType);

  if (options && controlType === 'radio') {
    return {
      type: 'radio',
      options: toFieldOptions(options),
    };
  }

  if (options) {
    return {
      type: 'select',
      options: toFieldOptions(options),
    };
  }

  if (controlType === 'boolean' || typeof value === 'boolean') {
    return {
      type: 'radio',
      options: [
        { label: 'True', value: true },
        { label: 'False', value: false },
      ],
    };
  }

  if (controlType === 'number' || typeof value === 'number') {
    return { type: 'number' };
  }

  if (typeof value === 'string' || controlType === 'text' || controlType === 'color') {
    const shouldUseTextarea =
      typeof value === 'string' && (value.length > 120 || argName.toLowerCase().includes('description'));
    return { type: shouldUseTextarea ? 'textarea' : 'text' };
  }

  return null;
};

const normalizeComponentList = (items: unknown, allowedTypes: Set<string>): unknown => {
  if (!Array.isArray(items)) {
    return items;
  }

  return items.flatMap((item) => {
    if (!isComponentRecord(item) || !allowedTypes.has(item.type)) {
      return [];
    }

    const normalizedProps = Object.fromEntries(
      Object.entries(item.props).map(([key, value]) => [
        key,
        Array.isArray(value) ? normalizeComponentList(value, allowedTypes) : value,
      ]),
    );

    return [
      {
        ...item,
        props: {
          ...normalizedProps,
          id: typeof item.props.id === 'string' && item.props.id.length > 0 ? item.props.id : createItemId(),
        },
      },
    ];
  });
};

const normalizeBuilderData = (value: BuilderData, allowedTypes: Set<string>): BuilderData => ({
  ...value,
  content: normalizeComponentList(value.content, allowedTypes) as BuilderData['content'],
  zones: value.zones
    ? Object.fromEntries(
        Object.entries(value.zones).map(([zone, items]) => [zone, normalizeComponentList(items, allowedTypes)]),
      )
    : value.zones,
});

const buildIframeSrc = (storyId: string, props: Record<string, unknown>) => {
  if (typeof window === 'undefined') {
    return '';
  }

  const url = new URL('./iframe.html', window.location.href);
  url.searchParams.set('id', storyId);
  url.searchParams.set('viewMode', 'story');

  const argPairs = Object.entries(props).flatMap(([key, value]) => {
    if (key === 'id' || !isSerializableValue(value)) {
      return [];
    }

    return [`${key}:${String(value)}`];
  });

  if (argPairs.length > 0) {
    url.searchParams.set('args', argPairs.join(';'));
  }

  return url.toString();
};

const StorybookBridgeBlock = ({ entry, props }: { entry: DiscoveredBuilderEntry; props: Record<string, unknown> }) => {
  if (entry.unsupportedReason) {
    return (
      <Placeholder>
        <div>
          <strong>{entry.label}</strong>
        </div>
        <div style={{ marginTop: '0.5rem' }}>{entry.unsupportedReason}</div>
      </Placeholder>
    );
  }

  return (
    <StoryPreviewCard>
      <StoryPreviewMeta>
        <StoryPreviewBadge>{entry.category}</StoryPreviewBadge>
        <StoryPreviewBadge>{entry.storyId}</StoryPreviewBadge>
      </StoryPreviewMeta>
      <StoryPreviewFrame src={buildIframeSrc(entry.storyId, props)} title={entry.label} />
    </StoryPreviewCard>
  );
};

const TextBlock = ({ text, align }: { text: string; align?: 'left' | 'center' | 'right' }) => (
  <p
    style={{
      margin: 0,
      fontSize: '1rem',
      lineHeight: 1.7,
      textAlign: align ?? 'left',
      color: '#1f2937',
    }}
  >
    {text}
  </p>
);

const CardBlock = ({
  title,
  eyebrow,
  background,
  content: Content,
}: {
  title: string;
  eyebrow?: string;
  background?: string;
  content: Slot;
}) => (
  <section
    style={{
      borderRadius: 20,
      border: '1px solid rgba(15, 23, 42, 0.08)',
      background: background ?? '#ffffff',
      padding: '1.25rem',
      boxShadow: '0 16px 40px rgba(15, 23, 42, 0.08)',
    }}
  >
    {eyebrow ? (
      <div
        style={{
          marginBottom: '0.5rem',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontSize: '0.75rem',
          color: '#64748b',
          fontWeight: 700,
        }}
      >
        {eyebrow}
      </div>
    ) : null}
    <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.25rem', color: '#0f172a' }}>{title}</h3>
    <Content minEmptyHeight={80} allow={['Text', 'Button']} />
  </section>
);

const SectionBlock = ({
  title,
  tone,
  content: Content,
}: {
  title: string;
  tone?: 'light' | 'brand' | 'dark';
  content: Slot;
}) => {
  const tones = {
    light: {
      background: '#f8fafc',
      border: 'rgba(148, 163, 184, 0.32)',
      color: '#0f172a',
    },
    brand: {
      background: 'linear-gradient(135deg, #dbeafe 0%, #f8fafc 100%)',
      border: 'rgba(37, 99, 235, 0.20)',
      color: '#0f172a',
    },
    dark: {
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      border: 'rgba(148, 163, 184, 0.20)',
      color: '#f8fafc',
    },
  } as const;

  const selectedTone = tones[tone ?? 'light'];

  return (
    <section
      style={{
        padding: '2rem',
        borderRadius: 28,
        border: `1px solid ${selectedTone.border}`,
        background: selectedTone.background,
        color: selectedTone.color,
      }}
    >
      <div style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 700 }}>{title}</div>
      <Content minEmptyHeight={160} allow={['Text', 'Card', 'Button', 'Stack']} />
    </section>
  );
};

const StackBlock = ({ gap, direction, items: Items }: { gap?: number; direction?: 'row' | 'column'; items: Slot }) => (
  <Items
    minEmptyHeight={72}
    allow={['Text', 'Card', 'Button']}
    style={{
      display: 'flex',
      flexDirection: direction ?? 'column',
      gap: `${gap ?? 16}px`,
      alignItems: 'stretch',
    }}
    collisionAxis={direction === 'row' ? 'x' : 'y'}
  />
);

const ButtonBlock = ({ label, variant }: { label: string; variant?: 'primary' | 'secondary' }) => (
  <button
    type="button"
    style={{
      borderRadius: 999,
      border: variant === 'secondary' ? '1px solid #94a3b8' : 'none',
      background: variant === 'secondary' ? '#ffffff' : '#2563eb',
      color: variant === 'secondary' ? '#0f172a' : '#ffffff',
      padding: '0.75rem 1rem',
      fontWeight: 700,
      cursor: 'pointer',
    }}
  >
    {label}
  </button>
);

const fallbackRegistry: Record<string, BuilderComponentDefinition> = {
  Text: {
    label: 'Text',
    category: 'Content',
    fields: {
      text: { type: 'textarea' },
      align: {
        type: 'radio',
        options: [
          { label: 'Left', value: 'left' },
          { label: 'Center', value: 'center' },
          { label: 'Right', value: 'right' },
        ],
      },
    },
    defaultProps: {
      text: 'Describe your section, highlight a feature, or sketch the story you want to tell.',
      align: 'left',
    },
    render: TextBlock,
  },
  Button: {
    label: 'Button',
    category: 'Content',
    fields: {
      label: { type: 'text' },
      variant: {
        type: 'select',
        options: [
          { label: 'Primary', value: 'primary' },
          { label: 'Secondary', value: 'secondary' },
        ],
      },
    },
    defaultProps: {
      label: 'Call to action',
      variant: 'primary',
    },
    render: ButtonBlock,
  },
  Card: {
    label: 'Card',
    category: 'Layout',
    fields: {
      eyebrow: { type: 'text' },
      title: { type: 'text' },
      background: { type: 'text' },
      content: {
        type: 'slot',
        allow: ['Text', 'Button'],
      },
    },
    defaultProps: {
      eyebrow: 'Feature',
      title: 'A reusable card',
      background: '#ffffff',
      content: [],
    },
    render: CardBlock,
  },
  Section: {
    label: 'Section',
    category: 'Layout',
    fields: {
      title: { type: 'text' },
      tone: {
        type: 'select',
        options: [
          { label: 'Light', value: 'light' },
          { label: 'Brand', value: 'brand' },
          { label: 'Dark', value: 'dark' },
        ],
      },
      content: {
        type: 'slot',
        allow: ['Text', 'Card', 'Button', 'Stack'],
      },
    },
    defaultProps: {
      title: 'New section',
      tone: 'light',
      content: [],
    },
    render: SectionBlock,
  },
  Stack: {
    label: 'Stack',
    category: 'Layout',
    fields: {
      direction: {
        type: 'radio',
        options: [
          { label: 'Column', value: 'column' },
          { label: 'Row', value: 'row' },
        ],
      },
      gap: { type: 'number' },
      items: {
        type: 'slot',
        allow: ['Text', 'Card', 'Button'],
      },
    },
    defaultProps: {
      direction: 'column',
      gap: 16,
      items: [],
    },
    render: StackBlock,
  },
};

const fallbackInitialData: BuilderData = {
  root: {
    props: {
      title: 'Storybook Page Builder',
      description:
        'No builder-friendly Storybook stories were discovered yet. The fallback demo registry is active while you add simple args, argTypes or parameters.pageBuilder metadata.',
    },
  },
  content: [
    {
      type: 'Section',
      props: {
        id: 'section-hero',
        title: 'Hero section',
        tone: 'brand',
        content: [
          {
            type: 'Text',
            props: {
              id: 'text-hero-copy',
              text: 'Use this editor to combine a small set of curated components and prove the Storybook integration.',
              align: 'left',
            },
          },
          {
            type: 'Stack',
            props: {
              id: 'stack-hero-actions',
              direction: 'row',
              gap: 16,
              items: [
                {
                  type: 'Card',
                  props: {
                    id: 'card-nested-proof',
                    eyebrow: 'Nested',
                    title: 'Card inside a section',
                    background: '#ffffff',
                    content: [
                      {
                        type: 'Text',
                        props: {
                          id: 'text-card-copy',
                          text: 'This card is editable and lives inside a slot-powered layout.',
                          align: 'left',
                        },
                      },
                    ],
                  },
                },
                {
                  type: 'Button',
                  props: {
                    id: 'button-primary-action',
                    label: 'Primary action',
                    variant: 'primary',
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
};

const getEmptyInitialData = (): BuilderData => ({
  root: {
    props: {
      title: 'Storybook Page Builder',
      description:
        'Auto-discovered Storybook stories are available in the sidebar. Use parameters.pageBuilder to refine labels, categories, supported fields and slots.',
    },
  },
  content: [],
});

const createBuilderConfig = (
  registry: Record<string, BuilderComponentDefinition>,
  categories: Record<string, { title: string; components: string[] }>,
): Config => ({
  components: Object.fromEntries(
    Object.entries(registry).map(([type, definition]) => [
      type,
      {
        label: definition.label,
        fields: definition.fields,
        defaultProps: definition.defaultProps,
        render: definition.render,
      },
    ]),
  ),
  categories,
  root: {
    fields: {
      title: { type: 'text' },
      description: { type: 'textarea' },
    },
    defaultProps: {
      title: 'Storybook Page Builder',
      description: 'Build pages from discovered Storybook stories.',
    },
    render: ({ title, description, children }) => (
      <main
        style={{
          minHeight: '100%',
          padding: '2rem 0',
          background: 'linear-gradient(180deg, #ffffff 0%, #eff6ff 100%)',
        }}
      >
        <div style={{ width: '100%' }}>
          <header style={{ marginBottom: '1.5rem' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                borderRadius: 999,
                background: '#dbeafe',
                color: '#1d4ed8',
                padding: '0.35rem 0.75rem',
                fontSize: '0.875rem',
                fontWeight: 700,
                marginBottom: '0.75rem',
              }}
            >
              Page Builder
            </div>
            <h1 style={{ margin: 0, fontSize: '2rem', color: '#0f172a' }}>{title}</h1>
            <p style={{ margin: '0.75rem 0 0', color: '#475569', fontSize: '1rem', lineHeight: 1.6 }}>{description}</p>
          </header>
          <div style={{ display: 'grid', gap: '1rem' }}>{children}</div>
        </div>
      </main>
    ),
  },
});

const buildDiscoveredEntry = (
  story: StoryEntry,
  indexEntry: Record<string, unknown>,
): DiscoveredBuilderEntry | null => {
  const pageBuilder = getPageBuilderParameter(story.parameters);

  if (pageBuilder.enabled === false) {
    return null;
  }

  const slotNames = getSlotNames(pageBuilder.slots);
  const explicitFields = isRecord(pageBuilder.fields)
    ? (pageBuilder.fields as NonNullable<Config['components']>[string]['fields'])
    : {};
  const explicitDefaultProps = isRecord(pageBuilder.defaultProps) ? pageBuilder.defaultProps : {};
  const storyArgs = isRecord(story.args) ? story.args : {};
  const argTypes = isRecord(story.argTypes) ? story.argTypes : {};
  const includeArgs = Array.isArray(pageBuilder.includeArgs) ? new Set(pageBuilder.includeArgs) : null;
  const excludeArgs = new Set(Array.isArray(pageBuilder.excludeArgs) ? pageBuilder.excludeArgs : []);
  const candidateArgNames = new Set([
    ...Object.keys(storyArgs),
    ...Object.keys(argTypes),
    ...Object.keys(explicitFields),
  ]);
  const fields: NonNullable<Config['components']>[string]['fields'] = {};
  const defaultProps: Record<string, unknown> = {};

  candidateArgNames.forEach((argName) => {
    if (slotNames.includes(argName) || excludeArgs.has(argName)) {
      return;
    }

    if (includeArgs && !includeArgs.has(argName) && !(argName in explicitFields)) {
      return;
    }

    const explicitField = explicitFields[argName];
    const inferredField = explicitField ?? inferField(argName, argTypes[argName], storyArgs[argName]);

    if (!inferredField) {
      return;
    }

    fields[argName] = inferredField;

    if (argName in explicitDefaultProps) {
      defaultProps[argName] = explicitDefaultProps[argName];
      return;
    }

    if (isSerializableValue(storyArgs[argName])) {
      defaultProps[argName] = storyArgs[argName];
    }
  });

  let unsupportedReason: string | undefined;

  if (slotNames.length > 0) {
    unsupportedReason =
      'This story declares pageBuilder slots. Slot-aware rendering is not wired for this story shape yet, so the bridge shows a safe placeholder instead of crashing.';
  } else if (Object.keys(fields).length === 0) {
    unsupportedReason =
      'No supported primitive controls were detected. Add simple args/argTypes or override fields with parameters.pageBuilder.';
  }

  if (!unsupportedReason && typeof indexEntry.componentPath !== 'string' && typeof story.importPath !== 'string') {
    unsupportedReason = 'Storybook did not expose component-backed metadata for this story.';
  }

  if (Object.keys(fields).length === 0 && !unsupportedReason) {
    return null;
  }

  return {
    storyId: story.id,
    title: story.title,
    name: story.name,
    label: pageBuilder.label ?? story.name,
    category: pageBuilder.category ?? story.title,
    description: pageBuilder.description,
    defaultProps,
    fields,
    pageBuilder,
    slotNames,
    unsupportedReason,
  };
};

const getComponentLabel = (entry: DiscoveredBuilderEntry) => {
  const titleSegments = getTitleSegments(entry.title);

  return titleSegments.at(-1) ?? entry.label;
};

const getComponentCategory = (entry: DiscoveredBuilderEntry) => {
  const titleSegments = getTitleSegments(entry.title);

  if (titleSegments.length <= 1) {
    return entry.category;
  }

  return titleSegments.slice(0, -1).join(' / ');
};

const getStoryPriority = (entry: DiscoveredBuilderEntry) => {
  const normalizedName = entry.name.toLowerCase().replace(/\s+/g, '');

  if (normalizedName === 'default') {
    return 0;
  }

  if (normalizedName === 'primary') {
    return 1;
  }

  if (normalizedName === 'basic' || normalizedName === 'base') {
    return 2;
  }

  return 10;
};

const discoverBuilderEntries = (index: API_PreparedStoryIndex | undefined, api: ReturnType<typeof useStorybookApi>) => {
  if (!index) {
    return null;
  }

  const candidates = Object.values(index.entries)
    .filter((entry) => entry.type === 'story' && entry.subtype === 'story')
    .map((entry) => {
      const story = api.getData(entry.id) as StoryEntry | undefined;

      if (!story || story.type !== 'story') {
        return null;
      }

      const discoveredEntry = buildDiscoveredEntry(story, entry as unknown as Record<string, unknown>);

      if (!discoveredEntry) {
        return null;
      }

      return {
        entry: discoveredEntry,
        componentLabel: getComponentLabel(discoveredEntry),
        componentCategory: getComponentCategory(discoveredEntry),
      } satisfies DiscoveredStoryCandidate;
    })
    .filter((candidate): candidate is DiscoveredStoryCandidate => !!candidate);

  const byTitle = new Map<string, DiscoveredStoryCandidate>();

  candidates.forEach((candidate) => {
    const existing = byTitle.get(candidate.entry.title);

    if (!existing) {
      byTitle.set(candidate.entry.title, candidate);
      return;
    }

    const existingPriority = getStoryPriority(existing.entry);
    const candidatePriority = getStoryPriority(candidate.entry);

    if (candidatePriority < existingPriority) {
      byTitle.set(candidate.entry.title, candidate);
    }
  });

  return Array.from(byTitle.values())
    .map(({ entry, componentCategory, componentLabel }) => ({
      ...entry,
      category: componentCategory,
      label: componentLabel,
    }))
    .sort((left, right) => left.category.localeCompare(right.category) || left.label.localeCompare(right.label));
};

const createDiscoveredRegistry = (entries: DiscoveredBuilderEntry[]): Record<string, BuilderComponentDefinition> =>
  Object.fromEntries(
    entries.map((entry) => [
      entry.storyId,
      {
        label: entry.label,
        category: entry.category,
        fields: entry.fields,
        defaultProps: entry.defaultProps,
        render: (props: Record<string, unknown>) => <StorybookBridgeBlock entry={entry} props={props} />,
      },
    ]),
  );

const createDiscoveredCategories = (entries: DiscoveredBuilderEntry[]) =>
  Object.fromEntries(
    entries.reduce<Array<[string, { title: string; components: string[] }]>>((accumulator, entry) => {
      const key = slugify(entry.category) || 'stories';
      const existing = accumulator.find(([existingKey]) => existingKey === key);

      if (existing) {
        existing[1].components.push(entry.storyId);
        return accumulator;
      }

      accumulator.push([
        key,
        {
          title: entry.category,
          components: [entry.storyId],
        },
      ]);

      return accumulator;
    }, []),
  );

const parseStoredData = (rawData: string | null, allowedTypes: Set<string>): BuilderData | null => {
  if (!rawData) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawData) as BuilderData;

    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    return normalizeBuilderData(parsed, allowedTypes);
  } catch {
    return null;
  }
};

export const Tab: React.FC<TabProps> = ({ active }) => {
  const api = useStorybookApi();
  const storybookState = useStorybookState();
  const textareaId = useId();
  const storyIndex = api.getIndex() as API_PreparedStoryIndex | undefined;

  const discoveredEntries = useMemo(() => discoverBuilderEntries(storyIndex, api), [api, storyIndex, storybookState]);
  const isDiscoveryReady = !!storyIndex;
  const usingDiscoveredEntries = (discoveredEntries?.length ?? 0) > 0;
  const shouldUseFallbackRegistry = isDiscoveryReady && !usingDiscoveredEntries;
  const activeRegistry = useMemo(
    () => (usingDiscoveredEntries ? createDiscoveredRegistry(discoveredEntries ?? []) : fallbackRegistry),
    [discoveredEntries, usingDiscoveredEntries],
  );
  const activeCategories = useMemo(
    () =>
      usingDiscoveredEntries
        ? createDiscoveredCategories(discoveredEntries ?? [])
        : {
            layout: {
              title: 'Layout',
              components: ['Section', 'Stack', 'Card'],
            },
            content: {
              title: 'Content',
              components: ['Text', 'Button'],
            },
          },
    [discoveredEntries, usingDiscoveredEntries],
  );
  const builderConfig = useMemo(
    () => createBuilderConfig(activeRegistry, activeCategories),
    [activeCategories, activeRegistry],
  );
  const availableTypes = useMemo(() => new Set(Object.keys(activeRegistry)), [activeRegistry]);
  const defaultData = useMemo(
    () => normalizeBuilderData(shouldUseFallbackRegistry ? fallbackInitialData : getEmptyInitialData(), availableTypes),
    [availableTypes, shouldUseFallbackRegistry],
  );

  const [data, setData] = useState<BuilderData>(defaultData);
  const [serializedData, setSerializedData] = useState(() => JSON.stringify(defaultData, null, 2));
  const [status, setStatus] = useState('Ready');
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);

  useEffect(() => {
    if (!active) {
      return;
    }

    const storedData = parseStoredData(window.localStorage.getItem(STORAGE_KEY), availableTypes);

    if (storedData) {
      setData(storedData);
      setSerializedData(JSON.stringify(storedData, null, 2));
      setStatus('Loaded draft from localStorage');
      return;
    }

    setData(defaultData);
    setSerializedData(JSON.stringify(defaultData, null, 2));
  }, [active, availableTypes, defaultData]);

  useEffect(() => {
    if (!active) {
      return;
    }

    const normalizedData = normalizeBuilderData(data, availableTypes);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedData));
    setSerializedData(JSON.stringify(normalizedData, null, 2));
  }, [active, availableTypes, data]);

  useEffect(() => {
    if (!isJsonModalOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsJsonModalOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isJsonModalOpen]);

  if (!active) {
    return null;
  }

  if (!isDiscoveryReady) {
    return (
      <TabWrapper>
        <TabInner>
          <BuilderShell>
            <Placeholder style={{ margin: '1.5rem' }}>
              Loading Storybook stories for the page builder sidebar.
            </Placeholder>
          </BuilderShell>
        </TabInner>
      </TabWrapper>
    );
  }

  const copyJson = async () => {
    const nextValue = JSON.stringify(normalizeBuilderData(data, availableTypes), null, 2);

    try {
      await navigator.clipboard.writeText(nextValue);
      setSerializedData(nextValue);
      setStatus('Copied JSON to clipboard');
    } catch {
      setSerializedData(nextValue);
      setStatus('Clipboard unavailable, but JSON is shown below');
    }
  };

  const importJson = () => {
    const parsed = parseStoredData(serializedData, availableTypes);

    if (!parsed) {
      setStatus('Import failed: invalid JSON payload');
      return;
    }

    setData(parsed);
    setStatus('Imported JSON into the builder');
  };

  return (
    <TabWrapper>
      <TabInner>
        <BuilderShell>
          <Puck
            config={builderConfig}
            data={data}
            onChange={(nextData) => {
              setData(normalizeBuilderData(nextData as BuilderData, availableTypes));
              setStatus('Draft saved locally');
            }}
            onPublish={async (nextData) => {
              setData(normalizeBuilderData(nextData as BuilderData, availableTypes));
              setStatus('Publish triggered and draft saved locally');
            }}
            renderHeaderActions={({ children }) => (
              <>
                {children}
                <IconButton
                  title="Open JSON workspace"
                  onClick={() => {
                    setSerializedData(JSON.stringify(normalizeBuilderData(data, availableTypes), null, 2));
                    setIsJsonModalOpen(true);
                  }}
                >
                  <EditIcon />
                </IconButton>
              </>
            )}
            height="100%"
            viewports={editorViewports}
          />
        </BuilderShell>
      </TabInner>
      {isJsonModalOpen ? (
        <ModalBackdrop
          onClick={() => {
            setIsJsonModalOpen(false);
          }}
        >
          <ModalCard
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <ModalHeader>
              <div>
                <H1 style={{ fontSize: '1.25rem', margin: 0 }}>JSON Workspace</H1>
                <Note style={{ marginTop: '0.35rem' }}>
                  {usingDiscoveredEntries
                    ? 'Edit the builder payload. Storybook-discovered stories stay available in the sidebar and render through Storybook preview.'
                    : 'No builder-friendly Storybook stories were discovered yet. The fallback demo registry is active until stories expose simple args, argTypes or parameters.pageBuilder.'}
                </Note>
              </div>
              <Actions>
                <StatusText>{status}</StatusText>
                <Button onClick={copyJson}>Copy JSON</Button>
                <Button primary onClick={importJson}>
                  Import JSON
                </Button>
                <Button
                  onClick={() => {
                    setIsJsonModalOpen(false);
                  }}
                >
                  Close
                </Button>
              </Actions>
            </ModalHeader>
            <ModalBody>
              {!usingDiscoveredEntries ? (
                <Placeholder style={{ marginBottom: '1rem' }}>
                  Add simple serializable story args or <code>parameters.pageBuilder</code> metadata to your Storybook
                  stories to replace the fallback demo blocks with auto-discovered entries.
                </Placeholder>
              ) : null}
              <label htmlFor={textareaId} style={{ display: 'block', margin: '0 0 0.5rem', fontWeight: 700 }}>
                Current builder payload
              </label>
              <ImportArea
                id={textareaId}
                value={serializedData}
                onChange={(event) => {
                  setSerializedData(event.target.value);
                }}
                spellCheck={false}
              />
              <Placeholder style={{ marginTop: '1rem' }}>
                Builder overrides: use <code>parameters.pageBuilder</code> on meta or stories to refine labels,
                categories, fields, defaults and explicit slots.
                <div style={{ marginTop: '0.5rem' }}>
                  Puck docs: <Link href="https://puckeditor.com/docs/getting-started">Getting Started</Link>
                </div>
              </Placeholder>
            </ModalBody>
          </ModalCard>
        </ModalBackdrop>
      ) : null}
    </TabWrapper>
  );
};
