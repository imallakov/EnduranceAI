import React from 'react';

type ButtonVariant = 'coral' | 'primary' | 'ghost';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: React.ReactNode;
}

const variantClass: Record<ButtonVariant, string> = {
  coral: 'btn btn-coral',
  primary: 'btn btn-primary',
  ghost: 'btn btn-ghost',
};

const Button: React.FC<ButtonProps> = ({ variant = 'ghost', className = '', children, ...rest }) => (
  <button className={`${variantClass[variant]} ${className}`} {...rest}>
    {children}
  </button>
);

export default Button;
