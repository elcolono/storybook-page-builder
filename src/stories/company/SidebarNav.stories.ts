import type { Meta, StoryObj } from '@storybook/react-vite';

import { SidebarNav, type SidebarNavProps } from './CompanyComponents';
import { booleanField, textField } from './pageBuilderControls';

const defaultProps = {
  workspaceName: 'Growth Squad',
  items: 'Overview, Experiments, Customers, Insights, Settings',
  activeItem: 'Experiments',
  badgeLabel: 'Q3 Roadmap',
  compact: false,
} satisfies SidebarNavProps;

const meta = {
  title: 'Company UI/Navigation/Sidebar Navigation',
  component: SidebarNav,
  parameters: {
    pageBuilder: {
      label: 'Sidebar Navigation',
      category: 'Navigation',
      fields: {
        workspaceName: textField,
        items: textField,
        activeItem: textField,
        badgeLabel: textField,
        compact: booleanField,
      },
      defaultProps,
    },
  },
} satisfies Meta<typeof SidebarNav>;

export default meta;
type Story = StoryObj<typeof SidebarNav>;

export const Default: Story = {
  args: defaultProps,
};
