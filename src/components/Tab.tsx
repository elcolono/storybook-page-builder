import '@puckeditor/core/puck.css';

import { Puck, type Config, type ConfigParams, type Data, type Viewports } from '@puckeditor/core';
import { EditIcon } from '@storybook/icons';
import type { API_PreparedIndexEntry, API_PreparedStoryIndex } from 'storybook/internal/types';
import { addons, useStorybookApi, useStorybookState } from 'storybook/manager-api';
import { Button, H1, IconButton, Link, Placeholder } from 'storybook/internal/components';
import React, { useEffect, useId, useMemo, useState } from 'react';
import { styled } from 'storybook/theming';

import {
  PREVIEW_METADATA_REQUEST,
  PREVIEW_METADATA_RESPONSE,
  PREVIEW_METADATA_TIMEOUT_MS,
  STORAGE_KEY,
} from '../constants';
import {
  isPreviewMetadataResponsePayload,
  isRecord,
  isSerializablePrimitive,
  type BuilderFields,
  type PreviewMetadataEntry,
  type PreviewMetadataRequestPayload,
} from '../metadata';

interface TabProps {
  active?: boolean;
}

type BuilderComponentProps = Record<string, Record<string, unknown>>;
type BuilderRootProps = {
  title?: string;
  description?: string;
};
type BuilderConfigParams = ConfigParams<BuilderComponentProps, BuilderRootProps, string[]>;
type BuilderData = Data<BuilderComponentProps, BuilderRootProps>;
type BuilderConfig = Config<BuilderConfigParams>;

type DiscoveredBuilderEntry = Omit<PreviewMetadataEntry, 'componentBacked'> & {
  label: string;
  category: string;
  description?: string;
};

type DiscoveredStoryCandidate = {
  entry: DiscoveredBuilderEntry;
};

type BuilderComponentDefinition = {
  label: string;
  category: string;
  fields: BuilderFields;
  defaultProps?: Record<string, unknown>;
  render: (props: Record<string, unknown>) => React.ReactElement;
};

type MetadataDiscoveryState =
  | {
      status: 'idle';
      entries: PreviewMetadataEntry[];
    }
  | {
      status: 'loading';
      requestId: string;
      entries: PreviewMetadataEntry[];
    }
  | {
      status: 'loaded';
      requestId: string;
      entries: PreviewMetadataEntry[];
    }
  | {
      status: 'error';
      requestId: string;
      entries: PreviewMetadataEntry[];
      message: string;
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

const PlaceholderFrame = styled.div({
  padding: '1.5rem',
});

const ModalHint = styled.div({
  marginTop: '1rem',
});

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

const editorViewports: Viewports = [
  { width: 1200, label: 'Desktop', icon: 'Monitor' },
  { width: 768, label: 'Tablet', icon: 'Tablet' },
  { width: 375, label: 'Mobile', icon: 'Smartphone' },
];

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

const createRequestId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `preview-metadata-${Math.random().toString(36).slice(2, 10)}`;
};

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

const buildIframeSrc = (storyId: string, props: Record<string, unknown>) => {
  if (typeof window === 'undefined') {
    return '';
  }

  const url = new URL('./iframe.html', window.location.href);
  url.searchParams.set('id', storyId);
  url.searchParams.set('viewMode', 'story');

  const argPairs = Object.entries(props).flatMap(([key, value]) => {
    if (key === 'id' || value == null || !isSerializablePrimitive(value)) {
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

const discoverBuilderEntries = (metadataEntries: PreviewMetadataEntry[]) => {
  const candidates = metadataEntries
    .filter((entry) => entry.componentBacked)
    .map((entry) => {
      const discoveredEntry: DiscoveredBuilderEntry = {
        ...entry,
        label: getComponentLabel(entry),
        category: getComponentCategory(entry),
        description: entry.pageBuilder.description,
      };

      return {
        entry: discoveredEntry,
      } satisfies DiscoveredStoryCandidate;
    });

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
    .map(({ entry }) => entry)
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

const getStoryIndexEntries = (index: API_PreparedStoryIndex | undefined) => {
  if (!index) {
    return [];
  }

  return Object.values(index.entries).filter(
    (entry): entry is API_PreparedIndexEntry & { id: string; type: 'story'; subtype: 'story' } =>
      entry.type === 'story' && entry.subtype === 'story',
  );
};

const renderDiscoveryPlaceholder = (message: React.ReactNode) => (
  <TabWrapper>
    <TabInner>
      <BuilderShell>
        <PlaceholderFrame>
          <Placeholder>{message}</Placeholder>
        </PlaceholderFrame>
      </BuilderShell>
    </TabInner>
  </TabWrapper>
);

export const Tab: React.FC<TabProps> = ({ active }) => {
  const api = useStorybookApi();
  const storybookState = useStorybookState();
  const textareaId = useId();
  const storyIndex = api.getIndex() as API_PreparedStoryIndex | undefined;
  const storyEntries = useMemo(() => getStoryIndexEntries(storyIndex), [storyIndex, storybookState]);
  const storyIds = useMemo(() => storyEntries.map((entry) => entry.id), [storyEntries]);
  const storyIdsKey = storyIds.join('|');

  const [metadataState, setMetadataState] = useState<MetadataDiscoveryState>({
    status: 'idle',
    entries: [],
  });

  useEffect(() => {
    if (!active || !storyIndex) {
      return;
    }

    if (storyIds.length === 0) {
      setMetadataState({
        status: 'loaded',
        requestId: 'empty',
        entries: [],
      });
      return;
    }

    const channel = addons.getChannel();
    const requestId = createRequestId();
    let settled = false;
    const onMetadataResponse = (payload: unknown) => {
      if (!isPreviewMetadataResponsePayload(payload) || payload.requestId !== requestId) {
        return;
      }

      settled = true;
      window.clearTimeout(timeoutId);
      channel.off(PREVIEW_METADATA_RESPONSE, onMetadataResponse);
      setMetadataState({
        status: 'loaded',
        requestId,
        entries: payload.entries,
      });
    };
    const timeoutId = window.setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      channel.off(PREVIEW_METADATA_RESPONSE, onMetadataResponse);
      setMetadataState({
        status: 'error',
        requestId,
        entries: [],
        message: 'Timed out while waiting for Storybook preview metadata.',
      });
    }, PREVIEW_METADATA_TIMEOUT_MS);
    const request: PreviewMetadataRequestPayload = {
      requestId,
      storyIds,
    };

    setMetadataState({
      status: 'loading',
      requestId,
      entries: [],
    });
    channel.on(PREVIEW_METADATA_RESPONSE, onMetadataResponse);
    channel.emit(PREVIEW_METADATA_REQUEST, request);

    return () => {
      settled = true;
      window.clearTimeout(timeoutId);
      channel.off(PREVIEW_METADATA_RESPONSE, onMetadataResponse);
    };
  }, [active, storyIds, storyIdsKey, storyIndex]);

  const discoveredEntries = useMemo(
    () => (metadataState.status === 'loaded' ? discoverBuilderEntries(metadataState.entries) : null),
    [metadataState],
  );
  const isDiscoveryReady = !!storyIndex && metadataState.status === 'loaded';
  const activeRegistry = useMemo(() => createDiscoveredRegistry(discoveredEntries ?? []), [discoveredEntries]);
  const activeCategories = useMemo(() => createDiscoveredCategories(discoveredEntries ?? []), [discoveredEntries]);
  const builderConfig = useMemo(
    () => createBuilderConfig(activeRegistry, activeCategories),
    [activeCategories, activeRegistry],
  );
  const availableTypes = useMemo(() => new Set(Object.keys(activeRegistry)), [activeRegistry]);
  const registryKey = useMemo(() => Array.from(availableTypes).sort().join('|'), [availableTypes]);
  const defaultData = useMemo(() => normalizeBuilderData(getEmptyInitialData(), availableTypes), [availableTypes]);

  const [data, setData] = useState<BuilderData>(defaultData);
  const [serializedData, setSerializedData] = useState(() => JSON.stringify(defaultData, null, 2));
  const [status, setStatus] = useState('Ready');
  const [hydratedRegistryKey, setHydratedRegistryKey] = useState<string | null>(null);
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);

  useEffect(() => {
    if (!active) {
      setHydratedRegistryKey(null);
    }
  }, [active]);

  useEffect(() => {
    if (!active || !isDiscoveryReady) {
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
  }, [active, availableTypes, defaultData, isDiscoveryReady, registryKey]);

  useEffect(() => {
    if (!active || !isDiscoveryReady || hydratedRegistryKey !== registryKey) {
      return;
    }

    const normalizedData = normalizeBuilderData(data, availableTypes);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedData));
    setSerializedData(JSON.stringify(normalizedData, null, 2));
  }, [active, availableTypes, data, hydratedRegistryKey, isDiscoveryReady, registryKey]);

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

  if (!storyIndex) {
    return renderDiscoveryPlaceholder('Loading Storybook stories for the page builder sidebar.');
  }

  if (metadataState.status === 'idle' || metadataState.status === 'loading') {
    return renderDiscoveryPlaceholder('Loading Storybook component metadata for the page builder sidebar.');
  }

  if (metadataState.status === 'error') {
    return renderDiscoveryPlaceholder(metadataState.message);
  }

  if ((discoveredEntries?.length ?? 0) === 0) {
    return renderDiscoveryPlaceholder('No component-backed Storybook stories were discovered for the page builder.');
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
            renderHeaderActions={(props) => {
              const actionChildren = (props as { children?: React.ReactNode }).children;

              return (
                <>
                  {actionChildren}
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
              );
            }}
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
                  Edit the builder payload. Discovered stories render through the Storybook preview iframe. Add{' '}
                  <code>parameters.pageBuilder</code> to a story to control its label, fields and defaults.
                </Note>
              </div>
              <Actions>
                <StatusText>{status}</StatusText>
                <Button onClick={copyJson}>Copy JSON</Button>
                <Button variant="solid" onClick={importJson}>
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
              <ModalHint>
                <Placeholder>
                  Builder overrides: use <code>parameters.pageBuilder</code> on meta or stories to refine labels,
                  categories, fields, defaults and explicit slots.
                  <div style={{ marginTop: '0.5rem' }}>
                    Puck docs: <Link href="https://puckeditor.com/docs/getting-started">Getting Started</Link>
                  </div>
                </Placeholder>
              </ModalHint>
            </ModalBody>
          </ModalCard>
        </ModalBackdrop>
      ) : null}
    </TabWrapper>
  );
};
