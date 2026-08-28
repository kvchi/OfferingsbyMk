import React, { useEffect, useRef, useState } from 'react'
import { MdPanoramaPhotosphere } from 'react-icons/md'
import { Link, useNavigate } from 'react-router-dom'
import { headerData } from '../data/headerData'
import { RiMenu4Line } from 'react-icons/ri';
import DarkMode from './DarkMode';
import { BsCart4 } from 'react-icons/bs';
import { useSelector, useDispatch } from 'react-redux';
import { selectCartTotalQuantity, toggleStatusTab } from '../store/cart';
import { logout } from '../store/auth';
import toast from 'react-hot-toast';

export default function Header() {
  const [showMenu, setShowMenu] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const menuButtonRef = useRef(null);
  const activeCategoryButtonRef = useRef(null);
  const leftLinks = headerData.slice(0,3);
  const rightLinks = headerData.slice(3);
  const totalQuantity = useSelector(selectCartTotalQuantity);
  const isCartOpen = useSelector(store => store.cart.statusTab);
  const isAuthenticated = useSelector(store => store.auth.isAuthenticated);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const toggleMenu = () => {
    setShowMenu((isOpen) => !isOpen);
  };

  const closeMenu = () => {
    setShowMenu(false); // Close the menu
  };

  // Toggle DropDown
  const toggleCategoryDropdown = (event) => {
    activeCategoryButtonRef.current = event.currentTarget;
    setShowDropdown((isOpen) => !isOpen);
  }

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key !== 'Escape') return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;

      if (showDropdown) {
        setShowDropdown(false);
        activeCategoryButtonRef.current?.focus();
      } else if (showMenu) {
        setShowMenu(false);
        menuButtonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showDropdown, showMenu]);

  const handleOpenCartTab = (event) => {
    event.currentTarget.focus();
    dispatch(toggleStatusTab());
  }

  const handleLogout = () => {
    dispatch(logout());
    closeMenu();
    navigate('/');
    toast.success('Logged out successfully');
  }

  const linkClass = 'text-primary hover:text-slate-800 hover:translate-y-2 font-semibold';

  const renderAuthLink = (link, className = linkClass) => {
    if (link.title !== 'Login') {
      return (
        <Link key={link.id} to={link.url} className={className}>
          {link.title}
        </Link>
      );
    }

    if (isAuthenticated) {
      return (
        <button
          key={link.id}
          type="button"
          onClick={handleLogout}
          className={className}
        >
          Logout
        </button>
      );
    }

    return (
      <Link key={link.id} to={link.url} className={className}>
        Login
      </Link>
    );
  }

  return (
    <>
    <header className='fixed top-0 left-0 right-0 z-[80] h-16 px-4 py-3 md:h-20 md:px-6 md:py-5 bg-[#FBF6E2] shadow-lg dark:bg-gray-900 dark:text-yellow-50 duration-200'>
      <div className='relative container mx-auto md:flex-row flex items-center justify-between'>
        <div className='hidden md:flex flex-col md:flex-row items-center space-x-4 '>
          {leftLinks.map((link) => (
            <div key={link.id} className={`relative text-primary hover:text-slate-800 hover:translate-y-2 font-semibold`}>
            {link.title === 'Category' ? (
              <div>
                <button
                  type='button'
                  onClick={toggleCategoryDropdown}
                  aria-expanded={showDropdown}
                  aria-controls='category-menu-desktop'
                  className='rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
                >
                    {link.title}
                  </button>
                {showDropdown && (
                  <div id='category-menu-desktop' className='absolute left-0 z-[70] mt-2 w-48 bg-white shadow-lg rounded-md dark:bg-gray-900'>
                  {link.subItems.map((subItem) => (
                    <Link
                    key={subItem.id}
                    to={subItem.url}
                    onClick={() => setShowDropdown(false)}
                    className='block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-primary dark:hover:bg-gray-600'>
                      {subItem.title}
                    </Link>
                  ))}
              </div>
            )}
            </div>
            ) : (
              <Link to={link.url}>{link.title}</Link>
            )}
          </div>
          ))}
        </div>
        
      <Link to={"/"} className="flex gap-2 items-center justify-center md:ml-auto">
          <MdPanoramaPhotosphere  className="text-primary text-3xl md:text-2xl" />
          <h1 className="text-primary font-bold text-xl md:text-2xl font-serif md:mr-0 hidden md:flex">
           OFFERINGSBYMK
          </h1>
        </Link>

        <div data-header-controls className='ml-auto flex shrink-0 items-center gap-2'>
        <DarkMode />
        <button type='button' aria-label={`Open shopping cart, ${totalQuantity} ${totalQuantity === 1 ? 'item' : 'items'}`} aria-expanded={isCartOpen} aria-controls='shopping-cart-drawer' className='p-2 bg-yellow-200 rounded-full flex justify-center items-center relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2' onClick={handleOpenCartTab}>
        <BsCart4 aria-hidden='true' className='text-primary text-2xl' />
        <span aria-hidden='true' className='absolute top-8 bg-red-500 text-white w-5 h-5 rounded-full flex justify-center items-center'>{totalQuantity}</span>
        </button>
        <div className='hidden items-center gap-2 md:flex'>
          {rightLinks.map((link) => renderAuthLink(link))}
        </div>
        <button
        ref={menuButtonRef}
        type='button'
        aria-label='Toggle navigation menu'
        aria-expanded={showMenu}
        aria-controls='mobile-navigation-menu'
        className='p-2 flex justify-center items-center border border-yell bg-yellow-200 text-primary text-xl rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:hidden'
        onClick={toggleMenu}>
        <RiMenu4Line aria-hidden='true' />
        </button>
        </div>
      </div>
      
          <nav id='mobile-navigation-menu' aria-hidden={!showMenu} className={`md:hidden flex flex-col absolute left-0 top-full z-[70] bg-secondary dark:bg-gray-800 w-full py-2 px-4 transition-all duration-300 ease-out ${showMenu ? 'visible menu-enter-active' : 'invisible pointer-events-none menu-enter'}`}>
          
            {headerData.map((link) => (
              <div key={link.id}   className='relative dark:hover:bg-gray-900 p-2 hover:bg-white rounded-md'>
              {link.title === 'Login' ? (
                isAuthenticated ? (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="text-primary font-normal text-xl"
                  >
                    Logout
                  </button>
                ) : (
                  <Link
                    to={link.url}
                    onClick={closeMenu}
                    className="text-primary font-normal text-xl"
                  >
                    Login
                  </Link>
                )
              ) : (
              link.title === 'Category' ? (
                <button
                  type='button'
                  onClick={toggleCategoryDropdown}
                  aria-expanded={showDropdown}
                  aria-controls='category-menu-mobile'
                  className='text-primary font-normal text-xl rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
                >
                  {link.title}
                </button>
              ) : (
                <Link
                  to={link.url}
                  onClick={closeMenu}
                  className='text-primary font-normal text-xl'
                >
                  {link.title}
                </Link>
              )
              )}
              {link.title === 'Category' && showDropdown && (
              <div id='category-menu-mobile' className='relative mt-2 w-full bg-white shadow-lg rounded-md z-[70] dark:bg-gray-700'>
                {link.subItems.map((subItem) => (
                  <Link
                    key={subItem.id}
                    to={subItem.url}
                    onClick={() => {
                      setShowDropdown(false);
                      closeMenu();
                    }}
                    className='block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-primary dark:hover:bg-gray-900'
                  >
                    {subItem.title}
                  </Link>
                ))}
              </div>
            )}
              </div>
            ))}
         </nav>
    </header>
    <div data-header-spacer aria-hidden='true' className='h-16 md:h-20' />
    </>
  )
}
