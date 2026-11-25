import { imageUrl } from '../lib/supabase';
const PAL: Record<string, [string, string, string]> = {
  nature: ['#cfe0c6', '#7ea37a', '#1f3d2f'], adventure: ['#f1d3b8', '#c46942', '#3b2a1c'], culture: ['#ecdcbc', '#b58a52', '#4a3a24'],
  family: ['#d6e6d8', '#8fb58f', '#25513c'], relaxation: ['#cfe3e6', '#7fb0b8', '#1f4a52'], city: ['#e4ddd0', '#8d8577', '#2b2a27'],
};
/** Neutral illustrated placeholder (no hotlinked / third-party photos). Agency uploads replace it. */
export function Photo({ path, category = 'nature', alt, className = '' }: { path?: string | null; category?: string; alt: string; className?: string }) {
  const url = imageUrl(path);
  if (url) return <img src={url} alt={alt} loading="lazy" className={`object-cover ${className}`} />;
  const [sky, hill, dark] = PAL[category] ?? PAL.nature;
  return (
    <svg role="img" aria-label={alt} viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" className={className}>
      <rect width="400" height="260" fill={sky} /><circle cx="310" cy="70" r="30" fill="#fff" opacity=".7" />
      <path d="M0 190 L90 100 L150 160 L230 70 L330 170 L400 120 V260 H0Z" fill={hill} opacity=".85" />
      <path d="M0 220 Q100 170 200 215 T400 200 V260 H0Z" fill={dark} />
    </svg>
  );
}
