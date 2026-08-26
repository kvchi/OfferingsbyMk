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
    <div className='relative mr-14 md:mr-0 lg:mr-0 flex items-center -top-5 '>
         {theme === "light" ? (
                <MdOutlineLightMode
                    onClick={() => setTheme("dark")}
                    className='w-8 h-8 p-2 cursor-pointer drop-shadow-sm transition-all duration-300 absolute right-0 z-10 bg-yellow-200 rounded-md border border-primary text-primary'/>
            ) : (
                <MdLightMode
                    onClick={() => setTheme("light")}
                    className='w-8 h-8 p-2 bg-slate-600 rounded-md border border-slate-400 text-yell cursor-pointer drop-shadow-sm transition-all duration-300 absolute right-0 z-10'/>
            )}
    
    
    </div>
    
  )
}

