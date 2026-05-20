import type { Meta, StoryObj } from '@storybook/react-vite';

import { IntegrationCard, type IntegrationCardProps } from './CompanyComponents';
import { textField, textareaField, toneField } from './pageBuilderControls';

const defaultProps = {
  provider: 'Salesforce',
  description: 'Sync account ownership, renewal dates, and opportunity stage into product workspaces.',
  status: 'Connected',
  buttonLabel: 'Manage',
  tone: 'brand',
} satisfies IntegrationCardProps;

const meta = {
  title: 'Company UI/Product/Integration Card',
  component: IntegrationCard,
  parameters: {
    pageBuilder: {
      label: 'Integration Card',
      category: 'Product',
      fields: {
        provider: textField,
        description: textareaField,
        status: textField,
        buttonLabel: textField,
        tone: toneField,
      },
      defaultProps,
    },
  },
} satisfies Meta<typeof IntegrationCard>;

export default meta;
type Story = StoryObj<typeof IntegrationCard>;

export const Default: Story = {
  args: defaultProps,
};
