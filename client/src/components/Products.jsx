import React from 'react'
import { productData } from "../data/productData";
import { BsCart4 } from 'react-icons/bs';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { addToCart } from '../store/cart';
import { toast } from 'react-hot-toast';
import { formatNaira } from '../utils/money';


export default function Products() {
    const dispatch = useDispatch();

    const handleAddToCart = (id) => {
        dispatch(addToCart({
           productId:id,
           quantity: 1 
        }))  
        toast.success('Product added to cart successfully!')
    }

  return (
    <div className=" flex flex-col md:flex-row  justify-center items-center  gap-10 mt-8 ">
      {productData.map((el) => (
        <div
          data-aos="fade-up"
          data-aos-delay={el.aosDelay}
          key={el.id}
          className="hover:scale-105 duration-300"
        >
            <Link to={`/product/${el.id}`}>
          <img
            src={el.image}
            alt={el.alt}
            className="w-[180px] h-[220px] object-cover rounded-md"
          />
            <p className="text-2xl font-semibold text-slate-600 dark:text-primary ml-10 mt-2">
              {el.title}
            </p>
          </Link>
          <div className="flex justify-between items-center gap-6">
            <p> 
                <span className="text-lg font-medium text-slate-600 dark:text-primary mt-2 underline">{formatNaira(el.priceKobo)}</span>
            </p>
            <button className="bg-primary hover:bg-primary/50 text-slate-600 font-bold p-2 rounded-md flex justify-center items-center gap-2 " onClick={() => handleAddToCart(el.id)}><BsCart4 className='w-6 text-2xl text-gray' /></button>
          </div>
        </div>
      ))}
    </div>
  )
}
