import type { Meta, StoryObj } from '@storybook/react-vite';

import { DataTablePreview, type DataTablePreviewProps } from './CompanyComponents';
import { densityField, numberField, textField } from './pageBuilderControls';

const defaultProps = {
  title: 'Accounts at risk',
  subtitle: 'Prioritized by health score and open product gaps.',
  primaryMetric: '18 accounts',
  statusLabel: 'Needs review',
  rows: 4,
  density: 'comfortable',
} satisfies DataTablePreviewProps;

const meta = {
  title: 'Company UI/Data/Data Table Preview',
  component: DataTablePreview,
  parameters: {
    pageBuilder: {
      label: 'Data Table Preview',
      category: 'Data',
      fields: {
        title: textField,
        subtitle: textField,
        primaryMetric: textField,
        statusLabel: textField,
        rows: numberField,
        density: densityField,
      },
      defaultProps,
    },
  },
} satisfies Meta<typeof DataTablePreview>;

export default meta;
type Story = StoryObj<typeof DataTablePreview>;

export const Default: Story = {
  args: defaultProps,
};
