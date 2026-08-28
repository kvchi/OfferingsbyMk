import React from 'react'
import { oilData } from '../data/oilData'
import ProductCard from './ProductCard';

export default function Oil() {
  return (
    <div className='rounded-b-xl'>
            <div className='grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-12 justify-center items-center p-10 dark:bg-slate-800 '>
            {oilData.map((el) => <ProductCard key={el.id} product={el} />)}
        </div>
    </div>
  )
}
