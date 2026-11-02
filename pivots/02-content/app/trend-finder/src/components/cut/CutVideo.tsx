interface Props {
  url: string
}

// The finished video.
export function CutVideo({ url }: Props) {
  return <video key={url} controls playsInline preload="metadata" src={url} />
}
