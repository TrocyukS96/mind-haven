export function ForestBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <img
        src="/forest/hero-light.jpg"
        alt=""
        className="h-full w-full object-cover object-[center_40%] dark:hidden"
      />
      <img
        src="/forest/hero-dark.jpg"
        alt=""
        className="hidden h-full w-full object-cover object-[center_42%] dark:block"
      />
    </div>
  );
}
