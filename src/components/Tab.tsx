import React, { useMemo } from 'react';
import { styled } from 'storybook/theming';

import { BUILDER_RUNTIME_STORY_ID } from '../constants';

interface TabProps {
  active?: boolean;
}

const TabWrapper = styled.div(({ theme }) => ({
  background: theme.appContentBg,
  color: theme.textColor,
  width: '100%',
  height: '100%',
  minHeight: 0,
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
}));

const RuntimeFrame = styled.iframe({
  flex: 1,
  width: '100%',
  minHeight: 0,
  border: 'none',
  background: '#ffffff',
});

const getRuntimeFrameSrc = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  const url = new URL('./iframe.html', window.location.href);
  url.searchParams.set('id', BUILDER_RUNTIME_STORY_ID);
  url.searchParams.set('viewMode', 'story');

  return url.toString();
};

export const Tab: React.FC<TabProps> = ({ active }) => {
  const runtimeFrameSrc = useMemo(() => getRuntimeFrameSrc(), []);

  if (!active) {
    return null;
  }

  return (
    <TabWrapper>
      <RuntimeFrame src={runtimeFrameSrc} title="Page Builder" />
    </TabWrapper>
  );
};
