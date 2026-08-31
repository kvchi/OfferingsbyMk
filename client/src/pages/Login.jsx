import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { setAuth } from '../store/auth'
import { light1 } from '../assets/images'
import { IoEyeOffOutline, IoEyeOutline, IoKeyOutline, IoPersonCircleOutline, IoPersonOutline } from 'react-icons/io5'
import toast from 'react-hot-toast';
import api from '../api/client'
import { BsPersonSquare } from 'react-icons/bs';
import { TbMailForward } from 'react-icons/tb';
import PhoneNumberInput from 'react-phone-number-input'
import flags from 'react-phone-number-input/flags'
import 'react-phone-number-input/style.css'
import { RiLockPasswordLine } from 'react-icons/ri';
import { createSignupPayload } from '../utils/authPayload.mjs';
import ResponsiveImage from '../components/ResponsiveImage';

export const getLoginDestination = (from) => {
  const pathname = typeof from?.pathname === 'string' ? from.pathname : '';
  if (!pathname.startsWith('/') || pathname.startsWith('//')) return '/shop';
  const search = typeof from?.search === 'string' && from.search.startsWith('?') ? from.search : '';
  const hash = typeof from?.hash === 'string' && from.hash.startsWith('#') ? from.hash : '';
  return `${pathname}${search}${hash}`;
};

export default function Login() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false)
    const [showLogin, setShowLogin] = useState(true)
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch();
    const isAuthenticated = useSelector((store) => store.auth.isAuthenticated);

    useEffect(() => {
      if (isAuthenticated) {
        navigate(getLoginDestination(location.state?.from), { replace: true });
      }
    }, [isAuthenticated, navigate, location.state]);

    const [inputs, setInputs] = useState({
        firstname: "",
        lastname: "",
        phone: "",
        email: "",
        password: "",
        confirm_password: "",
    })

    const handleChange = e => {
        setInputs(prev => ({...prev, [e.target.name]: e.target.value}))
    }

    const handleSignup = async(e) => {
        e.preventDefault()
         toast.loading("Creating your account, please wait...", {id:"1234"})
         if(inputs.password.length < 8) {
            toast.error("Password must be at least 8 characters.",{id:"1234"})
           return
         }
         else if(inputs.password !== inputs.confirm_password) {
            toast.error("Oops! The password entered does not match",{id:"1234"})
           return
         }
         try {
            const signupPayload = createSignupPayload(inputs)
            const res = await api.post('/api/auth/signup', signupPayload)
            const data = await res.data
            toast.success(data.message + " Please log in.", {id: "1234"})
            setEmail(inputs.email)
            setInputs({
                firstname: "",
                lastname: "",
                phone: "",
                email: "",
                password: "",
                confirm_password: "",
            })
            setShowLogin(true)
         } catch (error) {
            const message = error.response?.data?.message || "Unable to create your account. Please try again."
            toast.error(message, {id: "1234"})
         }
    };

    const handleLogin = async(e) => {
      e.preventDefault();
      toast.loading("Logging in, please wait...", {id:"1234"});
      if (password.length < 8) {
        toast.error("Password must be at least 8 characters.", {id:"1234"});
        return;
      }
      try {
        const res = await api.post('/api/auth/login', {email, password });
        const data = await res.data;
        dispatch(setAuth({ token: data.token, user: data.user }));
        toast.success(data.message, {id: "1234"});
        navigate(getLoginDestination(location.state?.from));
        } catch (error) {
          const message = error.response?.data?.message || "Invalid email or password";
          toast.error(message, {id: "1234"});
        }
    };
    
  return (
    <main className='container mx-auto relative  min-h-screen flex items-center justify-center'>
            <div className='absolute inset-0 overflow-hidden z-0 flex items-center justify-center'>
            <ResponsiveImage image={light1} alt="" sizes="(max-width: 767px) 100vw, 50vw" loading="eager" fetchPriority="high" className="top-0 left-0 h-full w-full md:w-1/2 object-cover object-center filter blur-sm opacity-90" />
            </div>
            <div className="relative z-10 p-8 bg-secondary dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md mx-auto">
        {
            showLogin ?
            <form onSubmit={handleLogin}>
                <h2
                className="text-2xl font-bold text-center mb-6 text-primary">Get Exclusive Access</h2>
          <div className="flex items-center gap-1 border-b p-2 dark:text-primary dark:border-primary">
          <IoPersonOutline />
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              required placeholder='Email@email.com'
              className="flex-1 p-1 dark:text-primary bg-transparent outline-none" />
          </div>
          <div 
          className="mb-4 flex items-center gap-1 border-b border-dark/20 dark:border-primary p-2">
          <IoKeyOutline className='dark:text-primary'/>
            <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required placeholder='At least 8 characters' minLength={8} title="Password must be at least 8 characters" className="flex-1 p-1 dark:text-primary outline-none bg-transparent" />
            <span onClick={() => setShowPassword(!showPassword)} className="relative cursor-pointer p-1 dark:text-primary">
                  {
                    showPassword ? <IoEyeOffOutline /> : <IoEyeOutline />
                  }
                </span>
          </div>
          <button 
            type="submit"
            className="py-2 px-6 md:px-8 bg-primary text-white rounded-md w-max hover:bg-yellow-600">
            Login
          </button>
          <p className="p-1 text-center text-dark/60 dark:text-secondary">
            <Link to="/forgot-password" className="underline">Forgot your password?</Link>
          </p>
          <p onClick={() => setShowLogin(!showLogin)} className="cursor-pointer p-1 text-center text-dark/60 underline dark:text-secondary">Don&apos;t have an account yet? Signup</p>
        </form>
        :
        <form onSubmit={handleSignup}>
          <h3 className="text-primary text-xl md:text-2xl text-center font-bold">Enjoy <span className="text-slate-600 dark:text-secondary">Incredible Offers</span> when you Sign up</h3>
          <div className="flex items-center gap-1 border-b p-2 dark:text-primary bg-transparent  dark:border-primary">
          <IoPersonCircleOutline />
            <input type="text" value={inputs.firstname} name='firstname' onChange={handleChange}
              required placeholder='First Name e.g. Mike'
              className="flex-1 p-1 dark:text-primary bg-transparent outline-none" />
          </div>
          <div className="flex items-center gap-1 border-b p-2 dark:text-primary bg-transparent  dark:border-primary">
          <BsPersonSquare />
            <input type="text" value={inputs.lastname} name='lastname' onChange={handleChange}
              required placeholder='Last Name e.g. Angelo'
              className="flex-1 p-1 dark:text-primary bg-transparent outline-none" />
          </div>
          <div className="flex items-center gap-1 border-b p-2 dark:text-primary bg-transparent  dark:border-primary">
          <TbMailForward />
            <input type="email" value={inputs.email} name= 'email' onChange={handleChange}
              required placeholder='Mikeangelo@email.com'
              className="flex-1 p-1 dark:text-primary bg-transparent outline-none" />
          </div>
          <div className="flex items-center gap-1 border-b p-2 dark:text-primary dark:border-primary">
          <PhoneNumberInput 
                  defaultCountry='NG'
                  international
                  countryCallingCodeEditable={false}
                  onChange={value => setInputs(prev => ({ ...prev, phone: value }))}
                  value={inputs.phone}
                  flags={flags}
                className='outline-none dark:text-primary bg-transparent '/>
          </div>
          <div className="mb-4 flex items-center gap-1 border-b border-dark/20 dark:border-primary p-2 dark:text-primary">
          <RiLockPasswordLine />
            <input type={showPassword ? "text" : "password"} value={inputs.password} name='password' onChange={handleChange} required placeholder='At least 8 characters' minLength={8} title="Password must be at least 8 characters" className="flex-1 p-1 dark:text-primary outline-none" />
            <span onClick={() => setShowPassword(!showPassword)} className="relative cursor-pointer p-1 dark:text-primary bg-transparent ">
                  {
                    showPassword ? <IoEyeOffOutline /> : <IoEyeOutline />
                  }
                </span>
          </div>
          <div className="mb-4 flex items-center gap-1 border-b border-dark/20 dark:border-primary p-2 dark:text-primary">
          <RiLockPasswordLine />
            <input type={showPassword ? "text" : "password"} value={inputs.confirm_password} name='confirm_password' onChange={handleChange} required placeholder='Confirm password' minLength={8} title="Password must be at least 8 characters" className="flex-1 p-1 dark:text-primary outline-none" />
            <span onClick={() => setShowPassword(!showPassword)} className="relative cursor-pointer p-1">
                  {
                    showPassword ? <IoEyeOffOutline /> : <IoEyeOutline />
                  }
                </span>
          </div>
          <button 
            type="submit"
            className="py-2 px-6 md:px-8 bg-primary text-white rounded-md w-max hover:bg-yellow-600">
            Sign up
          </button>
          <p onClick={() => setShowLogin(!showLogin)} className="cursor-pointer p-1 text-center text-dark/60 underline dark:text-secondary">Already a Member? Login</p>
        </form>
        }
      </div>
    </main>
  )
}
