import type { Meta, StoryObj } from '@storybook/react-vite';

import { FilterBar, type FilterBarProps } from './CompanyComponents';
import { textField } from './pageBuilderControls';

const defaultProps = {
  placeholder: 'Search accounts or owners',
  filterOne: 'Region',
  filterTwo: 'Health',
  buttonLabel: 'Apply',
} satisfies FilterBarProps;

const meta = {
  title: 'Company UI/Forms/Filter Bar',
  component: FilterBar,
  parameters: {
    pageBuilder: {
      label: 'Filter Bar',
      category: 'Forms',
      fields: {
        placeholder: textField,
        filterOne: textField,
        filterTwo: textField,
        buttonLabel: textField,
      },
      defaultProps,
    },
  },
} satisfies Meta<typeof FilterBar>;

export default meta;
type Story = StoryObj<typeof FilterBar>;

export const Default: Story = {
  args: defaultProps,
};
