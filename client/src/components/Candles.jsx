import React from 'react'
import { candleData } from '../data/candleData'
import { useDispatch } from 'react-redux';
import { addToCart } from '../store/cart';
import { toast } from 'react-hot-toast';
import { BsCart4 } from 'react-icons/bs';
import { formatNaira } from '../utils/money';




export default function Candles() {
    const dispatch = useDispatch();

    const handleAddToCart = (id) => {
        dispatch(addToCart({
           productId:id,
           quantity: 1 
        }))  
        toast.success('Product added to cart successfully!')
    }

  return (
    <main className='rounded-b-xl'>
            <div className='grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-12 justify-center items-center p-10 dark:bg-slate-800 '>
        {
            candleData.map((el) => (
                <div key={el.id} className='hover:scale-105 duration-100 hover:shadow-lg dark:hover:shadow-2xl p-2 rounded-md cursor-pointer'>
                     <img
            src={el.image}
            alt={el.alt}
            className="w-[250px] h-[300px] object-cover rounded-md mx-auto"
          />
          <p className="text-xl text-center font-normal text-slate-600 dark:text-primary mt-2">
              {el.title}
            </p> 
            <div className="flex justify-between items-center gap-6">
            <p> 
                <span className="text-lg font-medium text-slate-600 dark:text-primary mt-2 underline">{formatNaira(el.priceKobo)}</span>
            </p>
            <button className="bg-primary hover:bg-primary/50 text-slate-600 font-bold p-2 rounded-md flex justify-center items-center gap-2 " onClick={() => handleAddToCart(el.id)}><BsCart4 className='w-6 text-2xl text-gray' /></button>
          </div>
                </div>
            ))
        }
        
        </div>
        
        </main>
  )
}
