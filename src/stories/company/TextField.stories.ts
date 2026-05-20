import type { Meta, StoryObj } from '@storybook/react-vite';

import { TextField, type TextFieldProps } from './CompanyComponents';
import { booleanField, fieldStateField, textField } from './pageBuilderControls';

const defaultProps = {
  label: 'Feature name',
  placeholder: 'Customer health cockpit',
  value: '',
  helpText: 'Use the customer-facing name whenever possible.',
  required: true,
  state: 'default',
} satisfies TextFieldProps;

const meta = {
  title: 'Company UI/Forms/Text Field',
  component: TextField,
  parameters: {
    pageBuilder: {
      label: 'Text Field',
      category: 'Forms',
      fields: {
        label: textField,
        placeholder: textField,
        value: textField,
        helpText: textField,
        required: booleanField,
        state: fieldStateField,
      },
      defaultProps,
    },
  },
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof TextField>;

export const Default: Story = {
  args: defaultProps,
};
