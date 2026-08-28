import React from 'react'
import { Link } from 'react-router-dom'

export default function Error() {
  return (
    <main className='container mx-auto min-h-[50vh] flex flex-col items-center justify-center gap-4 px-4 text-center dark:bg-slate-800'>
      <h1 className='text-3xl font-bold text-slate-700 dark:text-primary'>Page not found</h1>
      <p className='text-slate-600 dark:text-primary'>We could not find the page you requested.</p>
      <div className='flex gap-4'>
        <Link to='/' className='rounded-md bg-primary px-4 py-2 text-slate-800'>Go to Home</Link>
        <Link to='/shop' className='rounded-md border border-primary px-4 py-2 text-slate-700 dark:text-primary'>Browse Shop</Link>
      </div>
    </main>
  )
}
