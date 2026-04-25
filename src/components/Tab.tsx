import '@puckeditor/core/puck.css';

import { Puck, type Config, type Data, type Slot } from '@puckeditor/core';
import React, { useEffect, useId, useMemo, useState } from 'react';
import { Button, H1, Link, Placeholder } from 'storybook/internal/components';
import { styled } from 'storybook/theming';

import { STORAGE_KEY } from '../constants';

interface TabProps {
  active?: boolean;
}

const TabWrapper = styled.div(({ theme }) => ({
  background: `linear-gradient(180deg, ${theme.appBg} 0%, ${theme.appContentBg} 100%)`,
  color: theme.textColor,
  padding: '2rem 20px',
  minHeight: '100vh',
  boxSizing: 'border-box',
}));

const TabInner = styled.div({
  maxWidth: 1440,
  marginLeft: 'auto',
  marginRight: 'auto',
});

const HeaderRow = styled.div(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  gap: '1rem',
  alignItems: 'flex-start',
  marginBottom: '1rem',
  padding: '1.25rem 1.5rem',
  border: `1px solid ${theme.appBorderColor}`,
  borderRadius: 16,
  background: theme.appContentBg,
}));

const Actions = styled.div({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.75rem',
  alignItems: 'center',
  justifyContent: 'flex-end',
});

const BuilderShell = styled.div(({ theme }) => ({
  border: `1px solid ${theme.appBorderColor}`,
  borderRadius: 16,
  background: theme.appContentBg,
  overflow: 'hidden',
  boxShadow: theme.base === 'light' ? '0 16px 60px rgba(15, 23, 42, 0.08)' : 'none',
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

const SectionCard = styled.div(({ theme }) => ({
  border: `1px solid ${theme.appBorderColor}`,
  borderRadius: 16,
  background: theme.appContentBg,
  padding: '1.25rem 1.5rem',
  marginTop: '1rem',
}));

type BuilderComponentDefinition = {
  label: string;
  category: string;
  fields: NonNullable<Config['components']>[string]['fields'];
  defaultProps?: Record<string, unknown>;
  render: NonNullable<Config['components']>[string]['render'];
};

type BuilderData = Data;

const createItemId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `puck-${Math.random().toString(36).slice(2, 10)}`;
};

const isComponentRecord = (value: unknown): value is { type: string; props: Record<string, unknown> } => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as { type?: unknown; props?: unknown };

  return typeof candidate.type === 'string' && !!candidate.props && typeof candidate.props === 'object';
};

const normalizeComponentList = (items: unknown): unknown => {
  if (!Array.isArray(items)) {
    return items;
  }

  return items.map((item) => {
    if (!isComponentRecord(item)) {
      return item;
    }

    const normalizedProps = Object.fromEntries(
      Object.entries(item.props).map(([key, value]) => [
        key,
        Array.isArray(value) ? normalizeComponentList(value) : value,
      ]),
    );

    return {
      ...item,
      props: {
        ...normalizedProps,
        id: typeof item.props.id === 'string' && item.props.id.length > 0 ? item.props.id : createItemId(),
      },
    };
  });
};

const normalizeBuilderData = (value: BuilderData): BuilderData => ({
  ...value,
  content: normalizeComponentList(value.content) as BuilderData['content'],
  zones: value.zones
    ? Object.fromEntries(Object.entries(value.zones).map(([zone, items]) => [zone, normalizeComponentList(items)]))
    : value.zones,
});

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

const builderRegistry: Record<string, BuilderComponentDefinition> = {
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

const builderConfig: Config = {
  components: Object.fromEntries(
    Object.entries(builderRegistry).map(([type, definition]) => [
      type,
      {
        label: definition.label,
        fields: definition.fields,
        defaultProps: definition.defaultProps,
        render: definition.render,
      },
    ]),
  ),
  categories: {
    layout: {
      title: 'Layout',
      components: ['Section', 'Stack', 'Card'],
    },
    content: {
      title: 'Content',
      components: ['Text', 'Button'],
    },
  },
  root: {
    fields: {
      title: { type: 'text' },
      description: { type: 'textarea' },
    },
    defaultProps: {
      title: 'Storybook Puck Builder',
      description: 'Build page ideas from a small curated component registry.',
    },
    render: ({ title, description, children }) => (
      <main
        style={{
          minHeight: '100%',
          padding: '2rem',
          background: 'linear-gradient(180deg, #ffffff 0%, #eff6ff 100%)',
        }}
      >
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
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
              Puck MVP
            </div>
            <h1 style={{ margin: 0, fontSize: '2rem', color: '#0f172a' }}>{title}</h1>
            <p style={{ margin: '0.75rem 0 0', color: '#475569', fontSize: '1rem', lineHeight: 1.6 }}>{description}</p>
          </header>
          <div style={{ display: 'grid', gap: '1rem' }}>{children}</div>
        </div>
      </main>
    ),
  },
};

const initialData: BuilderData = {
  root: {
    props: {
      title: 'Storybook Puck Builder',
      description: 'A first Storybook-native spike for composing nested React page fragments.',
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

const parseStoredData = (rawData: string | null): BuilderData | null => {
  if (!rawData) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawData) as BuilderData;

    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    return normalizeBuilderData(parsed);
  } catch {
    return null;
  }
};

export const Tab: React.FC<TabProps> = ({ active }) => {
  const textareaId = useId();
  const [data, setData] = useState<BuilderData>(() => normalizeBuilderData(initialData));
  const [serializedData, setSerializedData] = useState(() =>
    JSON.stringify(normalizeBuilderData(initialData), null, 2),
  );
  const [status, setStatus] = useState('Ready');

  useEffect(() => {
    if (!active) {
      return;
    }

    const storedData = parseStoredData(window.localStorage.getItem(STORAGE_KEY));

    if (storedData) {
      setData(storedData);
      setSerializedData(JSON.stringify(storedData, null, 2));
      setStatus('Loaded draft from localStorage');
      return;
    }

    const normalizedInitialData = normalizeBuilderData(initialData);
    setData(normalizedInitialData);
    setSerializedData(JSON.stringify(normalizedInitialData, null, 2));
  }, [active]);

  useEffect(() => {
    if (!active) {
      return;
    }

    const normalizedData = normalizeBuilderData(data);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedData));
    setSerializedData(JSON.stringify(normalizedData, null, 2));
  }, [active, data]);

  const categorySummary = useMemo(
    () =>
      Object.entries(builderRegistry)
        .map(([, definition]) => `${definition.category}: ${definition.label}`)
        .join(' · '),
    [],
  );

  if (!active) {
    return null;
  }

  const copyJson = async () => {
    const nextValue = JSON.stringify(normalizeBuilderData(data), null, 2);

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
    const parsed = parseStoredData(serializedData);

    if (!parsed) {
      setStatus('Import failed: invalid JSON payload');
      return;
    }

    setData(normalizeBuilderData(parsed));
    setStatus('Imported JSON into the builder');
  };

  const resetData = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    const normalizedInitialData = normalizeBuilderData(initialData);
    setData(normalizedInitialData);
    setSerializedData(JSON.stringify(normalizedInitialData, null, 2));
    setStatus('Reset to the initial demo page');
  };

  return (
    <TabWrapper>
      <TabInner>
        <HeaderRow>
          <div>
            <H1 style={{ margin: 0 }}>Page Builder</H1>
            <Note>
              Puck now powers the addon tab directly. This MVP keeps the registry intentionally small, stores edits in
              <code> localStorage </code>, and proves nested composition inside Storybook.
            </Note>
            <Note style={{ marginTop: '0.5rem' }}>Available components: {categorySummary}</Note>
          </div>
          <Actions>
            <Button onClick={resetData}>Reset</Button>
            <Button onClick={copyJson}>Copy JSON</Button>
            <Button primary onClick={importJson}>
              Import JSON
            </Button>
          </Actions>
        </HeaderRow>

        <BuilderShell>
          <Puck
            config={builderConfig}
            data={data}
            onChange={(nextData) => {
              setData(normalizeBuilderData(nextData as BuilderData));
              setStatus('Draft saved locally');
            }}
            onPublish={async (nextData) => {
              setData(normalizeBuilderData(nextData as BuilderData));
              setStatus('Publish triggered and draft saved locally');
            }}
            height="calc(100vh - 240px)"
            viewports={[
              { width: 375, label: 'Mobile', icon: 'Smartphone' },
              { width: 768, label: 'Tablet', icon: 'Tablet' },
              { width: 1200, label: 'Desktop', icon: 'Monitor' },
            ]}
          />
        </BuilderShell>

        <SectionCard>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}>
            <div>
              <H1 style={{ fontSize: '1.25rem', margin: 0 }}>JSON Workspace</H1>
              <Note style={{ marginTop: '0.5rem' }}>
                Edit the payload manually, then use <strong>Import JSON</strong> to load it back into Puck. The current
                draft is also copied here automatically.
              </Note>
            </div>
            <StatusText>{status}</StatusText>
          </div>
          <label htmlFor={textareaId} style={{ display: 'block', margin: '1rem 0 0.5rem', fontWeight: 700 }}>
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
            Want to evolve this next? The clean follow-up would be a project-level builder registry API, then optional
            mapping from Storybook component metadata into that registry.
            <div style={{ marginTop: '0.5rem' }}>
              Puck docs: <Link href="https://puckeditor.com/docs/getting-started">Getting Started</Link>
            </div>
          </Placeholder>
        </SectionCard>
      </TabInner>
    </TabWrapper>
  );
};
