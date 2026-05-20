import type { Meta, StoryObj } from '@storybook/react-vite';

import { AppShell, type AppShellProps } from './CompanyComponents';
import { textField } from './pageBuilderControls';

const defaultProps = {
  appName: 'Atlas CRM',
  workspaceName: 'Enterprise Sales',
} satisfies AppShellProps;

const meta = {
  title: 'Company UI/Application/App Shell',
  component: AppShell,
  parameters: {
    layout: 'fullscreen',
    pageBuilder: {
      label: 'App Shell',
      category: 'Application',
      fields: {
        appName: textField,
        workspaceName: textField,
      },
      defaultProps,
      slots: {
        header: { label: 'Header', allow: ['Product Header'] },
        sidebar: { label: 'Sidebar', allow: ['Sidebar Navigation'] },
        children: { label: 'Content' },
      },
    },
  },
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof AppShell>;

export const Default: Story = {
  args: defaultProps,
};
