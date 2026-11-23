/** Photo when one is uploaded, otherwise initials on lime. */
export function Avatar({ url, initials, size = 36 }: { url: string | null; initials: string; size?: number }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.38) };
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- user-uploaded avatar from Supabase storage
    return <img src={url} alt="" style={style} className="shrink-0 rounded-full object-cover ring-2 ring-surface" />;
  }
  return (
    <span aria-hidden style={style} className="flex shrink-0 items-center justify-center rounded-full bg-lime font-display font-bold text-on-lime ring-2 ring-surface">
      {initials}
    </span>
  );
}
