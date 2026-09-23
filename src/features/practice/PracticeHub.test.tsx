import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { PracticeHub } from './PracticeHub';

describe('PracticeHub', () => {
  it('links every major skill to its complete content collection', () => {
    render(<MemoryRouter><PracticeHub /></MemoryRouter>);

    expect(screen.getByRole('link', { name: /阅读/ })).toHaveAttribute('href', '/practice/reading');
    expect(screen.getByText('30 套')).toBeVisible();
    expect(screen.getByRole('link', { name: /写作/ })).toHaveAttribute('href', '/practice/writing');
    expect(screen.getByRole('link', { name: /翻译/ })).toHaveAttribute('href', '/practice/translation');
  });
});
