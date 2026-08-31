import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OrderReceipt from './OrderReceipt';
import { orderState } from '../test/orderFixtures';

const ordersApi = vi.hoisted(() => ({ getPaidReceipt: vi.fn() }));
vi.mock('../api/orders', () => ordersApi);

const paid = orderState('paid');
const receipt = {
  id: paid.id,
  orderNumber: paid.orderNumber,
  status: 'PAID',
  paymentStatus: 'PAID',
  customer: { displayName: 'Ada O.' },
  destination: { cityOrLga: 'Ikeja', state: 'Lagos', country: 'Nigeria' },
  lines: paid.lines,
  subtotalKobo: paid.subtotalKobo,
  shippingKobo: paid.shippingKobo,
  totalKobo: paid.totalKobo,
  currency: paid.currency,
  createdAt: paid.createdAt,
  payment: { provider: 'PAYSTACK', status: 'PAID', paidAt: paid.payment.paidAt },
};

const renderPage = () => render(
  <MemoryRouter initialEntries={[`/orders/${paid.id}/receipt`]}>
    <Routes>
      <Route path='/orders/:orderId/receipt' element={<OrderReceipt />} />
      <Route path='/orders/:orderId' element={<div>Order destination</div>} />
    </Routes>
  </MemoryRouter>,
);

beforeEach(() => vi.resetAllMocks());

describe('paid receipt', () => {
  it('renders historical totals and minimal identity without sensitive payment data and prints', async () => {
    ordersApi.getPaidReceipt.mockResolvedValueOnce(receipt);
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    renderPage();
    expect(await screen.findByRole('heading', { name: /paid receipt/i })).toBeInTheDocument();
    expect(screen.getByText('Historical Rosemary Snapshot')).toBeInTheDocument();
    expect(screen.getByText('Ada O.')).toBeInTheDocument();
    expect(screen.getByText(/paystack.*test mode/i)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/SSPAY|checkout\.paystack\.com|provider transaction/i);
    expect(document.querySelector('.receipt-print-root')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /print receipt/i }).closest('.receipt-print-hidden')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /print receipt/i }));
    expect(print).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['RECEIPT_NOT_AVAILABLE', 'A paid receipt is not available for this order.', /paid receipt unavailable/i],
    ['ORDER_NOT_FOUND', 'We could not find that order in your account.', /order not found/i],
  ])('shows a safe protected error for %s', async (code, message, heading) => {
    ordersApi.getPaidReceipt.mockRejectedValueOnce(Object.assign(new Error(message), { code }));
    renderPage();
    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /return to order/i })).toHaveAttribute('href', `/orders/${paid.id}`);
  });
});
