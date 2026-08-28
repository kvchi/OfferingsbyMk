import React from 'react'
import { productData } from "../data/productData";
import ProductCard from './ProductCard';


export default function Products() {
  return (
    <div className=" flex flex-col md:flex-row  justify-center items-center  gap-10 mt-8 ">
      {productData.map((el) => (
        <ProductCard key={el.id} product={el} featured />
      ))}
    </div>
  )
}
