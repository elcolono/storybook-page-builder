import type { Fields } from '@puckeditor/core';

export type BuilderFields = Fields<Record<string, unknown>>;

export type PageBuilderSlots =
  | string[]
  | Record<
      string,
      {
        allow?: string[];
        disallow?: string[];
        label?: string;
      }
    >;

export type PageBuilderParameter = {
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

export type PrimitiveFieldValue = string | number | boolean;

export type PreviewMetadataRequestPayload = {
  requestId: string;
  storyIds: string[];
};

export type PreviewMetadataEntry = {
  storyId: string;
  title: string;
  name: string;
  componentBacked: boolean;
  defaultProps: Record<string, unknown>;
  fields: BuilderFields;
  pageBuilder: PageBuilderParameter;
  slotNames: string[];
  unsupportedReason?: string;
};

export type PreviewMetadataResponsePayload = {
  requestId: string;
  entries: PreviewMetadataEntry[];
};

export type PreviewMetadataInput = {
  storyId: string;
  title: string;
  name: string;
  args: unknown;
  argTypes: unknown;
  parameters: unknown;
  componentBacked: boolean;
};

export const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object';

export const isSerializablePrimitive = (value: unknown): value is PrimitiveFieldValue =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';

export const isSerializableValue = (value: unknown): value is PrimitiveFieldValue | null | undefined =>
  value == null || isSerializablePrimitive(value);

export const getPageBuilderParameter = (parameters: unknown): PageBuilderParameter => {
  if (!isRecord(parameters) || !isRecord(parameters.pageBuilder)) {
    return {};
  }

  return parameters.pageBuilder as PageBuilderParameter;
};

export const getSlotNames = (slots: PageBuilderSlots | undefined) => {
  if (!slots) {
    return [];
  }

  return Array.isArray(slots) ? slots.filter((slot): slot is string => typeof slot === 'string') : Object.keys(slots);
};

const getSlotFields = (slots: PageBuilderSlots | undefined): BuilderFields => {
  if (!slots) {
    return {};
  }

  if (Array.isArray(slots)) {
    return Object.fromEntries(
      slots.filter((slot): slot is string => typeof slot === 'string').map((slot) => [slot, { type: 'slot' }]),
    ) as BuilderFields;
  }

  return Object.fromEntries(
    Object.entries(slots).map(([slot, options]) => [
      slot,
      {
        type: 'slot',
        ...(Array.isArray(options.allow) ? { allow: options.allow } : {}),
        ...(Array.isArray(options.disallow) ? { disallow: options.disallow } : {}),
        ...(typeof options.label === 'string' ? { label: options.label } : {}),
      },
    ]),
  ) as BuilderFields;
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

const inferField = (argName: string, argType: unknown, value: unknown): BuilderFields[string] | null => {
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

export const buildPreviewMetadataEntry = ({
  storyId,
  title,
  name,
  args,
  argTypes,
  parameters,
  componentBacked,
}: PreviewMetadataInput): PreviewMetadataEntry | null => {
  const pageBuilder = getPageBuilderParameter(parameters);

  if (pageBuilder.enabled === false) {
    return null;
  }

  const slotNames = getSlotNames(pageBuilder.slots);
  const explicitFields = isRecord(pageBuilder.fields) ? (pageBuilder.fields as BuilderFields) : {};
  const slotFields = getSlotFields(pageBuilder.slots);
  const explicitDefaultProps = isRecord(pageBuilder.defaultProps) ? pageBuilder.defaultProps : {};
  const storyArgs = isRecord(args) ? args : {};
  const storyArgTypes = isRecord(argTypes) ? argTypes : {};
  const includeArgs = Array.isArray(pageBuilder.includeArgs) ? new Set(pageBuilder.includeArgs) : null;
  const excludeArgs = new Set(Array.isArray(pageBuilder.excludeArgs) ? pageBuilder.excludeArgs : []);
  const candidateArgNames = new Set([
    ...Object.keys(storyArgs),
    ...Object.keys(storyArgTypes),
    ...Object.keys(explicitFields),
  ]);
  const fields: BuilderFields = { ...slotFields };
  const defaultProps: Record<string, unknown> = {};

  candidateArgNames.forEach((argName) => {
    if (slotNames.includes(argName) || excludeArgs.has(argName)) {
      return;
    }

    if (includeArgs && !includeArgs.has(argName) && !(argName in explicitFields)) {
      return;
    }

    const explicitField = explicitFields[argName];
    const inferredField = explicitField ?? inferField(argName, storyArgTypes[argName], storyArgs[argName]);

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

  if (!componentBacked) {
    unsupportedReason = 'Storybook did not expose component-backed metadata for this story.';
  }

  return {
    storyId,
    title,
    name,
    componentBacked,
    defaultProps,
    fields,
    pageBuilder,
    slotNames,
    unsupportedReason,
  };
};

export const createPreviewMetadataErrorEntry = (storyId: string, unsupportedReason: string): PreviewMetadataEntry => ({
  storyId,
  title: storyId,
  name: storyId,
  componentBacked: true,
  defaultProps: {},
  fields: {},
  pageBuilder: {},
  slotNames: [],
  unsupportedReason,
});

export const isPreviewMetadataResponsePayload = (value: unknown): value is PreviewMetadataResponsePayload => {
  if (!isRecord(value) || typeof value.requestId !== 'string' || !Array.isArray(value.entries)) {
    return false;
  }

  return value.entries.every(
    (entry) =>
      isRecord(entry) &&
      typeof entry.storyId === 'string' &&
      typeof entry.title === 'string' &&
      typeof entry.name === 'string' &&
      typeof entry.componentBacked === 'boolean' &&
      isRecord(entry.defaultProps) &&
      isRecord(entry.fields) &&
      isRecord(entry.pageBuilder) &&
      Array.isArray(entry.slotNames),
  );
};
