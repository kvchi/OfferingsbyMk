import React from 'react'
import { topProducts } from '../data/topProduct'
import { FaStar } from 'react-icons/fa'
import ResponsiveImage from './ResponsiveImage'
import { Link } from 'react-router-dom'

export default function TopProducts() {
  return (
    <div 
    className="grid md:grid-cols-2 lg:grid-cols-4  justify-center items-center gap-10 mt-8 mx-8">
      {
        topProducts.map((el) => (
          <div data-aos='zoom-in' key={el.id}
          className=" rounded-2xl bg-white dark:bg-gray-700 hover:bg-black/70 dark:hover:bg-secondary relative shadow-xl duration-high group max-w-[300px] py-4 px-10">
            <div className="h-[100px]"> 
              <ResponsiveImage image={el.image} alt={el.alt} sizes="140px"
               className="w-[140px] block mx-auto transform -translate-y-20 group-hover:scale-105 duration-300 drop-shadow-md"
               />
            </div>
            <div className="p-4 text-center">
              <div className="w-full flex items-center justify-center gap-1">
                <FaStar className="text-yellow-500" />
                <FaStar className="text-yellow-500" />
                <FaStar className="text-yellow-500" />
                <FaStar className="text-yellow-500" />
              </div>
              <h1 className="text-xl font-bold dark:text-primary text-gray-600">
                {el.title}</h1>
                <p className="text-gray-600 group-hover:text-primary duration-300 text-sm line-clamp-2 dark:text-primary">
                  {el.description}</p>
                  <Link to='/shop' className="inline-block font-bold text-lg text-slate-600 dark:text-primary bg-gradient-to-r from-primary to-secondary dark:bg-gradient-to-r dark:from-slate-900 dark:to-secondary p-3 rounded-full mt-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                      View in shop
                  </Link>
                  
            </div>
          </div>
        ))
      }
    </div>
  )
}
