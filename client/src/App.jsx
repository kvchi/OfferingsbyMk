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
        path: '/shop',
        element: <Shop />,
      },
      {
        path: '/product/:id',
        element: <ProductDetail />,
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
