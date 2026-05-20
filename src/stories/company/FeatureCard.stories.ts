import type { Meta, StoryObj } from '@storybook/react-vite';

import { FeatureCard, type FeatureCardProps } from './CompanyComponents';
import { textField, textareaField, toneField } from './pageBuilderControls';

const defaultProps = {
  iconLabel: 'AI',
  title: 'Suggested next action',
  description: 'Surface the highest-impact follow-up based on account stage, sentiment, and usage trends.',
  badgeLabel: 'Automation',
  ctaLabel: 'Configure',
  tone: 'brand',
} satisfies FeatureCardProps;

const meta = {
  title: 'Company UI/Content/Feature Card',
  component: FeatureCard,
  parameters: {
    pageBuilder: {
      label: 'Feature Card',
      category: 'Content',
      fields: {
        iconLabel: textField,
        title: textField,
        description: textareaField,
        badgeLabel: textField,
        ctaLabel: textField,
        tone: toneField,
      },
      defaultProps,
    },
  },
} satisfies Meta<typeof FeatureCard>;

export default meta;
type Story = StoryObj<typeof FeatureCard>;

export const Default: Story = {
  args: defaultProps,
};
