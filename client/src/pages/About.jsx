import React from 'react'
import { candle, scentedCandles } from '../assets/images'
import { BsEyeglasses } from 'react-icons/bs'

export default function About() {
  return (
    <main>
       <section className="container mx-auto  dark:bg-slate-800 relative py-20"> 
              <img src={candle} alt="candles" className="absolute left-0 top-0 w-full h-full object-cover opacity-45 dark:opacity-10" />
              <div className="flex flex-col justify-center items-center">
                <h1 className="z-10 text-4xl text-center text-slate-600 font-bold dark:text-primary underline underline-offset-2">About us</h1>
                <p className='md:text-xl text-lg text-slate-600 max-w-2xl z-10 mt-4 ml-2 font-semibold dark:text-primary'>Welcome to OfferingsbyMK, your go-to destination for products that connect with your soul and spirit.From our carefully curated scented candles to soothing herbs like rosemary and lavender, we are dedicated to enhancing your well-being with items crafted with love and intention.  </p>
              </div>
      </section>
      {/*Our Vision section */}
      <section className='container mx-auto py-20 dark:bg-slate-800 mt-[-30px]'>
          <div className='flex flex-col justify-center items-center'>
          <BsEyeglasses className='text-[60px] text-slate-600 dark:text-primary'/>
              <h1 className='text-3xl text-slate-600 dark:text-primary underline underline-offset-4 mt-[-16px]'>Our Vision</h1>
          </div>
          <aside className='flex flex-col md:flex-row justify-center mt-10'>
              <img src={scentedCandles} alt="" className='w-full sm:w-[200px] md:w-[500px] object-cover'/>
              <div className='w-full sm:w-[450px] md:w-[700px] dark:bg-slate-700 bg-secondary relative'>
                <img src={scentedCandles} alt=""  className='opacity-30 absolute inset-0 w-full h-full'/>
                <p className='text-center md:mt-20 md:max-w-lg mx-auto md:border-[2px] border-white rounded-lg p-4 md:text-xl text-slate-600 dark:text-primary font-semibold relative'>Our vision is to enrich lives with quality products that foster tranquility and well-being. We aim to be the leading source of unique, soul-soothing items that enhance everyday moments and inspire inner peace.</p>
              </div>
          </aside>
      </section>
      <section className='py-20 container mx-auto flex'>
  <aside className='h-[200px] w-full bg-gray-800 flex flex-col md:flex-row items-center justify-between px-10'>
    <div className='flex flex-col justify-center'>
      <h1 className='text-2xl font-bold text-primary'>NEW TO OFFERINGSBYMK?</h1>
      <h1 className='text-xl font-medium text-primary'>Subscribe to our newsletter to get updates on our latest offers!</h1>
    </div>
    <div className='flex items-center mb-8'>
      <input
        type='email'
        disabled
        aria-label='Newsletter signup unavailable, coming soon'
        placeholder='Enter your email'
        className='w-[300px] md:w-[400px] p-4 rounded-md text-primary outline-none'
      />
      <button type='button' disabled className='ml-4 p-4 bg-primary text-white rounded-md disabled:cursor-not-allowed disabled:opacity-60'>
        Subscribe — Coming Soon
      </button>
    </div>
  </aside>
</section>
    </main>
  )
}
