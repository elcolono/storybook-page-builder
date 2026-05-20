import type { Meta, StoryObj } from '@storybook/react-vite';

import { PageHeader, type PageHeaderProps } from './CompanyComponents';
import { alignmentField, textField, textareaField } from './pageBuilderControls';

const defaultProps = {
  eyebrow: 'Feature brief',
  title: 'Customer health cockpit',
  description: 'Prototype a working product surface for account teams before committing the sprint.',
  primaryAction: 'Add section',
  secondaryAction: 'Share draft',
  align: 'left',
} satisfies PageHeaderProps;

const meta = {
  title: 'Company UI/Content/Page Header',
  component: PageHeader,
  parameters: {
    pageBuilder: {
      label: 'Page Header',
      category: 'Content',
      fields: {
        eyebrow: textField,
        title: textField,
        description: textareaField,
        primaryAction: textField,
        secondaryAction: textField,
        align: alignmentField,
      },
      defaultProps,
    },
  },
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof PageHeader>;

export const Default: Story = {
  args: defaultProps,
};
