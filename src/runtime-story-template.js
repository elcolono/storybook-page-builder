import React from 'react';

import { PageBuilderRuntime } from './runtime.js';

export default {
  id: 'storybook-page-builder',
  title: 'Page Builder/Runtime',
  parameters: {
    layout: 'fullscreen',
    docs: {
      disable: true,
    },
  },
  tags: ['!autodocs'],
};

export const Runtime = {
  render: () => React.createElement(PageBuilderRuntime),
};
