import type { Meta, StoryObj } from '@storybook/react-vite';

import { SelectField, type SelectFieldProps } from './CompanyComponents';
import { fieldStateField, textField } from './pageBuilderControls';

const defaultProps = {
  label: 'Product area',
  value: 'Growth',
  optionsText: 'Growth, Core Platform, Data, Mobile',
  helpText: 'Route the request to the right product group.',
  state: 'default',
} satisfies SelectFieldProps;

const meta = {
  title: 'Company UI/Forms/Select Field',
  component: SelectField,
  parameters: {
    pageBuilder: {
      label: 'Select Field',
      category: 'Forms',
      fields: {
        label: textField,
        value: textField,
        optionsText: textField,
        helpText: textField,
        state: fieldStateField,
      },
      defaultProps,
    },
  },
} satisfies Meta<typeof SelectField>;

export default meta;
type Story = StoryObj<typeof SelectField>;

export const Default: Story = {
  args: defaultProps,
};
