import type { Meta, StoryObj } from '@storybook/react-vite';

import { ToggleSetting, type ToggleSettingProps } from './CompanyComponents';
import { booleanField, textField, textareaField } from './pageBuilderControls';

const defaultProps = {
  title: 'Notify customer success',
  description: 'Send account teams an update when a request moves into planned discovery.',
  badgeLabel: 'Automation',
  enabled: true,
} satisfies ToggleSettingProps;

const meta = {
  title: 'Company UI/Forms/Toggle Setting',
  component: ToggleSetting,
  parameters: {
    pageBuilder: {
      label: 'Toggle Setting',
      category: 'Forms',
      fields: {
        title: textField,
        description: textareaField,
        badgeLabel: textField,
        enabled: booleanField,
      },
      defaultProps,
    },
  },
} satisfies Meta<typeof ToggleSetting>;

export default meta;
type Story = StoryObj<typeof ToggleSetting>;

export const Default: Story = {
  args: defaultProps,
};
