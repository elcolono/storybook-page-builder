import type { Meta, StoryObj } from '@storybook/react-vite';

import { Stepper, type StepperProps } from './CompanyComponents';
import { numberField, textField } from './pageBuilderControls';

const defaultProps = {
  title: 'Feature rollout',
  stepOne: 'Validate demand with target accounts',
  stepTwo: 'Prototype end-to-end workflow',
  stepThree: 'Ship beta and measure adoption',
  currentStep: 2,
} satisfies StepperProps;

const meta = {
  title: 'Company UI/Feedback/Stepper',
  component: Stepper,
  parameters: {
    pageBuilder: {
      label: 'Stepper',
      category: 'Feedback',
      fields: {
        title: textField,
        stepOne: textField,
        stepTwo: textField,
        stepThree: textField,
        currentStep: numberField,
      },
      defaultProps,
    },
  },
} satisfies Meta<typeof Stepper>;

export default meta;
type Story = StoryObj<typeof Stepper>;

export const Default: Story = {
  args: defaultProps,
};
