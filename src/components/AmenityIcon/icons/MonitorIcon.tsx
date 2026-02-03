export const MonitorIcon = () => {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
  } as const;

  return (
    <svg {...common} aria-label="Monitor" role="img">
      <path
        d="M4 6.5C4 5.12 5.12 4 6.5 4h11C18.88 4 20 5.12 20 6.5v7C20 14.88 18.88 16 17.5 16h-11C5.12 16 4 14.88 4 13.5v-7Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M10 20h4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 16v4" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
};
