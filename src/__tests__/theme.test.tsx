import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { describe, it, expect } from 'vitest';

// Test component that uses the theme context
const TestComponent = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme-display">{theme}</span>
      <button data-testid="toggle-button" onClick={toggleTheme}>
        Toggle Theme
      </button>
    </div>
  );
};

describe('Theme Context', () => {
  it('should provide initial theme from localStorage or system preference', () => {
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });

    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const themeDisplay = screen.getByTestId('theme-display');
    expect(themeDisplay).toBeInTheDocument();
  });

  it('should toggle theme when button is clicked', () => {
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(() => 'light'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });

    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const themeDisplay = screen.getByTestId('theme-display');
    const toggleButton = screen.getByTestId('toggle-button');

    expect(themeDisplay.textContent).toBe('light');
    
    fireEvent.click(toggleButton);
    expect(themeDisplay.textContent).toBe('dark');
    
    fireEvent.click(toggleButton);
    expect(themeDisplay.textContent).toBe('light');
  });
});