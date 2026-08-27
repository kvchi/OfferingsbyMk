import React from 'react'
import { useDispatch } from 'react-redux';
import { changeQuantity } from '../store/cart';
import { formatNaira } from '../utils/money';

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
        <img src={product.image} alt={product.title} className='w-12'/>
        <h3>{product.title}</h3>
        <p>{formatNaira(lineTotalKobo)}</p>
        <div className='w-20 flex justify-between'>
            <button type='button' aria-label={`Decrease ${product.title} quantity`} className='bg-gray-300 rounded-full w-6 h-6 text-primary' onClick={handleMinusQuantity}>-</button>
            <span>{quantity}</span>
            <button type='button' aria-label={`Increase ${product.title} quantity`} className='bg-gray-300 rounded-full w-6 h-6 text-primary' onClick={handlePlusQuantity}>+</button>
        </div>
    </div>
  )
}
