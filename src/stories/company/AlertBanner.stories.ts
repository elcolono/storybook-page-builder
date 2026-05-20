import type { Meta, StoryObj } from '@storybook/react-vite';

import { AlertBanner, type AlertBannerProps } from './CompanyComponents';
import { textField, textareaField, toneField } from './pageBuilderControls';

const defaultProps = {
  title: 'Usage anomaly detected',
  description: 'Workspace activity dropped 24% this week. Review onboarding and support signals before renewal.',
  actionLabel: 'Review account',
  tone: 'warning',
} satisfies AlertBannerProps;

const meta = {
  title: 'Company UI/Feedback/Alert Banner',
  component: AlertBanner,
  parameters: {
    pageBuilder: {
      label: 'Alert Banner',
      category: 'Feedback',
      fields: {
        title: textField,
        description: textareaField,
        actionLabel: textField,
        tone: toneField,
      },
      defaultProps,
    },
  },
} satisfies Meta<typeof AlertBanner>;

export default meta;
type Story = StoryObj<typeof AlertBanner>;

export const Default: Story = {
  args: defaultProps,
};
