import type { Meta, StoryObj } from '@storybook/react-vite';

import { PricingCard, type PricingCardProps } from './CompanyComponents';
import { booleanField, textField, textareaField } from './pageBuilderControls';

const defaultProps = {
  planName: 'Scale',
  price: '$89',
  cadence: 'per user / month',
  description: 'For teams building cross-functional product workflows.',
  featureOne: 'Unlimited workspaces',
  featureTwo: 'Advanced permissions',
  featureThree: 'Executive reporting',
  buttonLabel: 'Start trial',
  featured: true,
} satisfies PricingCardProps;

const meta = {
  title: 'Company UI/Product/Pricing Card',
  component: PricingCard,
  parameters: {
    pageBuilder: {
      label: 'Pricing Card',
      category: 'Product',
      fields: {
        planName: textField,
        price: textField,
        cadence: textField,
        description: textareaField,
        featureOne: textField,
        featureTwo: textField,
        featureThree: textField,
        buttonLabel: textField,
        featured: booleanField,
      },
      defaultProps,
    },
  },
} satisfies Meta<typeof PricingCard>;

export default meta;
type Story = StoryObj<typeof PricingCard>;

export const Default: Story = {
  args: defaultProps,
};
