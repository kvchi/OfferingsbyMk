import React, { useEffect, useState } from 'react'
import {Link, useParams} from 'react-router-dom'
import { getProductById } from '../data/productCatalog';
import { BsCart4 } from 'react-icons/bs';
import { useDispatch } from 'react-redux';
import { addToCart, MAX_CART_QUANTITY } from '../store/cart';
import {toast} from 'react-hot-toast';
import { formatNaira } from '../utils/money';

export const PRODUCT_DESCRIPTION_FALLBACK = 'Additional product details are coming soon.';

export default function ProductDetail() {
    const {id} =useParams();
    const product = getProductById(id);
    const [quantity, setQuantity] = useState(1); 
    const dispatch = useDispatch();

    useEffect(() => {
        setQuantity(1);
    }, [id]);

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
        setQuantity((currentQuantity) => Math.max(1, currentQuantity - 1));
    }
    const handlePlusQuantity = () => {
        setQuantity((currentQuantity) => Math.min(currentQuantity + 1, MAX_CART_QUANTITY));
        }

        const handleAddToCart = () => {
            dispatch(addToCart({
               productId: product.id,
               quantity: quantity
            })) 
            toast.success(`${product.title} added to cart`);
        }

  return (
    <main className='container mx-auto flex md:flex-row-reverse flex-col-reverse items-center justify-center py-20 px-4 gap-8 bg-slate-100 dark:bg-slate-800'>
        <div>
        <img src={product.image} alt={product.imageAlt} className="w-[300px] h-[400px] object-cover rounded-md"/>
        <h1 className='text-3xl font-bold text-slate-600 dark:text-primary text-center'>{product.title}</h1>
        <p className='text-base font-medium text-slate-600 dark:text-primary text-center'>{product.category}</p>
        <p className='text-lg font-medium text-slate-600 dark:text-primary text-center'>{formatNaira(product.priceKobo)}</p>
        <div className='flex gap-5 mt-2 items-center justify-between '>
            <div className='flex gap-2 justify-center items-center' aria-label={`Quantity for ${product.title}`}>
                <button type='button' disabled={quantity === 1} aria-label={`Decrease ${product.title} quantity`} className='bg-gray-300 h-full w-10 font-bold text-xl rounded-xl flex justify-center items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50' onClick={handleMinusQuantity}>-</button>
                <output aria-live='polite' aria-label={`${product.title} quantity`} className='bg-gray-300 h-full w-10 font-bold text-xl rounded-xl flex justify-center items-center'>{quantity}</output>
                <button type='button' disabled={quantity === MAX_CART_QUANTITY} aria-label={quantity === MAX_CART_QUANTITY ? `${product.title} is at the maximum quantity of ${MAX_CART_QUANTITY}` : `Increase ${product.title} quantity`} title={quantity === MAX_CART_QUANTITY ? `Maximum quantity is ${MAX_CART_QUANTITY}` : undefined} className='bg-gray-300 h-full w-10 font-bold text-xl rounded-xl flex justify-center items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50' onClick={handlePlusQuantity}>+</button>
            </div>
            <div>
            <button type='button' aria-label={`Add ${product.title} to cart`} className="bg-primary hover:bg-primary/50 text-slate-600 font-bold p-2 rounded-md flex justify-center items-center gap-2 shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-600" onClick={handleAddToCart}><BsCart4 aria-hidden='true' className='w-6 text-2xl text-slate-800' /> Add to Cart</button>
            </div>
        </div>
        </div>
        <div className='max-w-md mt-10'>
            <h2 className='text-3xl font-bold text-slate-600 dark:text-primary underline text-center'>Description</h2>
            <p className='text-xl text-slate-700 dark:text-primary'>{product.description?.trim() || PRODUCT_DESCRIPTION_FALLBACK}</p>
            <Link to={`/shop#${product.shopSection}`} className='mt-6 inline-block rounded-md border border-primary px-4 py-2 text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-primary'>Return to {product.category}</Link>
        </div>
    </main>
  )
}
