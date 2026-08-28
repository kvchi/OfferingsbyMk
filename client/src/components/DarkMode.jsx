import React, {useState, useEffect} from 'react'
import { MdLightMode, MdOutlineLightMode } from 'react-icons/md'

export default function DarkMode() {
    const [theme, setTheme] = useState(() =>
        localStorage.getItem("theme") === "dark" ? "dark" : "light"
    )
    const element = document.documentElement;
    
    useEffect(() => {
        if (theme === "dark") {
            element.classList.add("dark");
            element.classList.remove("light");
            localStorage.setItem("theme", "dark");
        } else {
            element.classList.remove("dark");
            localStorage.setItem("theme", "light");  
        }
    }, [theme, element]);
            
  return (
    <div data-theme-control-region className='flex items-center'>
         {theme === "light" ? (
                <button
                    type='button'
                    aria-label='Switch to dark mode'
                    aria-pressed='false'
                    onClick={() => setTheme("dark")}
                    className='w-8 h-8 p-2 drop-shadow-sm transition-all duration-300 bg-yellow-200 rounded-md border border-primary text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'>
                    <MdOutlineLightMode aria-hidden='true' />
                </button>
            ) : (
                <button
                    type='button'
                    aria-label='Switch to light mode'
                    aria-pressed='true'
                    onClick={() => setTheme("light")}
                    className='w-8 h-8 p-2 bg-slate-600 rounded-md border border-slate-400 text-yell drop-shadow-sm transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'>
                    <MdLightMode aria-hidden='true' />
                </button>
            )}
    
    
    </div>
    
  )
}

