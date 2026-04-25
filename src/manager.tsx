import React from 'react';
import { addons, types } from 'storybook/manager-api';

import { Tab } from './components/Tab';
import { ADDON_ID, TAB_ID } from './constants';

addons.register(ADDON_ID, () => {
  addons.add(TAB_ID, {
    type: types.TAB,
    title: 'Page Builder',
    render: ({ active }) => <Tab active={active} />,
  });
});
