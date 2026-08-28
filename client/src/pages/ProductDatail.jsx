import React, { useState} from 'react'
import {Link, useParams} from 'react-router-dom'
import { productData } from '../data/productData';
import { BsCart4 } from 'react-icons/bs';
import { useDispatch } from 'react-redux';
import { addToCart } from '../store/cart';
import {toast} from 'react-hot-toast';
import { formatNaira } from '../utils/money';
import { MAX_CART_QUANTITY } from '../store/cart';


export default function ProductDatail() {
    const {id} =useParams();
    const product = productData.find(p => p.id === id);
    const [quantity, setQuantity] = useState(1); 
    const dispatch = useDispatch();

    if (!product) {
        return (
          <main className='container mx-auto min-h-[50vh] flex flex-col items-center justify-center gap-4 px-4 text-center dark:bg-slate-800'>
            <h1 className='text-3xl font-bold text-slate-700 dark:text-primary'>Product not found</h1>
            <p className='text-slate-600 dark:text-primary'>This product may no longer be available.</p>
            <div className='flex gap-4'>
              <Link to='/shop' className='rounded-md bg-primary px-4 py-2 text-slate-800'>Browse Shop</Link>
              <Link to='/' className='rounded-md border border-primary px-4 py-2 text-slate-700 dark:text-primary'>Go to Home</Link>
            </div>
          </main>
        );
    }

    const handleMinusQuantity = () => {
        setQuantity(quantity - 1 < 1 ? 1 : quantity -1);
    }
    const handlePlusQuantity = () => {
        setQuantity(Math.min(quantity + 1, MAX_CART_QUANTITY));
        }

        const handleAddToCart = (id) => {
            dispatch(addToCart({
               productId:id,
               quantity: quantity
            })) 
            toast.success('Product added to cart');
        }

  return (
    <aside className='container mx-auto flex md:flex-row-reverse flex-col-reverse items-center justify-center py-20 gap-8 bg-slate-100 dark:bg-slate-800'>
        <div className=''>
        <img src={product.image} alt={product.title} className="w-[300px] h-[400px] object-cover rounded-md"/>
        <h1 className='text-3xl font-bold text-slate-600 dark:text-primary text-center'>{product.title}</h1>
        <p className='text-lg font-medium text-slate-600 dark:text-primary text-center'>{formatNaira(product.priceKobo)}</p>
        <div className='flex gap-5 mt-2 items-center justify-between '>
            <div className='flex gap-2 justify-center items-center'>
                <button className='bg-gray-300 h-full w-10 font-bold text-xl rounded-xl flex justify-center items-center'onClick={handleMinusQuantity}>-</button>
                <span className='bg-gray-300 h-full w-10 font-bold text-xl rounded-xl flex justify-center items-center'>{quantity}</span>
                <button className='bg-gray-300 h-full w-10 font-bold text-xl rounded-xl flex justify-center items-center' onClick={handlePlusQuantity}>+</button>
            </div>
            <div>
            <button className="bg-primary hover:bg-primary/50 text-slate-600 font-bold p-2 rounded-md flex justify-center items-center gap-2 shadow-2xl" onClick={() => handleAddToCart(id)}><BsCart4 className='w-6 text-2xl text-slate-800' /></button>
            </div>
        </div>
        </div>
        <div className='max-w-md mt-10'>
            <h1 className='text-3xl font-bold text-slate-600 dark:text-primary underline text-center'>DESCRIPTION</h1>
            <p className='text-xl text-slate-700 dark:text-primary'>{product.description}</p>
        </div>
    </aside>
  )
}
