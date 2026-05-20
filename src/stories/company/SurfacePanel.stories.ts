import type { Meta, StoryObj } from '@storybook/react-vite';

import { SurfacePanel, type SurfacePanelProps } from './CompanyComponents';
import { paddingField, textField, textareaField, toneField } from './pageBuilderControls';

const defaultProps = {
  eyebrow: 'Workspace',
  title: 'Experiment planning',
  description: 'Group related components in a product-ready surface with consistent spacing.',
  tone: 'neutral',
  padding: 'normal',
} satisfies SurfacePanelProps;

const meta = {
  title: 'Company UI/Layout/Surface Panel',
  component: SurfacePanel,
  parameters: {
    pageBuilder: {
      label: 'Surface Panel',
      category: 'Layout',
      fields: {
        eyebrow: textField,
        title: textField,
        description: textareaField,
        tone: toneField,
        padding: paddingField,
      },
      defaultProps,
      slots: {
        children: { label: 'Content' },
      },
    },
  },
} satisfies Meta<typeof SurfacePanel>;

export default meta;
type Story = StoryObj<typeof SurfacePanel>;

export const Default: Story = {
  args: defaultProps,
};
