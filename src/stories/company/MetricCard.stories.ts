import type { Meta, StoryObj } from '@storybook/react-vite';

import { MetricCard, type MetricCardProps } from './CompanyComponents';
import { textField, textareaField, toneField } from './pageBuilderControls';

const defaultProps = {
  label: 'Expansion pipeline',
  value: '$1.8M',
  change: '+12.4%',
  description: 'Forecasted expansion influenced by product-qualified account signals.',
  tone: 'success',
} satisfies MetricCardProps;

const meta = {
  title: 'Company UI/Data/Metric Card',
  component: MetricCard,
  parameters: {
    pageBuilder: {
      label: 'Metric Card',
      category: 'Data',
      fields: {
        label: textField,
        value: textField,
        change: textField,
        description: textareaField,
        tone: toneField,
      },
      defaultProps,
    },
  },
} satisfies Meta<typeof MetricCard>;

export default meta;
type Story = StoryObj<typeof MetricCard>;

export const Default: Story = {
  args: defaultProps,
};
