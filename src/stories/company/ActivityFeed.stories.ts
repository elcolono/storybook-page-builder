import type { Meta, StoryObj } from '@storybook/react-vite';

import { ActivityFeed, type ActivityFeedProps } from './CompanyComponents';
import { textField, toneField } from './pageBuilderControls';

const defaultProps = {
  title: 'Recent account activity',
  itemOne: 'Northstar renewed after the beta onboarding walkthrough.',
  itemTwo: 'Finance team requested a dashboard export for QBR prep.',
  itemThree: 'Support sentiment improved after workflow fixes shipped.',
  tone: 'neutral',
} satisfies ActivityFeedProps;

const meta = {
  title: 'Company UI/Data/Activity Feed',
  component: ActivityFeed,
  parameters: {
    pageBuilder: {
      label: 'Activity Feed',
      category: 'Data',
      fields: {
        title: textField,
        itemOne: textField,
        itemTwo: textField,
        itemThree: textField,
        tone: toneField,
      },
      defaultProps,
    },
  },
} satisfies Meta<typeof ActivityFeed>;

export default meta;
type Story = StoryObj<typeof ActivityFeed>;

export const Default: Story = {
  args: defaultProps,
};
