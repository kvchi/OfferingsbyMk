import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MyOrders from './MyOrders';
import { baseOrder, orderState, summaryFrom } from '../test/orderFixtures';

const ordersApi = vi.hoisted(() => ({ listOrders: vi.fn() }));
vi.mock('../api/orders', () => ordersApi);

beforeEach(() => vi.resetAllMocks());

const renderPage = () => render(<MemoryRouter><MyOrders /></MemoryRouter>);

describe('My Orders', () => {
  it('announces loading and shows an accessible empty state', async () => {
    let resolve;
    ordersApi.listOrders.mockImplementation(() => new Promise((done) => { resolve = done; }));
    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent(/loading your orders/i);
    resolve([]);
    expect(await screen.findByRole('heading', { name: /no orders yet/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /browse shop/i })).toHaveAttribute('href', '/shop');
  });

  it('renders a newest-first mixed-state, mobile-safe card list with state-appropriate actions', async () => {
    const mixed = ['unpaid', 'initialized', 'failed', 'cancelled', 'paid', 'unknown'].map((kind, index) => {
      const order = orderState(kind);
      return summaryFrom(order, { id: `order-${kind}-123`, orderNumber: `SS-${kind}`, createdAt: `2026-08-${String(24 + index).padStart(2, '0')}T08:00:00.000Z` });
    }).reverse();
    ordersApi.listOrders.mockResolvedValueOnce(mixed);
    renderPage();
    expect(await screen.findByRole('list', { name: /newest first/i })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('SS-unknown');
    expect(screen.getAllByRole('link', { name: /continue to payment/i })).toHaveLength(2);
    expect(screen.getByRole('link', { name: /check payment status/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view receipt/i })).toHaveAttribute('href', '/orders/order-paid-123/receipt');
    expect(screen.getByLabelText(/status needs review/i)).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')[0]).toHaveClass('min-w-0');
  });

  it('supports retry after a request failure and suppresses retry for expired authentication', async () => {
    ordersApi.listOrders.mockRejectedValueOnce(Object.assign(new Error('Network unavailable'), { code: 'NETWORK_ERROR' })).mockResolvedValueOnce([summaryFrom(baseOrder)]);
    const first = renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    expect(await screen.findByText(baseOrder.orderNumber)).toBeInTheDocument();
    first.unmount();
    ordersApi.listOrders.mockRejectedValueOnce(Object.assign(new Error('Session expired'), { code: 'AUTHENTICATION_REQUIRED' }));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(/session expired/i);
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });
});
