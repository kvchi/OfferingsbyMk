import React from 'react';
import { Link } from 'react-router-dom';
import { BsCart4 } from 'react-icons/bs';
import { useDispatch } from 'react-redux';
import { toast } from 'react-hot-toast';
import { getProductById } from '../data/productCatalog';
import { addToCart } from '../store/cart';
import { formatNaira } from '../utils/money';
import ResponsiveImage from './ResponsiveImage';

export default function ProductCard({ product: sourceProduct, featured = false }) {
  const dispatch = useDispatch();
  const product = getProductById(sourceProduct.id) ?? sourceProduct;

  const handleAddToCart = () => {
    dispatch(addToCart({ productId: product.id, quantity: 1 }));
    toast.success(`${product.title} added to cart successfully!`);
  };

  return (
    <article
      data-aos={featured ? 'fade-up' : undefined}
      data-aos-delay={featured ? product.aosDelay : undefined}
      aria-labelledby={`product-card-${product.id}`}
      className={featured
        ? 'hover:scale-105 duration-300'
        : 'hover:scale-105 duration-100 hover:shadow-lg dark:hover:shadow-2xl p-2 rounded-md'}
    >
      <ResponsiveImage
        image={product.image}
        alt={product.imageAlt ?? product.title}
        sizes={featured ? '180px' : '250px'}
        className={featured
          ? 'w-[180px] h-[220px] object-cover rounded-md'
          : 'w-[250px] h-[300px] object-cover rounded-md mx-auto'}
      />
      <h3
        id={`product-card-${product.id}`}
        className={featured
          ? 'text-2xl font-semibold text-slate-600 dark:text-primary ml-10 mt-2'
          : 'text-xl text-center font-normal text-slate-600 dark:text-primary mt-2'}
      >
        {product.title}
      </h3>
      <p className='text-lg font-medium text-slate-600 dark:text-primary mt-2 underline'>
        {formatNaira(product.priceKobo)}
      </p>
      <div className='mt-2 flex flex-wrap items-center justify-between gap-3'>
        <Link
          to={`/product/${product.id}`}
          aria-label={`View ${product.title} details`}
          className='rounded-md underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
        >
          View details
        </Link>
        <button
          type='button'
          aria-label={`Add ${product.title} to cart`}
          className='bg-primary hover:bg-primary/50 text-slate-600 font-bold p-2 rounded-md flex justify-center items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-600'
          onClick={handleAddToCart}
        >
          <BsCart4 aria-hidden='true' className='w-6 text-2xl text-gray' />
        </button>
      </div>
    </article>
  );
}
