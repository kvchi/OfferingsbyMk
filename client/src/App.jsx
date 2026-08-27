import React from 'react'
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import Home from './pages/Home';
import About from './pages/About';
import { Footer, Header } from './components';
import Error from './pages/Error';
import Shop from './pages/Shop';

import ProductDatail from './pages/ProductDatail';
import CartTab from './components/CartTab';
import Login from './pages/Login';
import AuthInitializer from './components/AuthInitializer';



export default function App() {

  function PageOutlet(){


    
      return (
    
    
        <> 
          <Header />
          <CartTab />
          <Outlet />
          <Footer />
        </>
      )
  } 

  const Routes = createBrowserRouter([
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
          element: <ProductDatail />, 
        },
  ],
  errorElement: (
    <>
     <Header />
     <Error />
     <Footer />
    </>
  ),
}
]);

  return (
      <AuthInitializer>
      <div>
        <Toaster />
        <RouterProvider router={Routes}></RouterProvider>
      </div>
      </AuthInitializer>
      );
}
