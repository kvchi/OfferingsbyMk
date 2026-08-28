import React from 'react'
import { homeDecorData } from '../data/homeDecorData'
import ProductCard from './ProductCard';

export default function HomeDecor() {
  return (
    <div className='rounded-b-xl'>
    <div className='grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-12 justify-center items-center p-10 dark:bg-slate-800 '>
        {homeDecorData.map((el) => <ProductCard key={el.id} product={el} />)}
</div>
</div>
  )
}
