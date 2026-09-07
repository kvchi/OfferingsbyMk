import React from 'react'
import { candle, scentedCandles } from '../assets/images'
import { BsEyeglasses } from 'react-icons/bs'
import ResponsiveImage from '../components/ResponsiveImage'
import { Link } from 'react-router-dom'

export default function About() {
  return (
    <main>
       <section className="container mx-auto  dark:bg-slate-800 relative py-20"> 
              <ResponsiveImage image={candle} alt="" sizes="100vw" loading="eager" fetchPriority="high" className="absolute left-0 top-0 w-full h-full object-cover opacity-45 dark:opacity-10" />
              <div className="flex flex-col justify-center items-center">
                <h1 className="z-10 text-4xl text-center text-slate-600 font-bold dark:text-primary underline underline-offset-2">About Us</h1>
                <p className='md:text-xl text-lg text-slate-600 max-w-2xl z-10 mt-4 ml-2 font-semibold dark:text-primary'>Welcome to OfferingsbyMK, your destination for products that connect with your sense of calm and well-being. From carefully curated scented candles to soothing herbs such as rosemary and lavender, each item is selected with care and intention.</p>
              </div>
      </section>
      {/*Our Vision section */}
      <section className='container mx-auto py-20 dark:bg-slate-800 mt-[-30px]'>
          <div className='flex flex-col justify-center items-center'>
          <BsEyeglasses aria-hidden='true' className='text-[60px] text-slate-600 dark:text-primary'/>
              <h2 className='text-3xl text-slate-600 dark:text-primary underline underline-offset-4 mt-[-16px]'>Our Vision</h2>
          </div>
          <aside className='flex flex-col md:flex-row justify-center mt-10'>
              <ResponsiveImage image={scentedCandles} alt="" sizes="(max-width: 639px) 100vw, (max-width: 767px) 200px, 500px" className='w-full sm:w-[200px] md:w-[500px] object-cover'/>
              <div className='w-full sm:w-[450px] md:w-[700px] dark:bg-slate-700 bg-secondary relative'>
                <ResponsiveImage image={scentedCandles} alt="" sizes="(max-width: 639px) 100vw, 700px" className='opacity-30 absolute inset-0 w-full h-full object-cover'/>
                <p className='text-center md:mt-20 md:max-w-lg mx-auto md:border-[2px] border-white rounded-lg p-4 md:text-xl text-slate-600 dark:text-primary font-semibold relative'>Our vision is to enrich lives with quality products that foster tranquility and well-being. We aim to be the leading source of unique, soul-soothing items that enhance everyday moments and inspire inner peace.</p>
              </div>
          </aside>
      </section>
      <section className='container mx-auto px-4 py-20'>
        <div className='w-full rounded-lg bg-gray-800 px-6 py-10 text-center md:px-10'>
          <h2 className='text-2xl font-bold text-primary'>New to OfferingsbyMK?</h2>
          <p className='mt-2 text-xl font-medium text-primary'>Browse the full collection and explore every category.</p>
          <Link to='/shop' className='mt-6 inline-block rounded-md bg-primary px-6 py-3 font-semibold text-white hover:bg-yellow-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800'>Shop products</Link>
        </div>
      </section>
    </main>
  )
}
