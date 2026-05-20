import type { ProjectAnnotations, Renderer } from 'storybook/internal/types';
import { addons } from 'storybook/preview-api';

import { PREVIEW_METADATA_REQUEST, PREVIEW_METADATA_RESPONSE } from './constants';
import {
  buildPreviewMetadataEntry,
  createPreviewMetadataErrorEntry,
  isRecord,
  type PreviewMetadataEntry,
  type PreviewMetadataRequestPayload,
  type PreviewMetadataResponsePayload,
} from './metadata';

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

const isMetadataRequestPayload = (value: unknown): value is PreviewMetadataRequestPayload =>
  isRecord(value) &&
  typeof value.requestId === 'string' &&
  Array.isArray(value.storyIds) &&
  value.storyIds.every((storyId) => typeof storyId === 'string');

const getPreviewStoryStore = () => {
  const preview = (globalThis as StorybookPreviewGlobal).__STORYBOOK_PREVIEW__;

  try {
    return preview?.storyStore ?? null;
  } catch {
    return null;
  }
};

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Unknown preview bridge error.');

const resolveStoryMetadata = async (storyId: string): Promise<PreviewMetadataEntry | null> => {
  const storyStore = getPreviewStoryStore();

  if (!storyStore) {
    return createPreviewMetadataErrorEntry(storyId, 'Storybook preview store is not ready yet.');
  }

  try {
    const story = await storyStore.loadStory({ storyId });
    const context = storyStore.getStoryContext(story, { forceInitialArgs: true });
    const entry = buildPreviewMetadataEntry({
      storyId: story.id ?? storyId,
      title: story.title ?? storyId,
      name: story.name ?? storyId,
      args: context.args ?? story.initialArgs ?? {},
      argTypes: context.argTypes ?? story.argTypes ?? {},
      parameters: context.parameters ?? story.parameters ?? {},
      componentBacked: Boolean(context.component ?? story.component),
    });

    return entry;
  } catch (error) {
    return createPreviewMetadataErrorEntry(
      storyId,
      `Preview metadata could not be resolved: ${getErrorMessage(error)}`,
    );
  }
};

const preview: ProjectAnnotations<Renderer> = {
  async beforeAll() {
    const channel = addons.getChannel();
    const onMetadataRequest = async (payload: unknown) => {
      if (!isMetadataRequestPayload(payload)) {
        return;
      }

      const resolvedEntries = await Promise.all(payload.storyIds.map((storyId) => resolveStoryMetadata(storyId)));
      const response: PreviewMetadataResponsePayload = {
        requestId: payload.requestId,
        entries: resolvedEntries.filter((entry): entry is PreviewMetadataEntry => !!entry),
      };

      channel.emit(PREVIEW_METADATA_RESPONSE, response);
    };

    channel.on(PREVIEW_METADATA_REQUEST, onMetadataRequest);

    return () => {
      channel.off(PREVIEW_METADATA_REQUEST, onMetadataRequest);
    };
  },
};

export default preview;
