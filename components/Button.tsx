import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "px-6 py-3 rounded-none font-bold text-sm tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-inherit disabled:hover:text-inherit disabled:hover:border-inherit";
  
  const variants = {
    primary: "bg-white text-black hover:bg-gray-200 border border-white disabled:bg-zinc-700 disabled:text-zinc-500 disabled:border-zinc-700",
    secondary: "bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-800",
    outline: "bg-transparent text-white border border-zinc-600 hover:border-white hover:bg-zinc-900",
    ghost: "bg-transparent text-zinc-400 hover:text-white"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
