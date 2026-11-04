import logoUrl from '../assets/remake-logo.png'

// The Remake wordmark (the founder's logo file). Drawn as a mask so it takes the text colour and works in dark mode.
// `inText`: sized by the surrounding text (CSS sets the height in em), for the wordmark inside a heading.
export function Logo({ height = 22, inText, className = '' }: { height?: number; inText?: boolean; className?: string }) {
  const mask = { maskImage: `url(${logoUrl})`, WebkitMaskImage: `url(${logoUrl})` }
  return (
    <span
      className={`remake-logo${inText ? ' remake-logo-text' : ''}${className ? ` ${className}` : ''}`}
      role="img"
      aria-label="Remake"
      style={inText ? mask : { height, width: height * (706 / 151), ...mask }}
    />
  )
}
