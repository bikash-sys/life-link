import { render, screen, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { AuthProvider } from './context/AuthContext';
import { MemoryRouter } from 'react-router-dom';

describe('LifeLink Frontend Application Foundation', () => {
  it('renders the main dashboard with brand header, stats, and medical safety notice', async () => {
    await act(async () => {
      render(<App />);
    });

    // Brand and header
    expect(screen.getByText('LifeLink')).toBeInTheDocument();
    expect(screen.getByText(/Overview of blood and essential medicine availability/i)).toBeInTheDocument();
    expect(screen.getByText(/Medical Safety Notice:/i)).toBeInTheDocument();

    // Summary Cards
    expect(screen.getByText('Total Blood Units')).toBeInTheDocument();
    expect(screen.getByText('1,284 Units')).toBeInTheDocument();
    expect(screen.getByText('Critical Blood Groups')).toBeInTheDocument();
    expect(screen.getByText('3 Groups')).toBeInTheDocument();
    expect(screen.getByText('Medicines Available')).toBeInTheDocument();
    expect(screen.getByText('486 Items')).toBeInTheDocument();
    expect(screen.getByText('Active Requests')).toBeInTheDocument();
    expect(screen.getByText('27 Requests')).toBeInTheDocument();
  });

  it('renders blood inventory groups and status levels', async () => {
    await act(async () => {
      render(<App />);
    });

    // Check ABO / Rh groups
    expect(screen.getByText('A+')).toBeInTheDocument();
    expect(screen.getByText('O-')).toBeInTheDocument();
    expect(screen.getByText('AB-')).toBeInTheDocument();
    expect(screen.getByText('182')).toBeInTheDocument();
    expect(screen.getByText('21')).toBeInTheDocument();
  });

  it('renders medicine inventory table with required columns and example medicines', async () => {
    await act(async () => {
      render(<App />);
    });

    expect(screen.getByText('Paracetamol')).toBeInTheDocument();
    expect(screen.getByText('Amoxicillin')).toBeInTheDocument();
    expect(screen.getByText('Insulin (Regular)')).toBeInTheDocument();
    expect(screen.getByText('ORS (Oral Rehydration Salts)')).toBeInTheDocument();
    expect(screen.getByText('Analgesic')).toBeInTheDocument();
    expect(screen.getAllByText('Antibiotic').length).toBeGreaterThanOrEqual(1);
  });

  it('renders recent activity feed entries', async () => {
    await act(async () => {
      render(<App />);
    });

    expect(screen.getByText(/Blood request fulfilled — O\+/i)).toBeInTheDocument();
    expect(screen.getByText(/Medicine stock updated — Insulin/i)).toBeInTheDocument();
    expect(screen.getByText(/New blood donation recorded — A\+/i)).toBeInTheDocument();
    expect(screen.getByText(/Low stock alert — Amoxicillin/i)).toBeInTheDocument();
  });

  it('renders the login page with credentials form, tagline, and medical treatment', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/login']}>
            <LoginPage />
          </MemoryRouter>
        </AuthProvider>,
      );
    });

    expect(screen.getByText('Connecting Blood, Medicine and Care.')).toBeInTheDocument();
    expect(screen.getByText('Sign In to Platform')).toBeInTheDocument();
    expect(screen.getByLabelText(/Email \/ User ID/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByText('Forgot password?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Access Dashboard/i })).toBeInTheDocument();
  });

  it('renders sidebar navigation items on the dashboard', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/dashboard']}>
            <DashboardPage />
          </MemoryRouter>
        </AuthProvider>,
      );
    });

    expect(screen.getByRole('button', { name: /^Dashboard$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Blood Inventory/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Medicine Inventory/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Requests/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Facilities/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Activity \/ Logs/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Settings/i })).toBeInTheDocument();
  });
});
