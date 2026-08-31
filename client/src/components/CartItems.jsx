import React from 'react'
import { useDispatch } from 'react-redux';
import { changeQuantity, MAX_CART_QUANTITY } from '../store/cart';
import { formatNaira } from '../utils/money';
import ResponsiveImage from './ResponsiveImage';

export default function CartItems(props) {
    const {productId, quantity, product, lineTotalKobo} = props.data;
    const dispatch = useDispatch();

        const handleMinusQuantity = () => {
          dispatch(changeQuantity({
            productId: productId,
            quantity: quantity - 1
          }));
        }
        const handlePlusQuantity = () => {
          dispatch(changeQuantity({
            productId: productId,
            quantity: quantity + 1
          }));
        }

  return (
    <div className='flex justify-between items-center bg-slate-600 text-white p-2 border-b-2 border-slate-700 gap-5 rounded-md'>
        <ResponsiveImage image={product.image} alt={product.title} sizes='48px' className='h-12 w-12 object-cover'/>
        <h3>{product.title}</h3>
        <p>{formatNaira(lineTotalKobo)}</p>
        <div className='w-20 flex justify-between'>
            <button type='button' aria-label={`Decrease ${product.title} quantity`} className='bg-gray-300 rounded-full w-6 h-6 text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-600' onClick={handleMinusQuantity}>-</button>
            <span>{quantity}</span>
            <button type='button' disabled={quantity >= MAX_CART_QUANTITY} aria-label={quantity >= MAX_CART_QUANTITY ? `${product.title} is at the maximum quantity of ${MAX_CART_QUANTITY}` : `Increase ${product.title} quantity`} title={quantity >= MAX_CART_QUANTITY ? `Maximum quantity is ${MAX_CART_QUANTITY}` : undefined} className='bg-gray-300 rounded-full w-6 h-6 text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-600 disabled:cursor-not-allowed disabled:opacity-50' onClick={handlePlusQuantity}>+</button>
        </div>
    </div>
  )
}
