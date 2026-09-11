import React from 'react'
import logoSrc from '@/assets/logoemiliabemcasados-ea48a.png'

interface EmiliaLogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'image' | 'vector'
  showSubtitle?: boolean
}

export const EmiliaLogo: React.FC<EmiliaLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'image',
  showSubtitle = true,
}) => {
  const heightClasses = {
    sm: 'h-8',
    md: 'h-12',
    lg: 'h-16',
  }[size]

  if (variant === 'image') {
    return (
      <div className={`inline-flex flex-col items-start ${className}`}>
        <img
          src={logoSrc}
          alt="Emília Bem-Casados"
          className={`${heightClasses} w-auto object-contain select-none`}
          onError={(e) => {
            // Em caso de fallback na renderização, oculta a imagem quebrada
            ;(e.currentTarget as HTMLElement).style.display = 'none'
          }}
        />
      </div>
    )
  }

  // Componente vetorial/tipográfico com script Great Vibes + sans serif
  const textSize = {
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-4xl',
  }[size]

  const subSize = {
    sm: 'text-[9px]',
    md: 'text-[11px]',
    lg: 'text-[13px]',
  }[size]

  return (
    <div className={`inline-flex flex-col select-none leading-none ${className}`}>
      <span
        className={`font-script ${textSize} font-normal tracking-wide`}
        style={{ color: '#B08A3E' }}
      >
        Emília
      </span>
      {showSubtitle && (
        <span
          className={`font-sans ${subSize} font-light tracking-[0.22em] uppercase -mt-1 ml-4`}
          style={{ color: '#5C4A32' }}
        >
          bem-casados
        </span>
      )}
    </div>
  )
}

export default EmiliaLogo
