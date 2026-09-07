import React, { useEffect } from 'react'
import { useLocation } from 'react-router-dom';
import { shopData } from "../data/shopData";
import { Autoplay } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import ShopItems from '../components/ShopItems';
import Candles from '../components/Candles';
import Oil from '../components/Oil';
import Herbs from '../components/Herbs';
import HomeDecor from '../components/HomeDecor';
import Wellness from '../components/Wellness';
import ResponsiveImage from '../components/ResponsiveImage';
import { CarouselAutoplayControl, useAccessibleCarouselAutoplay } from '../components/AccessibleCarousel';



export default function Shop() {
  const { hash } = useLocation();
  const heroCarousel = useAccessibleCarouselAutoplay(4000);

  useEffect(() => {
    if (!hash) return;

    requestAnimationFrame(() => {
      const behavior = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior });
    });
  }, [hash]);

  const swiperParams = {
    modules: [Autoplay],
    loop: true,
    slidesPerView: 1,
  };

  return (
    <main className='container mx-auto dark:bg-slate-800 shadow-lg '>
     <section className='bg-secondary p-10 shadow-xl rounded-b-2xl mb-8'>
     <div className='flex flex-col justify-center items-center'>
      <h1 className='text-3xl text-primary font-bold mb-4 max-w-md text-center'>Your Shopping Destination for Serene Elegance.</h1>
      </div>
      <Swiper key={23}
            {...swiperParams}
            autoplay={heroCarousel.autoplay}
            onSwiper={heroCarousel.onSwiper}
            aria-label="OfferingsbyMK shop highlights"
            className="h-96 w-full mt-20 rounded-2xl"
          >
            {shopData.map((item, index) => (
              <SwiperSlide key={item.id} className="relative">
                <div className="absolute inset-0 flex items-center justify-center ">
                  <ResponsiveImage
                    image={item.image}
                    alt={item.alt}
                    sizes="(max-width: 767px) calc(100vw - 5rem), 1200px"
                    loading={index === 0 ? 'eager' : 'lazy'}
                    fetchPriority={index === 0 ? 'high' : 'low'}
                  />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
          <CarouselAutoplayControl label="shop highlights carousel" paused={heroCarousel.paused} onToggle={heroCarousel.togglePaused} />
     </section>
    
        <section className='rounded-b-2xl mb-8 '>
          <div className='container mx-auto bg-primary dark:bg-secondary p-4 flex justify-center items-center '>
            <h2 className='text-3xl font-bold text-slate-600 dark:text-primary '>Shop by Category</h2>
          </div>
             <ShopItems /> 
        </section>
        <section id='candles' className='py-8 scroll-mt-20 md:scroll-mt-24'>
        <div className='container mx-auto bg-primary dark:bg-secondary p-4 flex shadow-2xl'>
            <h2 className='text-3xl font-bold text-slate-600 dark:text-primary '>Candles</h2>
          </div>
          <Candles />
        </section>
        <section id='essential-oils' className='py-8 scroll-mt-20 md:scroll-mt-24'>
        <div className='container mx-auto bg-primary dark:bg-secondary p-4 flex shadow-2xl'>
            <h2 className='text-3xl font-bold text-slate-600 dark:text-primary '>Essential Oils</h2>
          </div>
          <Oil />
        </section>
        <section id='herbs-botanicals' className='py-8 scroll-mt-20 md:scroll-mt-24'>
        <div className='container mx-auto bg-primary dark:bg-secondary p-4 flex shadow-2xl'>
            <h2 className='text-3xl font-bold text-slate-600 dark:text-primary '>Herbs & Botanicals</h2>
          </div>
          <Herbs />
        </section>
        <section id='home-decor' className='py-8 scroll-mt-20 md:scroll-mt-24'>
        <div className='container mx-auto bg-primary dark:bg-secondary p-4 flex shadow-2xl'>
            <h2 className='text-3xl font-bold text-slate-600 dark:text-primary '>Home Decorations</h2>
          </div>
          <HomeDecor />
        </section>
        <section id='wellness-relaxation' className='py-8 scroll-mt-20 md:scroll-mt-24'>
        <div className='container mx-auto bg-primary dark:bg-secondary p-4 flex shadow-2xl'>
            <h2 className='text-3xl font-bold text-slate-600 dark:text-primary '>Wellness & Relaxation</h2>
          </div>
          <Wellness />
        </section>
    </main>
  )
}
