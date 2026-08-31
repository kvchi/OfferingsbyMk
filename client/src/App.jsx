import React, { Suspense, lazy } from 'react'
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import Home from './pages/Home';
import { Footer, Header } from './components';
import CartTab from './components/CartTab';
import AuthInitializer from './components/AuthInitializer';
import ProtectedRoute from './components/ProtectedRoute';

const About = lazy(() => import('./pages/About'));
const ErrorPage = lazy(() => import('./pages/Error'));
const Shop = lazy(() => import('./pages/Shop'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Login = lazy(() => import('./pages/Login'));
const Checkout = lazy(() => import('./pages/Checkout'));
const PaystackCallback = lazy(() => import('./pages/PaystackCallback'));
const MyOrders = lazy(() => import('./pages/MyOrders'));
const OrderDetail = lazy(() => import('./pages/OrderDetail'));
const OrderReceipt = lazy(() => import('./pages/OrderReceipt'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

export function PageLoading() {
  return (
    <main role="status" aria-live="polite" className="container mx-auto min-h-[50vh] flex items-center justify-center text-primary">
      Loading page...
    </main>
  );
}

const loadPage = (page) => <Suspense fallback={<PageLoading />}>{page}</Suspense>;

function PageOutlet() {
  return (
    <>
      <Header />
      <CartTab />
      <Outlet />
      <Footer />
    </>
  );
}

export const appRoutes = [
  {
    path: '/',
    element: <PageOutlet />,
    children: [
      {
        path: '/',
        element: <Home />,
      },
      {
        path: '/about',
        element: loadPage(<About />),
      },
      {
        path: '/login',
        element: loadPage(<Login />),
      },
      {
        path: '/forgot-password',
        element: loadPage(<ForgotPassword />),
      },
      {
        path: '/reset-password',
        element: loadPage(<ResetPassword />),
      },
      {
        path: '/shop',
        element: loadPage(<Shop />),
      },
      {
        path: '/product/:id',
        element: loadPage(<ProductDetail />),
      },
      {
        path: '/checkout',
        element: <ProtectedRoute>{loadPage(<Checkout />)}</ProtectedRoute>,
      },
      {
        path: '/orders',
        element: <ProtectedRoute>{loadPage(<MyOrders />)}</ProtectedRoute>,
      },
      {
        path: '/orders/:orderId',
        element: <ProtectedRoute>{loadPage(<OrderDetail />)}</ProtectedRoute>,
      },
      {
        path: '/orders/:orderId/receipt',
        element: <ProtectedRoute>{loadPage(<OrderReceipt />)}</ProtectedRoute>,
      },
      {
        path: '/orders/:orderId/payment',
        element: <ProtectedRoute>{loadPage(<OrderDetail />)}</ProtectedRoute>,
      },
      {
        path: '/payments/paystack/callback',
        element: <ProtectedRoute>{loadPage(<PaystackCallback />)}</ProtectedRoute>,
      },
    ],
    errorElement: (
      <>
        <Header />
        {loadPage(<ErrorPage />)}
        <Footer />
      </>
    ),
  },
];

export const appRouter = createBrowserRouter(appRoutes);

export default function App({ router = appRouter }) {
  return (
    <AuthInitializer>
      <div>
        <Toaster />
        <RouterProvider router={router} />
      </div>
    </AuthInitializer>
  );
}
