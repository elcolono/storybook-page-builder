import type { Meta, StoryObj } from '@storybook/react-vite';

import { SplitFeature, type SplitFeatureProps } from './CompanyComponents';
import { booleanField, textField, textareaField, toneField } from './pageBuilderControls';

const defaultProps = {
  eyebrow: 'Insight',
  title: 'Prioritize the accounts most likely to expand',
  description: 'Show product and revenue teams the same operating picture with status, risk, and next best actions.',
  statValue: '38%',
  statLabel: 'faster planning cycle',
  reverse: false,
  tone: 'success',
} satisfies SplitFeatureProps;

const meta = {
  title: 'Company UI/Content/Split Feature',
  component: SplitFeature,
  parameters: {
    pageBuilder: {
      label: 'Split Feature',
      category: 'Content',
      fields: {
        eyebrow: textField,
        title: textField,
        description: textareaField,
        statValue: textField,
        statLabel: textField,
        reverse: booleanField,
        tone: toneField,
      },
      defaultProps,
      slots: {
        children: { label: 'Nested proof points' },
      },
    },
  },
} satisfies Meta<typeof SplitFeature>;

export default meta;
type Story = StoryObj<typeof SplitFeature>;

export const Default: Story = {
  args: defaultProps,
};
