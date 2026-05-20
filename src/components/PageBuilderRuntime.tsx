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
import React, { useEffect, useId, useMemo, useState } from 'react';

import { BUILDER_RUNTIME_STORY_ID, STORAGE_KEY } from '../constants';
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

const editorViewports: Viewports = [
  { width: 1200, label: 'Desktop', icon: 'Monitor' },
  { width: 768, label: 'Tablet', icon: 'Tablet' },
  { width: 375, label: 'Mobile', icon: 'Smartphone' },
];

const builtInLayoutComponentIds = ['builder-section', 'builder-stack', 'builder-grid'];

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
  const availableTypes = new Set(entries.map((entry) => entry.storyId));
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
  const [discoveryState, setDiscoveryState] = useState<DiscoveryState>({ status: 'loading', entries: [] });
  const [data, setData] = useState<BuilderData>(() => getEmptyInitialData());
  const [serializedData, setSerializedData] = useState(() => JSON.stringify(getEmptyInitialData(), null, 2));
  const [status, setStatus] = useState('Ready');
  const [hydratedRegistryKey, setHydratedRegistryKey] = useState<string | null>(null);
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);

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

  useEffect(() => {
    if (discoveryState.status !== 'loaded') {
      return;
    }

    setHydratedRegistryKey(null);
    const storedData = parseStoredData(window.localStorage.getItem(STORAGE_KEY), availableTypes);

    if (storedData) {
      setData(storedData);
      setSerializedData(JSON.stringify(storedData, null, 2));
      setStatus('Loaded draft from localStorage');
      setHydratedRegistryKey(registryKey);
      return;
    }

    setData(defaultData);
    setSerializedData(JSON.stringify(defaultData, null, 2));
    setStatus('Ready');
    setHydratedRegistryKey(registryKey);
  }, [availableTypes, defaultData, discoveryState.status, registryKey]);

  useEffect(() => {
    if (discoveryState.status !== 'loaded' || hydratedRegistryKey !== registryKey) {
      return;
    }

    const normalizedData = normalizeBuilderData(data, availableTypes);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedData));
    setSerializedData(JSON.stringify(normalizedData, null, 2));
  }, [availableTypes, data, discoveryState.status, hydratedRegistryKey, registryKey]);

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

  if (discoveryState.status === 'loading') {
    return renderState('Loading Storybook components.');
  }

  if (discoveryState.status === 'error') {
    return renderState(discoveryState.message);
  }

  if (discoveredEntries.length === 0) {
    return renderState('No component-backed Storybook stories were discovered.');
  }

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

    setData(parsed);
    setStatus('Imported JSON');
  };

  return (
    <div style={runtimeShellStyle}>
      <Puck
        config={builderConfig}
        data={data}
        iframe={{ enabled: false }}
        onChange={(nextData) => {
          setData(normalizeBuilderData(nextData as BuilderData, availableTypes));
          setStatus('Draft saved');
        }}
        onPublish={async (nextData) => {
          setData(normalizeBuilderData(nextData as BuilderData, availableTypes));
          setStatus('Publish saved');
        }}
        renderHeaderActions={() => (
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
        )}
        height="100vh"
        overrides={editorOverrides}
        viewports={editorViewports}
      />
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
