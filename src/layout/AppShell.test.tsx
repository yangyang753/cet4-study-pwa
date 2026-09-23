import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppShell } from './AppShell';

describe('AppShell', () => {
  it('exposes the four primary study destinations', () => {
    render(
      <MemoryRouter>
        <AppShell><p>学习内容</p></AppShell>
      </MemoryRouter>,
    );

    for (const label of ['今日学习', '听力精练', '专项练习', '错题复习', '限时模拟', '账户同步', 'A4 打印']) {
      expect(screen.getAllByRole('link', { name: label }).length).toBeGreaterThan(0);
    }
    expect(screen.getByText('学习内容')).toBeInTheDocument();
  });

  it('renders the active child route inside the shell', () => {
    render(
      <MemoryRouter initialEntries={['/today']}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="today" element={<h1>今日任务</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: '今日任务' })).toBeInTheDocument();
  });
});
