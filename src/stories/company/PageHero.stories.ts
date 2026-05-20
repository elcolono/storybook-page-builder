import type { Meta, StoryObj } from '@storybook/react-vite';

import { PageHero, type PageHeroProps } from './CompanyComponents';
import { textField, textareaField, toneField } from './pageBuilderControls';

const defaultProps = {
  eyebrow: 'Launch campaign',
  title: 'Turn customer signals into shipped product decisions',
  description:
    'Combine feedback, usage data, and roadmap bets in one workspace so product teams can prototype the next release before engineering starts.',
  primaryAction: 'Create brief',
  secondaryAction: 'View examples',
  mediaLabel: 'Opportunity score',
  tone: 'brand',
} satisfies PageHeroProps;

const meta = {
  title: 'Company UI/Content/Page Hero',
  component: PageHero,
  parameters: {
    layout: 'fullscreen',
    pageBuilder: {
      label: 'Page Hero',
      category: 'Content',
      fields: {
        eyebrow: textField,
        title: textField,
        description: textareaField,
        primaryAction: textField,
        secondaryAction: textField,
        mediaLabel: textField,
        tone: toneField,
      },
      defaultProps,
      slots: {
        children: { label: 'Supporting content' },
      },
    },
  },
} satisfies Meta<typeof PageHero>;

export default meta;
type Story = StoryObj<typeof PageHero>;

export const Default: Story = {
  args: defaultProps,
};
