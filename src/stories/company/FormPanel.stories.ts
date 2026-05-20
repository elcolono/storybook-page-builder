import type { Meta, StoryObj } from '@storybook/react-vite';

import { FormPanel, type FormPanelProps } from './CompanyComponents';
import { textField, textareaField } from './pageBuilderControls';

const defaultProps = {
  title: 'Create feature request',
  description: 'Capture enough structure for product, design, and engineering to review the idea.',
  submitLabel: 'Save request',
  secondaryLabel: 'Cancel',
} satisfies FormPanelProps;

const meta = {
  title: 'Company UI/Forms/Form Panel',
  component: FormPanel,
  parameters: {
    pageBuilder: {
      label: 'Form Panel',
      category: 'Forms',
      fields: {
        title: textField,
        description: textareaField,
        submitLabel: textField,
        secondaryLabel: textField,
      },
      defaultProps,
      slots: {
        children: {
          label: 'Fields',
          allow: ['Text Field', 'Select Field', 'Toggle Setting', 'Alert Banner'],
        },
      },
    },
  },
} satisfies Meta<typeof FormPanel>;

export default meta;
type Story = StoryObj<typeof FormPanel>;

export const Default: Story = {
  args: defaultProps,
};
