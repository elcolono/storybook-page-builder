import '@puckeditor/core/puck.css';

import {
  ActionBar,
  Puck,
  type Config,
  type ConfigParams,
  type Data,
  type Overrides,
  type Viewports,
} from '@puckeditor/core';
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';

import { ACTIVE_BUILD_ID_KEY, BUILDER_RUNTIME_STORY_ID, BUILDS_STORAGE_KEY, STORAGE_KEY } from '../constants';
import {
  buildPreviewMetadataEntry,
  isRecord,
  isSerializablePrimitive,
  type BuilderFields,
  type PreviewMetadataEntry,
} from '../metadata';

type BuilderComponentProps = Record<string, Record<string, unknown>>;
type BuilderRootProps = Record<string, unknown>;
type BuilderConfigParams = ConfigParams<BuilderComponentProps, BuilderRootProps, string[]>;
type BuilderData = Data<BuilderComponentProps, BuilderRootProps>;
type BuilderConfig = Config<BuilderConfigParams>;

type RuntimeStoryIndexEntry = {
  id: string;
  title: string;
  name: string;
  type?: string;
  subtype?: string;
};

type RuntimeStoryIndex = {
  entries?: Record<string, RuntimeStoryIndexEntry>;
};

type PreviewStory = {
  id?: string;
  title?: string;
  name?: string;
  component?: unknown;
  initialArgs?: unknown;
  argTypes?: unknown;
  parameters?: unknown;
};

type PreviewStoryContext = {
  args?: unknown;
  argTypes?: unknown;
  parameters?: unknown;
  component?: unknown;
};

type PreviewStoryStore = {
  loadStory: (payload: { storyId: string }) => Promise<PreviewStory>;
  getStoryContext: (story: PreviewStory, options?: { forceInitialArgs?: boolean }) => PreviewStoryContext;
};

type StorybookPreviewGlobal = {
  __STORYBOOK_PREVIEW__?: {
    storyStore?: PreviewStoryStore;
  };
};

type DiscoveredBuilderEntry = Omit<PreviewMetadataEntry, 'componentBacked'> & {
  label: string;
  category: string;
  description?: string;
  component: React.ElementType;
};

type BuilderComponentDefinition = {
  label: string;
  category: string;
  fields: BuilderFields;
  defaultProps?: Record<string, unknown>;
  render: (props: Record<string, unknown>) => React.ReactElement;
};

type DiscoveryState =
  | {
      status: 'loading';
      entries: DiscoveredBuilderEntry[];
    }
  | {
      status: 'loaded';
      entries: DiscoveredBuilderEntry[];
    }
  | {
      status: 'error';
      entries: DiscoveredBuilderEntry[];
      message: string;
    };

type StoredBuildRecord = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
  registryKey: string;
  data: BuilderData;
};

type BuildExportPayload = {
  schemaVersion: 1;
  exportedAt: string;
  build: StoredBuildRecord;
};

type NameModalState =
  | {
      mode: 'save-as';
      initialName: string;
    }
  | {
      mode: 'rename';
      buildId: string;
      initialName: string;
    };

const editorViewports: Viewports = [
  { width: 1200, label: 'Desktop', icon: 'Monitor' },
  { width: 768, label: 'Tablet', icon: 'Tablet' },
  { width: 375, label: 'Mobile', icon: 'Smartphone' },
];

const builtInLayoutComponentIds = ['builder-section', 'builder-stack', 'builder-grid'];
const BUILD_EXPORT_SCHEMA_VERSION = 1;
const DEFAULT_BUILD_NAME = 'Untitled Build';
const LEGACY_BUILD_NAME = 'Local Draft';
const IMPORTED_BUILD_NAME = 'Imported Build';

const runtimeShellStyle: React.CSSProperties = {
  width: '100%',
  height: '100vh',
  minHeight: 0,
  background: '#ffffff',
  color: '#0f172a',
  overflow: 'hidden',
};

const centeredStateStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  padding: '2rem',
  boxSizing: 'border-box',
  background: '#ffffff',
  color: '#334155',
  font: '14px/1.5 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

const modalBackdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem',
  background: 'rgba(15, 23, 42, 0.42)',
};

const modalCardStyle: React.CSSProperties = {
  width: 'min(880px, 100%)',
  maxHeight: 'min(80vh, 900px)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  border: '1px solid #d8e1ee',
  borderRadius: 8,
  background: '#ffffff',
  boxShadow: '0 28px 80px rgba(15, 23, 42, 0.22)',
};

const modalHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '1rem',
  padding: '1rem 1.25rem',
  borderBottom: '1px solid #d8e1ee',
};

const modalBodyStyle: React.CSSProperties = {
  padding: '1.25rem',
  overflow: 'auto',
};

const actionsStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: '0.625rem',
};

const textButtonStyle: React.CSSProperties = {
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  background: '#ffffff',
  color: '#0f172a',
  padding: '0.45rem 0.75rem',
  font: '600 13px/1.2 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  cursor: 'pointer',
};

const primaryButtonStyle: React.CSSProperties = {
  ...textButtonStyle,
  borderColor: '#2563eb',
  background: '#2563eb',
  color: '#ffffff',
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 280,
  boxSizing: 'border-box',
  resize: 'vertical',
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  padding: '0.875rem 1rem',
  background: '#f8fafc',
  color: '#0f172a',
  font: '12px/1.5 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
};

const compactTextareaStyle: React.CSSProperties = {
  ...textareaStyle,
  minHeight: 180,
};

const headerActionsStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: '0.5rem',
};

const dangerButtonStyle: React.CSSProperties = {
  ...textButtonStyle,
  borderColor: '#fecaca',
  color: '#b91c1c',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 40,
  boxSizing: 'border-box',
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  padding: '0 0.75rem',
  background: '#ffffff',
  color: '#0f172a',
  font: '14px/1.4 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

const helperTextStyle: React.CSSProperties = {
  margin: '0.35rem 0 0',
  color: '#64748b',
  fontSize: 13,
};

const modalFormStyle: React.CSSProperties = {
  display: 'grid',
  gap: '1rem',
};

const buildListStyle: React.CSSProperties = {
  display: 'grid',
  gap: '0.75rem',
};

const buildItemStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  gap: '1rem',
  alignItems: 'center',
  border: '1px solid #d8e1ee',
  borderRadius: 8,
  padding: '0.875rem',
  background: '#ffffff',
};

const buildMetaStyle: React.CSSProperties = {
  margin: '0.35rem 0 0',
  color: '#64748b',
  fontSize: 12,
};

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

const createItemId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `puck-${Math.random().toString(36).slice(2, 10)}`;
};

const getNowIso = () => new Date().toISOString();

const normalizeBuildName = (value: string) => value.trim() || DEFAULT_BUILD_NAME;

const getUniqueBuildName = (name: string, builds: StoredBuildRecord[]) => {
  const normalizedName = normalizeBuildName(name);

  if (!builds.some((build) => build.name === normalizedName)) {
    return normalizedName;
  }

  const copyBase = `${normalizedName} copy`;

  if (!builds.some((build) => build.name === copyBase)) {
    return copyBase;
  }

  let index = 2;

  while (builds.some((build) => build.name === `${copyBase} ${index}`)) {
    index += 1;
  }

  return `${copyBase} ${index}`;
};

const getStorageErrorMessage = (error: unknown) => {
  if (
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  ) {
    return 'localStorage quota exceeded. Export or delete builds before saving.';
  }

  return 'Could not write to localStorage.';
};

const formatBuildDate = (value: string) => {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const sanitizeFilename = (value: string) =>
  `${
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'page-builder-build'
  }.json`;

const getPreviewStoryStore = () => {
  const preview = (globalThis as StorybookPreviewGlobal).__STORYBOOK_PREVIEW__;

  try {
    return preview?.storyStore ?? null;
  } catch {
    return null;
  }
};

const isComponentRecord = (value: unknown): value is { type: string; props: Record<string, unknown> } => {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.type === 'string' && isRecord(value.props);
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
    ? (Object.fromEntries(
        Object.entries(value.zones).map(([zone, items]) => [zone, normalizeComponentList(items, allowedTypes)]),
      ) as BuilderData['zones'])
    : value.zones,
});

const getEmptyInitialData = (): BuilderData => ({
  root: {
    props: {},
  },
  content: [],
});

const parseBuilderDataValue = (value: unknown, allowedTypes: Set<string>): BuilderData | null => {
  if (!isRecord(value) || !isRecord(value.root) || !Array.isArray(value.content)) {
    return null;
  }

  return normalizeBuilderData(value as BuilderData, allowedTypes);
};

const parseStoredData = (rawData: string | null, allowedTypes: Set<string>): BuilderData | null => {
  if (!rawData) {
    return null;
  }

  try {
    return parseBuilderDataValue(JSON.parse(rawData), allowedTypes);
  } catch {
    return null;
  }
};

const createBuildRecord = ({
  name,
  data,
  registryKey,
  revision = 1,
  id = createItemId(),
  createdAt = getNowIso(),
  updatedAt = createdAt,
}: {
  name: string;
  data: BuilderData;
  registryKey: string;
  revision?: number;
  id?: string;
  createdAt?: string;
  updatedAt?: string;
}): StoredBuildRecord => ({
  id,
  name: normalizeBuildName(name),
  createdAt,
  updatedAt,
  revision: Math.max(1, Math.floor(revision)),
  registryKey,
  data,
});

const parseBuildRecord = (value: unknown, allowedTypes: Set<string>): StoredBuildRecord | null => {
  if (!isRecord(value)) {
    return null;
  }

  const data = parseBuilderDataValue(value.data, allowedTypes);

  if (!data) {
    return null;
  }

  const now = getNowIso();
  const createdAt = typeof value.createdAt === 'string' ? value.createdAt : now;
  const revision = typeof value.revision === 'number' && Number.isFinite(value.revision) ? value.revision : 1;

  return createBuildRecord({
    id: typeof value.id === 'string' && value.id.length > 0 ? value.id : createItemId(),
    name: typeof value.name === 'string' ? value.name : DEFAULT_BUILD_NAME,
    createdAt,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : createdAt,
    registryKey: typeof value.registryKey === 'string' ? value.registryKey : '',
    revision,
    data,
  });
};

const readStoredBuildCatalog = (allowedTypes: Set<string>) => {
  const rawBuilds = window.localStorage.getItem(BUILDS_STORAGE_KEY);

  if (rawBuilds == null) {
    return { builds: [], hasCatalog: false };
  }

  try {
    const parsed = JSON.parse(rawBuilds);

    if (!Array.isArray(parsed)) {
      return { builds: [], hasCatalog: true };
    }

    return {
      builds: parsed.flatMap((build) => {
        const parsedBuild = parseBuildRecord(build, allowedTypes);

        return parsedBuild ? [parsedBuild] : [];
      }),
      hasCatalog: true,
    };
  } catch {
    return { builds: [], hasCatalog: true };
  }
};

const createExportPayload = (build: StoredBuildRecord): BuildExportPayload => ({
  schemaVersion: BUILD_EXPORT_SCHEMA_VERSION,
  exportedAt: getNowIso(),
  build,
});

const downloadJson = (filename: string, payload: unknown) => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const parseImportedBuild = (
  rawData: string,
  allowedTypes: Set<string>,
  registryKey: string,
  builds: StoredBuildRecord[],
): StoredBuildRecord | null => {
  try {
    const parsed = JSON.parse(rawData);
    const incomingBuild =
      isRecord(parsed) && parsed.schemaVersion === BUILD_EXPORT_SCHEMA_VERSION ? parsed.build : null;

    if (isRecord(incomingBuild)) {
      const data = parseBuilderDataValue(incomingBuild.data, allowedTypes);

      if (!data) {
        return null;
      }

      const incomingId = typeof incomingBuild.id === 'string' && incomingBuild.id.length > 0 ? incomingBuild.id : null;
      const hasIdCollision = incomingId ? builds.some((build) => build.id === incomingId) : false;
      const incomingName = typeof incomingBuild.name === 'string' ? incomingBuild.name : IMPORTED_BUILD_NAME;
      const shouldCopyName = hasIdCollision || builds.some((build) => build.name === normalizeBuildName(incomingName));
      const revision =
        typeof incomingBuild.revision === 'number' && Number.isFinite(incomingBuild.revision)
          ? incomingBuild.revision
          : 1;

      return createBuildRecord({
        id: hasIdCollision || !incomingId ? createItemId() : incomingId,
        name: shouldCopyName ? getUniqueBuildName(`${incomingName} copy`, builds) : incomingName,
        data,
        registryKey,
        revision,
      });
    }

    const data = parseBuilderDataValue(parsed, allowedTypes);

    if (!data) {
      return null;
    }

    return createBuildRecord({
      name: getUniqueBuildName(IMPORTED_BUILD_NAME, builds),
      data,
      registryKey,
    });
  } catch {
    return null;
  }
};

const loadStoryIndexEntries = async () => {
  const response = await fetch(new URL('index.json', window.location.href));

  if (!response.ok) {
    throw new Error(`Story index request failed with ${response.status}.`);
  }

  const index = (await response.json()) as RuntimeStoryIndex;

  return Object.values(index.entries ?? {}).filter(
    (entry): entry is RuntimeStoryIndexEntry =>
      entry.id !== BUILDER_RUNTIME_STORY_ID &&
      entry.type === 'story' &&
      (entry.subtype === undefined || entry.subtype === 'story'),
  );
};

const getComponentLabel = (entry: PreviewMetadataEntry) => {
  const titleSegments = getTitleSegments(entry.title);

  return entry.pageBuilder.label ?? titleSegments.at(-1) ?? entry.name;
};

const getComponentCategory = (entry: PreviewMetadataEntry) => {
  if (entry.pageBuilder.category) {
    return entry.pageBuilder.category;
  }

  const titleSegments = getTitleSegments(entry.title);

  if (titleSegments.length <= 1) {
    return entry.title;
  }

  return titleSegments.slice(0, -1).join(' / ');
};

const getStoryPriority = (entry: Pick<PreviewMetadataEntry, 'name'>) => {
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

const resolveBuilderEntry = async (
  storyStore: PreviewStoryStore,
  storyIndexEntry: RuntimeStoryIndexEntry,
): Promise<DiscoveredBuilderEntry | null> => {
  const story = await storyStore.loadStory({ storyId: storyIndexEntry.id });
  const context = storyStore.getStoryContext(story, { forceInitialArgs: true });
  const component = context.component ?? story.component;
  const metadataEntry = buildPreviewMetadataEntry({
    storyId: story.id ?? storyIndexEntry.id,
    title: story.title ?? storyIndexEntry.title,
    name: story.name ?? storyIndexEntry.name,
    args: context.args ?? story.initialArgs ?? {},
    argTypes: context.argTypes ?? story.argTypes ?? {},
    parameters: context.parameters ?? story.parameters ?? {},
    componentBacked: Boolean(component),
  });

  if (!metadataEntry?.componentBacked || !component) {
    return null;
  }

  return {
    ...metadataEntry,
    label: getComponentLabel(metadataEntry),
    category: getComponentCategory(metadataEntry),
    description: metadataEntry.pageBuilder.description,
    component: component as React.ElementType,
  };
};

const discoverBuilderEntries = async (): Promise<DiscoveredBuilderEntry[]> => {
  const storyStore = getPreviewStoryStore();

  if (!storyStore) {
    throw new Error('Storybook preview store is not ready yet.');
  }

  const storyIndexEntries = await loadStoryIndexEntries();
  const candidates = (
    await Promise.all(storyIndexEntries.map((entry) => resolveBuilderEntry(storyStore, entry)))
  ).filter((entry): entry is DiscoveredBuilderEntry => !!entry);
  const byTitle = new Map<string, DiscoveredBuilderEntry>();

  candidates.forEach((entry) => {
    const existing = byTitle.get(entry.title);

    if (!existing || getStoryPriority(entry) < getStoryPriority(existing)) {
      byTitle.set(entry.title, entry);
    }
  });

  return Array.from(byTitle.values()).sort(
    (left, right) => left.category.localeCompare(right.category) || left.label.localeCompare(right.label),
  );
};

const normalizeSlotReferences = (
  fields: BuilderFields,
  entries: DiscoveredBuilderEntry[],
  availableTypes: Set<string>,
): BuilderFields => {
  const aliases = new Map<string, string>();

  entries.forEach((entry) => {
    const titleSegments = getTitleSegments(entry.title);
    aliases.set(entry.storyId, entry.storyId);
    aliases.set(entry.label, entry.storyId);
    aliases.set(entry.title, entry.storyId);
    aliases.set(titleSegments.at(-1) ?? entry.label, entry.storyId);
  });
  aliases.set('Section', 'builder-section');
  aliases.set('Stack', 'builder-stack');
  aliases.set('Grid', 'builder-grid');

  return Object.fromEntries(
    Object.entries(fields).map(([fieldName, field]) => {
      if (!isRecord(field) || field.type !== 'slot') {
        return [fieldName, field];
      }

      const allow = Array.isArray(field.allow)
        ? field.allow.flatMap((componentName) => {
            const resolved = aliases.get(componentName) ?? componentName;

            return availableTypes.has(resolved) ? [resolved] : [];
          })
        : undefined;
      const disallow = Array.isArray(field.disallow)
        ? field.disallow.flatMap((componentName) => {
            const resolved = aliases.get(componentName) ?? componentName;

            return availableTypes.has(resolved) ? [resolved] : [];
          })
        : undefined;

      return [
        fieldName,
        {
          ...field,
          ...(allow ? { allow } : {}),
          ...(disallow ? { disallow } : {}),
        },
      ];
    }),
  ) as BuilderFields;
};

const createRenderableProps = (entry: DiscoveredBuilderEntry, props: Record<string, unknown>) => {
  const slotNames = new Set(entry.slotNames);
  const renderableProps: Record<string, unknown> = {};

  Object.entries(props).forEach(([key, value]) => {
    if (key === 'id' || key === 'puck' || key === 'editMode') {
      return;
    }

    if (slotNames.has(key)) {
      if (typeof value === 'function') {
        renderableProps[key] = React.createElement(value as React.ComponentType<Record<string, unknown>>, {
          minEmptyHeight: 96,
        });
      }

      return;
    }

    if (value == null || isSerializablePrimitive(value)) {
      renderableProps[key] = value;
    }
  });

  return renderableProps;
};

const renderSlot = (slot: unknown, minEmptyHeight = 96) =>
  typeof slot === 'function'
    ? React.createElement(slot as React.ComponentType<Record<string, unknown>>, { minEmptyHeight })
    : null;

const createBuiltInRegistry = (): Record<string, BuilderComponentDefinition> => ({
  'builder-section': {
    label: 'Section',
    category: 'Layout',
    fields: {
      children: { type: 'slot', label: 'Content' },
      padding: {
        type: 'select',
        options: [
          { label: 'None', value: 0 },
          { label: 'Small', value: 16 },
          { label: 'Medium', value: 24 },
          { label: 'Large', value: 40 },
        ],
      },
      maxWidth: {
        type: 'select',
        options: [
          { label: 'Full', value: 'none' },
          { label: 'Medium', value: '720px' },
          { label: 'Large', value: '960px' },
          { label: 'Wide', value: '1200px' },
        ],
      },
      backgroundColor: { type: 'text', label: 'Background' },
    },
    defaultProps: {
      padding: 24,
      maxWidth: 'none',
      backgroundColor: '#ffffff',
    },
    render: ({ children, padding, maxWidth, backgroundColor }) => (
      <section style={{ width: '100%', backgroundColor: String(backgroundColor || 'transparent') }}>
        <div
          style={{
            width: '100%',
            maxWidth: maxWidth === 'none' ? 'none' : String(maxWidth),
            margin: '0 auto',
            padding: Number(padding) || 0,
            boxSizing: 'border-box',
          }}
        >
          {renderSlot(children)}
        </div>
      </section>
    ),
  },
  'builder-stack': {
    label: 'Stack',
    category: 'Layout',
    fields: {
      children: { type: 'slot', label: 'Items' },
      direction: {
        type: 'radio',
        options: [
          { label: 'Vertical', value: 'column' },
          { label: 'Horizontal', value: 'row' },
        ],
      },
      gap: {
        type: 'select',
        options: [
          { label: 'None', value: 0 },
          { label: 'Small', value: 8 },
          { label: 'Medium', value: 16 },
          { label: 'Large', value: 24 },
        ],
      },
      align: {
        type: 'select',
        options: [
          { label: 'Stretch', value: 'stretch' },
          { label: 'Start', value: 'flex-start' },
          { label: 'Center', value: 'center' },
          { label: 'End', value: 'flex-end' },
        ],
      },
    },
    defaultProps: {
      direction: 'column',
      gap: 16,
      align: 'stretch',
    },
    render: ({ children, direction, gap, align }) => (
      <div
        style={{
          display: 'flex',
          flexDirection: direction === 'row' ? 'row' : 'column',
          alignItems: String(align || 'stretch'),
          gap: Number(gap) || 0,
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {renderSlot(children)}
      </div>
    ),
  },
  'builder-grid': {
    label: 'Grid',
    category: 'Layout',
    fields: {
      children: { type: 'slot', label: 'Items' },
      columns: {
        type: 'select',
        options: [
          { label: '1', value: 1 },
          { label: '2', value: 2 },
          { label: '3', value: 3 },
          { label: '4', value: 4 },
        ],
      },
      gap: {
        type: 'select',
        options: [
          { label: 'Small', value: 8 },
          { label: 'Medium', value: 16 },
          { label: 'Large', value: 24 },
        ],
      },
    },
    defaultProps: {
      columns: 2,
      gap: 16,
    },
    render: ({ children, columns, gap }) => (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Number(columns) || 1}, minmax(0, 1fr))`,
          gap: Number(gap) || 0,
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {renderSlot(children)}
      </div>
    ),
  },
});

class ComponentBoundary extends React.Component<
  { label: string; children: React.ReactNode },
  { errorMessage: string | null }
> {
  override state = { errorMessage: null };

  static getDerivedStateFromError(error: unknown) {
    return {
      errorMessage: error instanceof Error ? error.message : 'Component render failed.',
    };
  }

  override render() {
    if (this.state.errorMessage) {
      return (
        <div style={{ border: '1px solid #fecaca', borderRadius: 6, color: '#991b1b', padding: '0.75rem' }}>
          <strong>{this.props.label}</strong>
          <div style={{ marginTop: '0.35rem' }}>{this.state.errorMessage}</div>
        </div>
      );
    }

    return this.props.children;
  }
}

const createDiscoveredRegistry = (entries: DiscoveredBuilderEntry[]): Record<string, BuilderComponentDefinition> => {
  const availableTypes = new Set([...builtInLayoutComponentIds, ...entries.map((entry) => entry.storyId)]);
  const storyRegistry = Object.fromEntries(
    entries.map((entry) => [
      entry.storyId,
      {
        label: entry.label,
        category: entry.category,
        fields: normalizeSlotReferences(entry.fields, entries, availableTypes),
        defaultProps: entry.defaultProps,
        render: (props: Record<string, unknown>) => {
          const Component = entry.component;

          return (
            <ComponentBoundary label={entry.label}>
              {React.createElement(Component, createRenderableProps(entry, props))}
            </ComponentBoundary>
          );
        },
      },
    ]),
  );

  return {
    ...createBuiltInRegistry(),
    ...storyRegistry,
  };
};

const createDiscoveredCategories = (entries: DiscoveredBuilderEntry[]) =>
  Object.fromEntries(
    entries.reduce<Array<[string, { title: string; components: string[] }]>>(
      (accumulator, entry) => {
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
      },
      [['layout', { title: 'Layout', components: builtInLayoutComponentIds }]],
    ),
  );

const createBuilderConfig = (
  registry: Record<string, BuilderComponentDefinition>,
  categories: Record<string, { title: string; components: string[] }>,
): BuilderConfig => ({
  components: Object.fromEntries(
    Object.entries(registry).map(([type, definition]) => [
      type,
      {
        label: definition.label,
        fields: definition.fields as NonNullable<BuilderConfig['components']>[string]['fields'],
        defaultProps: definition.defaultProps,
        render: definition.render,
      },
    ]),
  ),
  categories,
  root: {
    fields: {},
    defaultProps: {},
    render: ({ children }) => (
      <main style={{ minHeight: '100%', width: '100%', background: '#ffffff' }}>
        <div style={{ minHeight: '100%', width: '100%' }}>{children}</div>
      </main>
    ),
  },
});

const editorOverrides = {
  actionBar: ({ children, parentAction }) => (
    <ActionBar>
      <ActionBar.Group>
        {parentAction}
        {children}
      </ActionBar.Group>
    </ActionBar>
  ),
  componentOverlay: ({ children }) => <>{children}</>,
} satisfies Partial<Overrides<BuilderConfig>>;

const renderState = (message: string) => (
  <div style={centeredStateStyle}>
    <div>{message}</div>
  </div>
);

export const PageBuilderRuntime = () => {
  const textareaId = useId();
  const importTextareaId = useId();
  const nameInputId = useId();
  const importFileInputRef = useRef<HTMLInputElement | null>(null);
  const [discoveryState, setDiscoveryState] = useState<DiscoveryState>({ status: 'loading', entries: [] });
  const [data, setData] = useState<BuilderData>(() => getEmptyInitialData());
  const [editorDataRevision, setEditorDataRevision] = useState(0);
  const [builds, setBuilds] = useState<StoredBuildRecord[]>([]);
  const [activeBuildId, setActiveBuildId] = useState<string | null>(null);
  const [serializedData, setSerializedData] = useState(() => JSON.stringify(getEmptyInitialData(), null, 2));
  const [importPayload, setImportPayload] = useState('');
  const [nameValue, setNameValue] = useState('');
  const [status, setStatus] = useState('Ready');
  const [hydratedRegistryKey, setHydratedRegistryKey] = useState<string | null>(null);
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [isBuildsModalOpen, setIsBuildsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [nameModalState, setNameModalState] = useState<NameModalState | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setDiscoveryState({ status: 'loading', entries: [] });

      try {
        const entries = await discoverBuilderEntries();

        if (!cancelled) {
          setDiscoveryState({ status: 'loaded', entries });
        }
      } catch (error) {
        if (!cancelled) {
          setDiscoveryState({
            status: 'error',
            entries: [],
            message: error instanceof Error ? error.message : 'Page builder discovery failed.',
          });
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const discoveredEntries = discoveryState.status === 'loaded' ? discoveryState.entries : [];
  const activeRegistry = useMemo(() => createDiscoveredRegistry(discoveredEntries), [discoveredEntries]);
  const activeCategories = useMemo(() => createDiscoveredCategories(discoveredEntries), [discoveredEntries]);
  const builderConfig = useMemo(
    () => createBuilderConfig(activeRegistry, activeCategories),
    [activeCategories, activeRegistry],
  );
  const availableTypes = useMemo(() => new Set(Object.keys(activeRegistry)), [activeRegistry]);
  const registryKey = useMemo(() => Array.from(availableTypes).sort().join('|'), [availableTypes]);
  const defaultData = useMemo(() => normalizeBuilderData(getEmptyInitialData(), availableTypes), [availableTypes]);
  const activeBuild = useMemo(
    () => (activeBuildId ? (builds.find((build) => build.id === activeBuildId) ?? null) : null),
    [activeBuildId, builds],
  );
  const sortedBuilds = useMemo(
    () =>
      [...builds].sort((left, right) => {
        const leftTime = new Date(left.updatedAt).getTime();
        const rightTime = new Date(right.updatedAt).getTime();

        return rightTime - leftTime;
      }),
    [builds],
  );

  const setEditorData = (nextData: BuilderData) => {
    const normalizedData = normalizeBuilderData(nextData, availableTypes);

    setData(normalizedData);
    setSerializedData(JSON.stringify(normalizedData, null, 2));
    setEditorDataRevision((revision) => revision + 1);

    return normalizedData;
  };

  useEffect(() => {
    if (discoveryState.status !== 'loaded') {
      return;
    }

    setHydratedRegistryKey(null);
    const storedBuildCatalog = readStoredBuildCatalog(availableTypes);
    const storedBuilds = storedBuildCatalog.builds;
    const storedActiveBuildId = window.localStorage.getItem(ACTIVE_BUILD_ID_KEY);
    const storedData = parseStoredData(window.localStorage.getItem(STORAGE_KEY), availableTypes);
    const activeStoredBuild = storedActiveBuildId
      ? (storedBuilds.find((build) => build.id === storedActiveBuildId) ?? null)
      : null;

    setBuilds(storedBuilds);
    setActiveBuildId(activeStoredBuild?.id ?? null);

    if (!storedBuildCatalog.hasCatalog && storedData) {
      const migratedBuild = createBuildRecord({
        name: LEGACY_BUILD_NAME,
        data: storedData,
        registryKey,
      });

      try {
        window.localStorage.setItem(BUILDS_STORAGE_KEY, JSON.stringify([migratedBuild]));
        window.localStorage.setItem(ACTIVE_BUILD_ID_KEY, migratedBuild.id);
        setBuilds([migratedBuild]);
        setActiveBuildId(migratedBuild.id);
        setEditorData(storedData);
        setStatus('Migrated local draft');
        setHydratedRegistryKey(registryKey);
        return;
      } catch (error) {
        setEditorData(storedData);
        setStatus(getStorageErrorMessage(error));
        setHydratedRegistryKey(registryKey);
        return;
      }
    }

    if (storedData) {
      setEditorData(storedData);
      setStatus(activeStoredBuild ? `Loaded autosaved draft for ${activeStoredBuild.name}` : 'Loaded autosaved draft');
      setHydratedRegistryKey(registryKey);
      return;
    }

    if (activeStoredBuild) {
      setEditorData(activeStoredBuild.data);
      setStatus(`Loaded ${activeStoredBuild.name}`);
      setHydratedRegistryKey(registryKey);
      return;
    }

    setEditorData(defaultData);
    setStatus('Ready');
    setHydratedRegistryKey(registryKey);
  }, [availableTypes, defaultData, discoveryState.status, registryKey]);

  useEffect(() => {
    if (discoveryState.status !== 'loaded' || hydratedRegistryKey !== registryKey) {
      return;
    }

    const normalizedData = normalizeBuilderData(data, availableTypes);
    const nextSerializedData = JSON.stringify(normalizedData, null, 2);

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedData));

      if (activeBuildId) {
        window.localStorage.setItem(ACTIVE_BUILD_ID_KEY, activeBuildId);
      } else {
        window.localStorage.removeItem(ACTIVE_BUILD_ID_KEY);
      }

      setSerializedData(nextSerializedData);
    } catch (error) {
      setStatus(getStorageErrorMessage(error));
    }
  }, [activeBuildId, availableTypes, data, discoveryState.status, hydratedRegistryKey, registryKey]);

  useEffect(() => {
    const hasOpenModal = isJsonModalOpen || isBuildsModalOpen || isImportModalOpen || !!nameModalState;

    if (!hasOpenModal) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsJsonModalOpen(false);
        setIsBuildsModalOpen(false);
        setIsImportModalOpen(false);
        setNameModalState(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isBuildsModalOpen, isImportModalOpen, isJsonModalOpen, nameModalState]);

  if (discoveryState.status === 'loading') {
    return renderState('Loading Storybook components.');
  }

  if (discoveryState.status === 'error') {
    return renderState(discoveryState.message);
  }

  if (discoveredEntries.length === 0) {
    return renderState('No component-backed Storybook stories were discovered.');
  }

  if (hydratedRegistryKey !== registryKey) {
    return renderState('Loading saved builds.');
  }

  const persistBuilds = (nextBuilds: StoredBuildRecord[], nextActiveBuildId: string | null) => {
    try {
      window.localStorage.setItem(BUILDS_STORAGE_KEY, JSON.stringify(nextBuilds));

      if (nextActiveBuildId) {
        window.localStorage.setItem(ACTIVE_BUILD_ID_KEY, nextActiveBuildId);
      } else {
        window.localStorage.removeItem(ACTIVE_BUILD_ID_KEY);
      }

      setBuilds(nextBuilds);
      setActiveBuildId(nextActiveBuildId);

      return true;
    } catch (error) {
      setStatus(getStorageErrorMessage(error));
      return false;
    }
  };

  const openNameModal = (nextState: NameModalState) => {
    setNameValue(nextState.initialName);
    setNameModalState(nextState);
  };

  const saveCurrentBuild = (dataToSave = data) => {
    const normalizedData = normalizeBuilderData(dataToSave, availableTypes);
    const now = getNowIso();
    const currentBuild = activeBuildId ? (builds.find((build) => build.id === activeBuildId) ?? null) : null;

    if (!currentBuild) {
      const nextBuild = createBuildRecord({
        name: getUniqueBuildName(DEFAULT_BUILD_NAME, builds),
        data: normalizedData,
        registryKey,
        createdAt: now,
        updatedAt: now,
      });

      if (persistBuilds([...builds, nextBuild], nextBuild.id)) {
        setData(normalizedData);
        setStatus(`Saved ${nextBuild.name}`);
      }

      return;
    }

    const nextRevision = currentBuild.revision + 1;
    const nextBuilds = builds.map((build) =>
      build.id === currentBuild.id
        ? {
            ...build,
            data: normalizedData,
            registryKey,
            updatedAt: now,
            revision: nextRevision,
          }
        : build,
    );

    if (persistBuilds(nextBuilds, currentBuild.id)) {
      setData(normalizedData);
      setStatus(`Saved ${currentBuild.name} rev ${nextRevision}`);
    }
  };

  const saveAsBuild = (name: string) => {
    const normalizedData = normalizeBuilderData(data, availableTypes);
    const nextBuild = createBuildRecord({
      name: getUniqueBuildName(name, builds),
      data: normalizedData,
      registryKey,
    });

    if (persistBuilds([...builds, nextBuild], nextBuild.id)) {
      setData(normalizedData);
      setStatus(`Saved ${nextBuild.name}`);
      setNameModalState(null);
    }
  };

  const renameBuild = (buildId: string, name: string) => {
    const buildToRename = builds.find((build) => build.id === buildId);

    if (!buildToRename) {
      setStatus('Build not found');
      setNameModalState(null);
      return;
    }

    const otherBuilds = builds.filter((build) => build.id !== buildId);
    const nextName = getUniqueBuildName(name, otherBuilds);
    const nextBuilds = builds.map((build) =>
      build.id === buildId
        ? {
            ...build,
            name: nextName,
            updatedAt: getNowIso(),
          }
        : build,
    );

    if (persistBuilds(nextBuilds, activeBuildId)) {
      setStatus(`Renamed ${nextName}`);
      setNameModalState(null);
    }
  };

  const submitNameModal = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!nameModalState) {
      return;
    }

    if (nameModalState.mode === 'save-as') {
      saveAsBuild(nameValue);
      return;
    }

    renameBuild(nameModalState.buildId, nameValue);
  };

  const loadBuild = (build: StoredBuildRecord) => {
    const normalizedData = setEditorData(build.data);
    setActiveBuildId(build.id);

    try {
      window.localStorage.setItem(ACTIVE_BUILD_ID_KEY, build.id);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedData));
      setStatus(`Loaded ${build.name}`);
      setIsBuildsModalOpen(false);
    } catch (error) {
      setStatus(getStorageErrorMessage(error));
    }
  };

  const duplicateBuild = (build: StoredBuildRecord) => {
    const duplicatedBuild = createBuildRecord({
      name: getUniqueBuildName(`${build.name} copy`, builds),
      data: normalizeBuilderData(build.data, availableTypes),
      registryKey,
      revision: build.revision,
    });

    if (persistBuilds([...builds, duplicatedBuild], duplicatedBuild.id)) {
      setEditorData(duplicatedBuild.data);
      setStatus(`Duplicated ${build.name}`);
    }
  };

  const deleteBuild = (build: StoredBuildRecord) => {
    if (!window.confirm(`Delete "${build.name}"? The current canvas draft will be kept.`)) {
      return;
    }

    const nextBuilds = builds.filter((candidate) => candidate.id !== build.id);
    const nextActiveBuildId = activeBuildId === build.id ? null : activeBuildId;

    if (persistBuilds(nextBuilds, nextActiveBuildId)) {
      setStatus(`Deleted ${build.name}`);
    }
  };

  const getCurrentBuildForExport = (): StoredBuildRecord => {
    const normalizedData = normalizeBuilderData(data, availableTypes);
    const now = getNowIso();

    if (activeBuild) {
      return {
        ...activeBuild,
        data: normalizedData,
        registryKey,
        updatedAt: now,
      };
    }

    return createBuildRecord({
      name: 'Current Draft',
      data: normalizedData,
      registryKey,
      createdAt: now,
      updatedAt: now,
    });
  };

  const exportBuild = (build: StoredBuildRecord) => {
    downloadJson(sanitizeFilename(build.name), createExportPayload(build));
    setStatus(`Exported ${build.name}`);
  };

  const exportCurrentBuild = () => {
    exportBuild(getCurrentBuildForExport());
  };

  const importBuildFromPayload = (payload: string) => {
    const importedBuild = parseImportedBuild(payload, availableTypes, registryKey, builds);

    if (!importedBuild) {
      setStatus('Import failed. The JSON did not contain a valid build.');
      return;
    }

    if (persistBuilds([...builds, importedBuild], importedBuild.id)) {
      setEditorData(importedBuild.data);
      setImportPayload('');
      setIsImportModalOpen(false);
      setStatus(`Imported ${importedBuild.name}`);
    }
  };

  const importSelectedFile = async (file: File | null | undefined) => {
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      setImportPayload(text);
      importBuildFromPayload(text);
    } catch {
      setStatus('Import failed. The selected file could not be read.');
    } finally {
      if (importFileInputRef.current) {
        importFileInputRef.current.value = '';
      }
    }
  };

  const copyJson = async () => {
    const nextValue = JSON.stringify(normalizeBuilderData(data, availableTypes), null, 2);

    try {
      await navigator.clipboard.writeText(nextValue);
      setSerializedData(nextValue);
      setStatus('Copied JSON');
    } catch {
      setSerializedData(nextValue);
      setStatus('Clipboard unavailable');
    }
  };

  const importJson = () => {
    const parsed = parseStoredData(serializedData, availableTypes);

    if (!parsed) {
      setStatus('Import failed');
      return;
    }

    setEditorData(parsed);
    setStatus('Imported JSON');
  };

  return (
    <div style={runtimeShellStyle}>
      <Puck
        key={`${registryKey}:${activeBuildId ?? 'draft'}:${editorDataRevision}`}
        config={builderConfig}
        data={data}
        iframe={{ enabled: false }}
        onChange={(nextData) => {
          setData(normalizeBuilderData(nextData as BuilderData, availableTypes));
          setStatus('Draft saved');
        }}
        onPublish={async (nextData) => {
          saveCurrentBuild(normalizeBuilderData(nextData as BuilderData, availableTypes));
        }}
        renderHeaderActions={() => (
          <div style={headerActionsStyle}>
            <button type="button" style={primaryButtonStyle} onClick={() => saveCurrentBuild()}>
              Save
            </button>
            <button
              type="button"
              style={textButtonStyle}
              onClick={() => {
                openNameModal({
                  mode: 'save-as',
                  initialName: activeBuild ? `${activeBuild.name} copy` : DEFAULT_BUILD_NAME,
                });
              }}
            >
              Save as
            </button>
            <button
              type="button"
              style={textButtonStyle}
              onClick={() => {
                setIsBuildsModalOpen(true);
              }}
            >
              Builds ({builds.length})
            </button>
            <button
              type="button"
              style={textButtonStyle}
              onClick={() => {
                setIsImportModalOpen(true);
              }}
            >
              Import
            </button>
            <button type="button" style={textButtonStyle} onClick={exportCurrentBuild}>
              Export
            </button>
            <button
              type="button"
              style={textButtonStyle}
              onClick={() => {
                setSerializedData(JSON.stringify(normalizeBuilderData(data, availableTypes), null, 2));
                setIsJsonModalOpen(true);
              }}
            >
              JSON
            </button>
          </div>
        )}
        height="100vh"
        overrides={editorOverrides}
        viewports={editorViewports}
      />
      {isBuildsModalOpen ? (
        <div
          style={modalBackdropStyle}
          onClick={() => {
            setIsBuildsModalOpen(false);
          }}
        >
          <div
            style={modalCardStyle}
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div style={modalHeaderStyle}>
              <div>
                <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.125rem' }}>Builds</h2>
                <p style={helperTextStyle}>
                  {activeBuild ? `Active: ${activeBuild.name} rev ${activeBuild.revision}` : 'No active saved build'}
                </p>
              </div>
              <div style={actionsStyle}>
                <button
                  type="button"
                  style={primaryButtonStyle}
                  onClick={() => {
                    openNameModal({
                      mode: 'save-as',
                      initialName: activeBuild ? `${activeBuild.name} copy` : DEFAULT_BUILD_NAME,
                    });
                  }}
                >
                  New copy
                </button>
                <button
                  type="button"
                  style={textButtonStyle}
                  onClick={() => {
                    setIsBuildsModalOpen(false);
                  }}
                >
                  Close
                </button>
              </div>
            </div>
            <div style={modalBodyStyle}>
              {sortedBuilds.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: 14 }}>No saved builds yet.</div>
              ) : (
                <div style={buildListStyle}>
                  {sortedBuilds.map((build) => (
                    <article key={build.id} style={buildItemStyle}>
                      <div style={{ minWidth: 0 }}>
                        <h3
                          style={{
                            margin: 0,
                            overflow: 'hidden',
                            color: '#0f172a',
                            fontSize: '1rem',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {build.name}
                        </h3>
                        <p style={buildMetaStyle}>
                          Rev {build.revision} · Updated {formatBuildDate(build.updatedAt)}
                        </p>
                      </div>
                      <div style={actionsStyle}>
                        <button type="button" style={textButtonStyle} onClick={() => loadBuild(build)}>
                          Load
                        </button>
                        <button
                          type="button"
                          style={textButtonStyle}
                          onClick={() => {
                            openNameModal({
                              mode: 'rename',
                              buildId: build.id,
                              initialName: build.name,
                            });
                          }}
                        >
                          Rename
                        </button>
                        <button type="button" style={textButtonStyle} onClick={() => duplicateBuild(build)}>
                          Duplicate
                        </button>
                        <button type="button" style={textButtonStyle} onClick={() => exportBuild(build)}>
                          Export
                        </button>
                        <button type="button" style={dangerButtonStyle} onClick={() => deleteBuild(build)}>
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
      {isImportModalOpen ? (
        <div
          style={modalBackdropStyle}
          onClick={() => {
            setIsImportModalOpen(false);
          }}
        >
          <div
            style={modalCardStyle}
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div style={modalHeaderStyle}>
              <div>
                <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.125rem' }}>Import build</h2>
                <p style={helperTextStyle}>{status}</p>
              </div>
              <div style={actionsStyle}>
                <input
                  ref={importFileInputRef}
                  type="file"
                  accept="application/json,.json"
                  style={{ display: 'none' }}
                  onChange={(event) => {
                    void importSelectedFile(event.target.files?.[0]);
                  }}
                />
                <button
                  type="button"
                  style={textButtonStyle}
                  onClick={() => {
                    importFileInputRef.current?.click();
                  }}
                >
                  Choose file
                </button>
                <button
                  type="button"
                  style={primaryButtonStyle}
                  onClick={() => {
                    importBuildFromPayload(importPayload);
                  }}
                >
                  Import
                </button>
                <button
                  type="button"
                  style={textButtonStyle}
                  onClick={() => {
                    setIsImportModalOpen(false);
                  }}
                >
                  Close
                </button>
              </div>
            </div>
            <div style={modalBodyStyle}>
              <label htmlFor={importTextareaId} style={{ display: 'block', margin: '0 0 0.5rem', fontWeight: 700 }}>
                Paste exported build JSON
              </label>
              <textarea
                id={importTextareaId}
                value={importPayload}
                style={compactTextareaStyle}
                spellCheck={false}
                onChange={(event) => {
                  setImportPayload(event.target.value);
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
      {nameModalState ? (
        <div
          style={{ ...modalBackdropStyle, zIndex: 1010 }}
          onClick={() => {
            setNameModalState(null);
          }}
        >
          <form
            style={{ ...modalCardStyle, width: 'min(520px, 100%)' }}
            onSubmit={submitNameModal}
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div style={modalHeaderStyle}>
              <div>
                <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.125rem' }}>
                  {nameModalState.mode === 'save-as' ? 'Save build as' : 'Rename build'}
                </h2>
                <p style={helperTextStyle}>{status}</p>
              </div>
            </div>
            <div style={modalBodyStyle}>
              <div style={modalFormStyle}>
                <label htmlFor={nameInputId} style={{ display: 'block', fontWeight: 700 }}>
                  Build name
                </label>
                <input
                  id={nameInputId}
                  value={nameValue}
                  style={inputStyle}
                  autoFocus
                  onChange={(event) => {
                    setNameValue(event.target.value);
                  }}
                />
                <div style={actionsStyle}>
                  <button
                    type="button"
                    style={textButtonStyle}
                    onClick={() => {
                      setNameModalState(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" style={primaryButtonStyle}>
                    Save
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      ) : null}
      {isJsonModalOpen ? (
        <div
          style={modalBackdropStyle}
          onClick={() => {
            setIsJsonModalOpen(false);
          }}
        >
          <div
            style={modalCardStyle}
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div style={modalHeaderStyle}>
              <div>
                <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.125rem' }}>Builder JSON</h2>
                <p style={{ margin: '0.35rem 0 0', color: '#64748b', fontSize: 13 }}>{status}</p>
              </div>
              <div style={actionsStyle}>
                <button type="button" style={textButtonStyle} onClick={copyJson}>
                  Copy
                </button>
                <button type="button" style={primaryButtonStyle} onClick={importJson}>
                  Import
                </button>
                <button
                  type="button"
                  style={textButtonStyle}
                  onClick={() => {
                    setIsJsonModalOpen(false);
                  }}
                >
                  Close
                </button>
              </div>
            </div>
            <div style={modalBodyStyle}>
              <label htmlFor={textareaId} style={{ display: 'block', margin: '0 0 0.5rem', fontWeight: 700 }}>
                Current payload
              </label>
              <textarea
                id={textareaId}
                value={serializedData}
                style={textareaStyle}
                spellCheck={false}
                onChange={(event) => {
                  setSerializedData(event.target.value);
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
