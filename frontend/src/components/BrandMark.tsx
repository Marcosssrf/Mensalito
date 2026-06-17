import type {CSSProperties} from 'react'

interface BrandMarkProps {
  size?: number
  radius?: number
  style?: CSSProperties
  className?: string
}

export default function BrandMark({ size = 30, radius = 8, style, className }: BrandMarkProps) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, #18181b 0%, #3f3f46 100%)',
        borderRadius: radius,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        ...style,
      }}
    >
      <svg width={Math.round(size * 0.6)} height={Math.round(size * 0.6)} fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5.2 17.8V6.2h3.1l3.7 5.7 3.7-5.7h3.1v11.6h-3.2v-6.4l-2.8 4.2h-1.6l-2.8-4.2v6.4H5.2Z" fill="#fff"/>
      </svg>
    </div>
  )
}
