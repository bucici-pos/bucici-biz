import React from 'react';

interface BuciciLogoProps {
  className?: string;
  size?: number;
  withBg?: boolean;
}

export default function BuciciLogo({ className = '', size = 36, withBg = false }: BuciciLogoProps) {
  const content = (
    <svg
      width={withBg ? size * 0.65 : size}
      height={withBg ? size * 0.65 : size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={withBg ? "" : className}
    >
      <defs>
        {/* Gradient matching the cyan/teal glow of the logo */}
        <linearGradient id="buciciGradient" x1="20" y1="20" x2="180" y2="180" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00f5d4" />
          <stop offset="50%" stopColor="#02b3a3" />
          <stop offset="100%" stopColor="#028090" />
        </linearGradient>
      </defs>

      {/* Stylized letter "B" with double lines */}
      <path
        d="M 50 150 
           L 50 50 
           C 95 50, 135 50, 135 90 
           C 135 110, 115 120, 100 120
           C 120 120, 145 130, 145 155
           C 145 180, 105 180, 50 180"
        stroke="url(#buciciGradient)"
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 70 130 
           L 70 70 
           C 100 70, 115 70, 115 95 
           C 115 110, 100 112, 85 112
           M 85 112
           C 105 112, 125 115, 125 140
           C 125 160, 100 160, 70 160"
        stroke="url(#buciciGradient)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />

      {/* Upward Growth Chart Line */}
      <path
        d="M 35 170 
           L 85 110 
           L 115 130 
           L 165 75"
        stroke="url(#buciciGradient)"
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,245,212,0.3))' }}
      />

      {/* Star at the end of the chart line */}
      <path
        d="M 180 50 
           L 183 58 
           L 191 59 
           L 185 65 
           L 187 73 
           L 180 68 
           L 173 73 
           L 175 65 
           L 169 59 
           L 177 58 
           Z"
        fill="#00f5d4"
        style={{ filter: 'drop-shadow(0px 0px 6px #00f5d4)' }}
      />
    </svg>
  );

  if (withBg) {
    return (
      <div 
        className={`bg-[#121c27] flex items-center justify-center rounded-2xl shadow-lg border border-slate-800/40 shrink-0 ${className}`}
        style={{ width: size, height: size }}
      >
        {content}
      </div>
    );
  }

  return content;
}
