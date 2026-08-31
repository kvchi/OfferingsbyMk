import React from 'react'
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import Home from './pages/Home';
import About from './pages/About';
import { Footer, Header } from './components';
import Error from './pages/Error';
import Shop from './pages/Shop';

import ProductDetail from './pages/ProductDetail';
import CartTab from './components/CartTab';
import Login from './pages/Login';
import AuthInitializer from './components/AuthInitializer';
import ProtectedRoute from './components/ProtectedRoute';
import Checkout from './pages/Checkout';
import PaystackCallback from './pages/PaystackCallback';
import MyOrders from './pages/MyOrders';
import OrderDetail from './pages/OrderDetail';
import OrderReceipt from './pages/OrderReceipt';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

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
        element: <About />,
      },
      {
        path: '/login',
        element: <Login />,
      },
      {
        path: '/forgot-password',
        element: <ForgotPassword />,
      },
      {
        path: '/reset-password',
        element: <ResetPassword />,
      },
      {
        path: '/shop',
        element: <Shop />,
      },
      {
        path: '/product/:id',
        element: <ProductDetail />,
      },
      {
        path: '/checkout',
        element: <ProtectedRoute><Checkout /></ProtectedRoute>,
      },
      {
        path: '/orders',
        element: <ProtectedRoute><MyOrders /></ProtectedRoute>,
      },
      {
        path: '/orders/:orderId',
        element: <ProtectedRoute><OrderDetail /></ProtectedRoute>,
      },
      {
        path: '/orders/:orderId/receipt',
        element: <ProtectedRoute><OrderReceipt /></ProtectedRoute>,
      },
      {
        path: '/orders/:orderId/payment',
        element: <ProtectedRoute><OrderDetail /></ProtectedRoute>,
      },
      {
        path: '/payments/paystack/callback',
        element: <ProtectedRoute><PaystackCallback /></ProtectedRoute>,
      },
    ],
    errorElement: (
      <>
        <Header />
        <Error />
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
