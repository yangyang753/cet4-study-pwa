import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TodayPage } from './TodayPage';

describe('TodayPage', () => {
  it('shows the countdown and the four-part 60-minute plan', () => {
    render(<TodayPage today="2026-09-22" examDate="2026-12-12" />);
    expect(screen.getByText('81')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /今日 60 分钟计划/ })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(4);
    expect(screen.getByText('正在积累数据')).toBeVisible();
  });
});
