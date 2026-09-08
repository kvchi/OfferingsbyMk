import React from "react";
import { headerBackground } from "../data/headerBackground";
import { Autoplay } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";

import Aos from "aos";
import "aos/dist/aos.css";
import { BsArrowUpRightCircle } from "react-icons/bs";

import { incense, scentedCandles } from "../assets/images";
import { GrSecure } from "react-icons/gr";
import { IoFastFood } from "react-icons/io5";
import { MdOutlinePayments } from "react-icons/md";
import { GiFoodTruck } from "react-icons/gi";
import { testimonials } from "../data/testimonials";
import Products from "../components/Products";

import TopProducts from "../components/TopProducts";
import { Link } from 'react-router-dom';
import ResponsiveImage from '../components/ResponsiveImage';
import { useAccessibleCarouselAutoplay } from '../components/AccessibleCarousel';


export default function Home() {
  const heroCarousel = useAccessibleCarouselAutoplay(4000);
  const testimonialCarousel = useAccessibleCarouselAutoplay(3000);
  const swiperParams = {
    modules: [Autoplay],
    loop: true,
    slidesPerView: 1,
  };

  React.useEffect(() => {
    Aos.init({
      offset: 100,
      duration: 600,
      easing: "ease-in-sine",
      delay: 100,
      disable: () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    });
    Aos.refresh();
  }, []);

  return (
    <main>
      <section aria-labelledby="home-hero-heading" className="container relative mx-auto max-w-screen overflow-hidden bg-gray-100 dark:bg-gray-800">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-40 h-[420px] w-[420px] rotate-45 rounded-3xl bg-primary/70 sm:-right-20 sm:-top-48 sm:h-[520px] sm:w-[520px] dark:bg-primary/40"></div>
        <aside
          className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 px-4 pb-10 pt-6 sm:px-6 sm:pt-8 md:gap-10 md:px-8 lg:grid-cols-2 lg:gap-12 lg:py-10"
        >
          <div className="mx-auto w-full max-w-xl text-center lg:mx-0 lg:text-left">
            <h1 id="home-hero-heading" className="mb-4 text-4xl font-bold text-slate-600 underline dark:text-primary">
              Browse Our Collection
            </h1>
            <p className="mx-auto max-w-lg text-xl text-slate-600 dark:text-primary lg:mx-0">
              Explore our wide range of products designed to enhance your
              well-being. From aromatic candles to calming herbs, find the
              perfect items to suit your needs.
            </p>
            <div className="mt-6 flex items-center justify-center gap-2 lg:justify-start">
              <Link to='/shop' className="min-h-11 rounded-full bg-gradient-to-r from-primary to-secondary p-3 text-2xl font-bold text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:bg-gradient-to-r dark:from-slate-900 dark:to-secondary dark:text-primary">
                Shop products
              </Link>
              <BsArrowUpRightCircle aria-hidden='true' className="text-5xl text-slate-600 dark:text-primary" />
            </div>
          </div>
          <div className="mx-auto w-full max-w-[34rem] overflow-hidden rounded-2xl">
          <Swiper key={23}
            {...swiperParams}
            autoplay={heroCarousel.autoplay}
            onSwiper={heroCarousel.onSwiper}
            aria-label="OfferingsbyMK featured products"
            className="h-[320px] w-full rounded-2xl sm:h-[400px] md:h-[430px] lg:h-[440px] xl:h-[460px]"
          >
            {headerBackground.map((item, index) => (
              <SwiperSlide key={item.id} className="relative">
                <div className="absolute inset-0 overflow-hidden [&>picture]:block [&>picture]:h-full [&>picture]:w-full">
                  <ResponsiveImage
                    image={item.image}
                    alt={item.alt}
                    sizes="(max-width: 639px) calc(100vw - 2rem), (max-width: 1023px) min(544px, calc(100vw - 4rem)), (max-width: 1279px) calc(50vw - 3.5rem), 544px"
                    loading={index === 0 ? 'eager' : 'lazy'}
                    fetchPriority={index === 0 ? 'high' : 'low'}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 opacity-50"></div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
          </div>
        </aside>
      </section>
      {/* Product section*/}
      <section className="container mx-auto py-20 px-4 dark:bg-slate-700">
        <div className="text-center mb-4">
          <h3 className="text-4xl font-bold text-slate-600 dark:text-primary flex md:flex-row flex-col justify-center items-center underline underline-offset-8">
            Top Rated Products
          </h3>
          <p className="text-2xl mt-2 font-medium text-slate-600 dark:text-primary">
          Experience the highest-rated products, praised for their excellence and value.
          </p>
        </div>
       <Products />
        {/*View ALL button*/}
        <div className="flex justify-center">
        <Link to='/shop' className="font-semibold text-2xl text-slate-600 dark:text-primary bg-gradient-to-r from-primary to-secondary dark:bg-gradient-to-r dark:from-slate-900 dark:to-secondary p-3 rounded-full mt-10 ">
                View All Products
              </Link>
        </div>
      </section>
      <section className="container mx-auto py-10 dark:bg-slate-600 ">
      <div data-aos='fade-up' className='mx-8 mb-28'>
            <h3 className='text-4xl text-slate-600 dark:text-primary font-bold underline underline-offset-8'>Top Selling Products</h3>
            <p className='text-2xl mt-2 font-medium text-slate-600 dark:text-primary'> Discover our most popular items loved by customers for their quality
            and charm.</p>
        </div>
       <TopProducts />
      </section>
        {/*Banner Section*/}
      <section className="container mx-auto py-10 dark:bg-slate-600">
        <aside className="min-h-[550px] flex md:flex-row flex-col justify-center items-center gap-20">
          <div className=" gap-6 items-center px-4">
            <div data-aos="zoom-in">
            <ResponsiveImage
            image={incense}
            alt="" 
            sizes="(max-width: 639px) calc(100vw - 2rem), 400px"
            className="max-w-[400px] h-[350px] w-full mx-auto drop-shadow-[-10px_10px_12px_rgba(0,0,0,1)] object-cover"/>
            </div>
          </div>
          <div className="flex flex-col justify-center gap-6 px-4 md:px-0">
            <h2 className="text-2xl md:text-3xl font-bold dark:text-primary text-slate-600">A calmer shopping experience</h2>
            <p className="text-sm text-gray-600 tracking-wide leading-5 max-w-md dark:text-primary">
              Browse a thoughtful collection, review server-verified totals, and follow every test order from checkout to receipt.
            </p>
            <div className="flex flex-col gap-4 ">
              <div
              data-aos='fade-up'
              className="flex items-center gap-4"
              >
                <GrSecure className="text-4xl h-12 w-12 shadow-sm p-4 rounded-full bg-violet-100 dark:bg-violet-500"/>
                <p className="text-slate-600 dark:text-primary">Quality Products</p>
              </div>
              <div
              data-aos='fade-up'
              className="flex items-center gap-4 "
              >
                <IoFastFood className="text-4xl h-12 w-12 shadow-sm p-4 rounded-full bg-orange-100 dark:bg-orange-500"/>
                <p className="text-slate-600 dark:text-primary">Server-verified totals</p>
              </div>
              <div
              data-aos='fade-up'
              className="flex items-center gap-4 "
              >
                <MdOutlinePayments className="text-4xl h-12 w-12 shadow-sm p-4 rounded-full bg-green-100 dark:bg-green-500"/>
                <p className="text-slate-600 dark:text-primary">Secure Paystack test checkout</p>
              </div>
              <div
              data-aos='fade-up'
              className="flex items-center gap-4 "
              >
                <GiFoodTruck className="text-4xl h-12 w-12 shadow-sm p-4 rounded-full bg-red-100 dark:bg-red-500"/>
                <p className="text-slate-600 dark:text-primary">Clear order history</p>
              </div>
            </div>
          </div>
        </aside>
      </section>
      {/* Collection call to action */}
      <section className="container px-5 lg:mx-auto py-0 dark:bg-slate-400 relative">
              <div data-aos='zoom-in'>
              <ResponsiveImage image={scentedCandles} alt="" sizes="100vw" className="absolute left-0 top-0 w-full h-full object-cover" />
              <div className="container backdrop-blur-sm py-10">
                <div className="space-y-6 max-w-xl mx-auto px-4 md:px-0">
                <h2 className="text-2xl text-center text-slate-900 font-semibold dark:text-primary">Find something for your space</h2>
                <p className='text-center text-slate-900 dark:text-primary'>Explore the complete OfferingsbyMK collection by category.</p>
                <div className='flex justify-center'>
                  <Link to='/shop' className='rounded-md bg-primary px-6 py-3 font-semibold text-white hover:bg-yellow-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-800 focus-visible:ring-offset-2'>Browse the collection</Link>
                </div>
                </div>
              </div>
              </div>
      </section>
      {/*Testimonial section*/}
      <section className="container mx-auto py-20 dark:bg-slate-500">
          <div>
          <div className="text-center mb-4">
          <h3 className="text-4xl font-bold text-slate-600 dark:text-primary flex md:flex-row flex-col justify-center items-center underline underline-offset-8">
            Testimonials
          </h3>
          <p className="text-2xl mt-2 font-medium text-slate-600 dark:text-primary">
          Discover what customers say about OfferingsbyMK and the products they enjoy.
          </p>
        </div>
            {/*Testimonial Cards*/}
            <div>
            <Swiper
            {...swiperParams}
            autoplay={{ ...testimonialCarousel.autoplay, pauseOnMouseEnter: true }}
            onSwiper={testimonialCarousel.onSwiper}
            data-aos="zoom-out"
            data-aos-once="true"
            data-aos-duration="600"
            speed={600}
            direction="horizontal"
            loop={true}
            spaceBetween={20}
            slidesPerView={2}
            breakpoints={{
              300: { slidesPerView: 1, spaceBetween: 10 },
              400: { slidesPerView: 2, spaceBetween: 10 },
              800: { slidesPerView: 2, spaceBetween: 20 },
              1000: { slidesPerView: 3, spaceBetween: 20 },
            }}
          >
            {testimonials.map((item) => (
              <SwiperSlide 
              key={item.id}
              className="relative">
                <div
                className="flex flex-col gap-4 shadow-lg py-8 px-6 mx-4 rounded-xl dark:bg-slate-700 bg-primary/10"
                >
                  <div className="mb-4">
                  <img src={item.img}
                  alt=''
                  width="80"
                  height="80"
                  loading="lazy"
                  decoding="async"
                  className="rounded-full w-20 h-20"/> 
                  </div>
                  <div className="flex flex-col items-center gap-4">
                    <p
                    className="text-xs text-gray-500 dark:text-primary"
                    >{item.text}</p>
                    <h3 className="text-xl font-bold text-slate-600 dark:text-primary">{item.name}</h3>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
            </div>
          </div>
      </section>
    </main>
  );
}
