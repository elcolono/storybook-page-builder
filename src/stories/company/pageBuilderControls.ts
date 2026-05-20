export const textField = { type: 'text' };
export const textareaField = { type: 'textarea' };
export const numberField = { type: 'number' };
export const booleanField = {
  type: 'radio',
  options: [
    { label: 'Yes', value: true },
    { label: 'No', value: false },
  ],
};

export const toneField = {
  type: 'select',
  options: [
    { label: 'Neutral', value: 'neutral' },
    { label: 'Brand', value: 'brand' },
    { label: 'Success', value: 'success' },
    { label: 'Warning', value: 'warning' },
    { label: 'Danger', value: 'danger' },
    { label: 'Ink', value: 'ink' },
  ],
};

export const densityField = {
  type: 'select',
  options: [
    { label: 'Comfortable', value: 'comfortable' },
    { label: 'Compact', value: 'compact' },
  ],
};

export const paddingField = {
  type: 'select',
  options: [
    { label: 'Compact', value: 'compact' },
    { label: 'Normal', value: 'normal' },
    { label: 'Spacious', value: 'spacious' },
  ],
};

export const alignmentField = {
  type: 'radio',
  options: [
    { label: 'Left', value: 'left' },
    { label: 'Center', value: 'center' },
  ],
};

export const headerVariantField = {
  type: 'radio',
  options: [
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' },
  ],
};

export const fieldStateField = {
  type: 'select',
  options: [
    { label: 'Default', value: 'default' },
    { label: 'Success', value: 'success' },
    { label: 'Error', value: 'error' },
  ],
};
