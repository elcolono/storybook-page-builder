import type { Meta, StoryObj } from '@storybook/react-vite';

import { EmptyState, type EmptyStateProps } from './CompanyComponents';
import { textField, textareaField, toneField } from './pageBuilderControls';

const defaultProps = {
  title: 'No experiments yet',
  description: 'Create the first experiment to align product, data, and customer teams around a measurable bet.',
  actionLabel: 'Create experiment',
  tone: 'neutral',
} satisfies EmptyStateProps;

const meta = {
  title: 'Company UI/Feedback/Empty State',
  component: EmptyState,
  parameters: {
    pageBuilder: {
      label: 'Empty State',
      category: 'Feedback',
      fields: {
        title: textField,
        description: textareaField,
        actionLabel: textField,
        tone: toneField,
      },
      defaultProps,
    },
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {
  args: defaultProps,
};
