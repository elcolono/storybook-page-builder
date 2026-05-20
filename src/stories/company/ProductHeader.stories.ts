import type { Meta, StoryObj } from '@storybook/react-vite';

import { ProductHeader, type ProductHeaderProps } from './CompanyComponents';
import { headerVariantField, textField } from './pageBuilderControls';

const defaultProps = {
  brandName: 'Atlas CRM',
  navItems: 'Dashboard, Customers, Pipeline, Reports',
  activeItem: 'Customers',
  ctaLabel: 'New customer',
  userName: 'Mira Stone',
  variant: 'light',
} satisfies ProductHeaderProps;

const meta = {
  title: 'Company UI/Navigation/Product Header',
  component: ProductHeader,
  parameters: {
    layout: 'fullscreen',
    pageBuilder: {
      label: 'Product Header',
      category: 'Navigation',
      fields: {
        brandName: textField,
        navItems: textField,
        activeItem: textField,
        ctaLabel: textField,
        userName: textField,
        variant: headerVariantField,
      },
      defaultProps,
    },
  },
} satisfies Meta<typeof ProductHeader>;

export default meta;
type Story = StoryObj<typeof ProductHeader>;

export const Default: Story = {
  args: defaultProps,
};
