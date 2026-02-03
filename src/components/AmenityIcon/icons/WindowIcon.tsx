export const WindowIcon = () => {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
  } as const;

  return (
    <svg {...common} aria-label="Window" role="img">
      <path d="M5 5h14v14H5V5Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 5v14" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 12h14" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
};
