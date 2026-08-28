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


export default function Home() {
  const swiperParams = {
    modules: [Autoplay],
    autoplay: { delay: 4000 },
    loop: true,
    slidesPerView: 1,
  };

  React.useEffect(() => {
    Aos.init({
      offset: 100,
      duration: 600,
      easing: "ease-in-sine",
      delay: 100,
    });
    Aos.refresh();
  }, []);

  return (
    <main>
      <section className="container mx-auto relative overflow-hidden bg-gray-100 dark:bg-gray-800 max-w-screen">
        <div className="absolute h-[600px] w-[600px] bg-primary rotate-45 rounded-3xl -top-full right-0 -z-9"></div>
        <aside className=" flex md:flex-row-reverse flex-col mb-4 mt-2 md:mt-0 items-center justify-center p-8">
          <Swiper key={23}
            {...swiperParams}
            data-aos="zoom-out"
            data-aos-once="true"
            data-aos-duration="600"
            className="h-[400px] w-[400px] object-cover mt-20 rounded-2xl"
          >
            {headerBackground.map((item) => (
              <SwiperSlide key={item.id} className="relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <img src={item.image} alt={item.alt} />
                  <div className="absolute inset-0 opacity-50"></div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
          <div
            data-aos="zoom-in"
            data-aos-once="true"
            data-aos-duration="700"
            className="mx-auto text-center"
          >
            <h3 className="text-4xl font-bold mb-4 mt-8 md:mt-0 text-slate-600 dark:text-primary underline">
              Browse Our Collection
            </h3>
            <p className="text-xl text-slate-600 dark:text-primary max-w-md">
              Explore our wide range of products designed to enhance your
              well-being. From aromatic candles to calming herbs, find the
              perfect items to suit your needs.
            </p>
            <div
            data-aos='fade-up'
            data-aos-once='true'
            data-aos-duration='800'
            className="flex justify-center items-center gap-1 ">
              <button type='button' disabled title='Ordering coming soon' className="font-bold text-2xl text-slate-600 dark:text-primary bg-gradient-to-r from-primary to-secondary dark:bg-gradient-to-r dark:from-slate-900 dark:to-secondary p-2 rounded-full mt-6 disabled:cursor-not-allowed disabled:opacity-60">
                Place Order — Coming Soon
              </button>
              <BsArrowUpRightCircle className="text-5xl mt-6 text-slate-600 dark:text-primary" />
            </div>
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
            <img 
            src={incense} 
            alt="" 
            className="max-w-[400px] h-[350px] w-full mx-auto drop-shadow-[-10px_10px_12px_rgba(0,0,0,1)] object-cover"/>
            </div>
          </div>
          <div className="flex flex-col justify-center gap-6 px-4 md:px-0">
            <h1 className="text-2xl md:text-3xl font-bold dark:text-primary text-slate-600">Summer Sale upto 50% off</h1>
            <p className="text-sm text-gray-600 tracking-wide leading-5 max-w-md dark:text-primary">
              Lorem ipsum dolor, sit amet consectetur adipisicing elit. Sequi eos quasi illo harum reiciendis eaque a, ea, repudiandae, excepturi nesciunt facilis pariatur eveniet! 
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
                <p className="text-slate-600 dark:text-primary">Fast Delivry</p>
              </div>
              <div
              data-aos='fade-up'
              className="flex items-center gap-4 "
              >
                <MdOutlinePayments className="text-4xl h-12 w-12 shadow-sm p-4 rounded-full bg-green-100 dark:bg-green-500"/>
                <p className="text-slate-600 dark:text-primary">Easy Payment Method</p>
              </div>
              <div
              data-aos='fade-up'
              className="flex items-center gap-4 "
              >
                <GiFoodTruck className="text-4xl h-12 w-12 shadow-sm p-4 rounded-full bg-red-100 dark:bg-red-500"/>
                <p className="text-slate-600 dark:text-primary">Get Offers</p>
              </div>
            </div>
          </div>
        </aside>
      </section>
      {/*Subscribe Section*/}
      <section className="container px-5 lg:mx-auto py-0 dark:bg-slate-400 relative">
              <div data-aos='zoom-in'>
              <img src={scentedCandles} alt="candles" className="absolute left-0 top-0 w-full h-full object-cover" />
              <div className="container backdrop-blur-sm py-10">
                <div className="space-y-6 max-w-xl mx-auto px-4 md:px-0">
                <h1 
                className="text-2xl text-center text-slate-900 font-semibold dark:text-primary">Get Notified About New Products</h1>
                <input data-aos='fade-up'
                type="text"
                disabled
                aria-label='Newsletter signup unavailable, coming soon'
                placeholder="Enter your email"
                className="w-full text-center p-3 rounded-md disabled:cursor-not-allowed disabled:opacity-70 "/>
                <p className='text-center text-slate-900 dark:text-primary'>Newsletter signup coming soon.</p>
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
          Discover what our satisfied customers are saying about OfferingsbyMK!, our products have made a lasting impression.
          </p>
        </div>
            {/*Testimonial Cards*/}
            <div>
            <Swiper
            {...swiperParams}
            data-aos="zoom-out"
            data-aos-once="true"
            data-aos-duration="600"
            modules={[Autoplay]}
            autoplay={{pauseOnMouseEnter: true, delay: 3000}}
            speed={600}
            direction="horizontal"
            loop={"true"}
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
                  className="rounded-full w-20 h-20"/> 
                  </div>
                  <div className="flex flex-col items-center gap-4">
                    <p
                    className="text-xs text-gray-500 dark:text-primary"
                    >{item.text}</p>
                    <h1 className="text-xl font-bold text-slate-600 dark:text-primary">{item.name}</h1>
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
