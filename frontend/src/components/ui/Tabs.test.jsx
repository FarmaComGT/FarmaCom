import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { TabsList, TabLink, TabButton } from './Tabs.jsx';

describe('TabsList + TabLink', () => {
  it('marca como actual el enlace que coincide con la ruta', () => {
    render(
      <MemoryRouter initialEntries={['/reports']}>
        <TabsList as="nav" ariaLabel="Tipos de reportes">
          <TabLink to="/reports" end>Ventas</TabLink>
          <TabLink to="/reports/rentabilidad">Rentabilidad por sucursal</TabLink>
        </TabsList>
      </MemoryRouter>,
    );
    expect(screen.getByRole('navigation', { name: 'Tipos de reportes' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ventas' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Rentabilidad por sucursal' })).not.toHaveAttribute('aria-current');
  });
});

describe('TabsList + TabButton', () => {
  it('refleja el estado activo y dispara onClick', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <TabsList ariaLabel="Filtrar por estado">
        <TabButton active onClick={onClick}>Todos</TabButton>
        <TabButton active={false} onClick={onClick}>Activos</TabButton>
      </TabsList>,
    );
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Activos' })).toHaveAttribute('aria-pressed', 'false');
    await user.click(screen.getByRole('button', { name: 'Activos' }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
