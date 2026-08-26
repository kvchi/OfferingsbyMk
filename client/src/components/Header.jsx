import React, { useState, useEffect } from 'react'
import { MdPanoramaPhotosphere } from 'react-icons/md'
import { Link, useNavigate } from 'react-router-dom'
import { headerData } from '../data/headerData'
import { RiMenu4Line } from 'react-icons/ri';
import DarkMode from './DarkMode';
import { BsCart4 } from 'react-icons/bs';
import { useSelector, useDispatch } from 'react-redux';
import { toggleStatusTab } from '../store/cart';
import { logout } from '../store/auth';
import toast from 'react-hot-toast';

export default function Header() {
  const [showMenu, setShowMenu] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const leftLinks = headerData.slice(0,3);
  const rightLinks = headerData.slice(3);
  const [totalQuantity, setTotalQuantity] = useState(0);
  const carts = useSelector(store => store.cart.items);
  const isAuthenticated = useSelector(store => store.auth.isAuthenticated);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  //Use useeffect to process

  useEffect(() => {
    let total = 0;
    carts.forEach(item => total += item.quantity);
    setTotalQuantity(total)
  }, [carts])

  const toggleMenu = () => {
    setShowMenu(!showMenu); // Toggle menu visibility
  };

  const closeMenu = () => {
    setShowMenu(false); // Close the menu
  };

  // Toggle DropDown
  const toggleCategoryDropdown = (e) => {
    e?.preventDefault();
    setShowDropdown(!showDropdown);
  }

  const handleOpenCartTab = () => {
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
    <header className='relative p-4 md:p-6 bg-[#FBF6E2] shadow-lg dark:bg-gray-900 dark:text-yellow-50 duration-200 z-50'>
      <div className='relative container mx-auto md:flex-row flex items-center justify-between'>
        <div className='hidden md:flex flex-col md:flex-row items-center space-x-4 '>
          {leftLinks.map((link) => (
            <div key={link.id} className={`relative text-primary hover:text-slate-800 hover:translate-y-2 font-semibold`}>
            {link.title === 'Category' ? (
              <div>
                <span onClick={toggleCategoryDropdown} className='cursor-pointer'>
                    {link.title}
                  </span>
                {showDropdown && (
                  <div className='absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-md z-50 dark:bg-gray-900'>
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
        
      <Link to={"/"} className="flex gap-2 items-center justify-center md:ml-0">
          <MdPanoramaPhotosphere  className="text-primary text-3xl md:text-2xl" />
          <h1 className="text-primary font-bold text-xl md:text-2xl font-serif md:mr-0 hidden md:flex">
           OFFERINGSBYMK
          </h1>
        </Link>

        <div className=" hidden md:flex items-center space-x-2  md:mr-10 lg:mr-10 xl:mr-5">
        <div className='p-2 bg-yellow-200 rounded-full flex justify-center items-center relative cursor-pointer ' onClick={handleOpenCartTab}>
        <BsCart4 className=' text-primary text-2xl' />
        <span className='absolute top-8 bg-red-500 text-white w-5 h-5 rounded-full flex justify-center items-center'>{totalQuantity}</span>
        </div>
          {rightLinks.map((link) => renderAuthLink(link))}
        </div>
        {/* darkmode Switch */}
        <div className='p-2 ml-32 bg-yellow-200 rounded-full flex justify-center items-center relative cursor-pointer md:hidden' onClick={handleOpenCartTab}>
        <BsCart4 className=' text-primary text-2xl' />
        <span className='absolute top-8 bg-red-500 text-white w-5 h-5 rounded-full flex justify-center items-center'>{totalQuantity}</span>
        </div>
        <div
        className='p-2  cursor-pointer flex md:hidden justify-center items-center border border-yell bg-yellow-200 text-primary text-xl rounded-md'
        onClick={toggleMenu}>
        <RiMenu4Line />
        </div>
      </div>
      
          <div className={`md:hidden flex flex-col absolute top-full z-50 bg-secondary dark:bg-gray-800 w-screen py-2 px-4 transition-transform duration-700 ease-out ${showMenu ? 'menu-enter-active' : 'menu-enter'}`}>
          
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
              <Link
                 to={link.url}
                 onClick={() => {
                   if (link.title === 'Category') {
                     toggleCategoryDropdown();
                   } else {
                     closeMenu();
                   }
                 }}
                 className={`text-primary font-normal text-xl`}
              >
                {link.title}
              </Link>
              )}
              {link.title === 'Category' && showDropdown && (
              <div className='absolute left-0 mt-4 w-48 bg-white shadow-lg rounded-md z-50 dark:bg-gray-700 '>
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
         </div> 
         
          <DarkMode  />
    </header>
  )
}
