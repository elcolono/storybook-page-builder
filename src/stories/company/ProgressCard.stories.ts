import type { Meta, StoryObj } from '@storybook/react-vite';

import { ProgressCard, type ProgressCardProps } from './CompanyComponents';
import { numberField, textField, toneField } from './pageBuilderControls';

const defaultProps = {
  title: 'Launch readiness',
  value: '72%',
  caption: 'Design, copy, and enablement are on track for the beta release.',
  progress: 72,
  tone: 'brand',
} satisfies ProgressCardProps;

const meta = {
  title: 'Company UI/Data/Progress Card',
  component: ProgressCard,
  parameters: {
    pageBuilder: {
      label: 'Progress Card',
      category: 'Data',
      fields: {
        title: textField,
        value: textField,
        caption: textField,
        progress: numberField,
        tone: toneField,
      },
      defaultProps,
    },
  },
} satisfies Meta<typeof ProgressCard>;

export default meta;
type Story = StoryObj<typeof ProgressCard>;

export const Default: Story = {
  args: defaultProps,
};
