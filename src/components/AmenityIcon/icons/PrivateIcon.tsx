export const PrivateIcon = () => {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
  } as const;

  return (
    <svg {...common} aria-label="Private" role="img">
      <path
        d="M7 11V8.8C7 6.15 9.24 4 12 4s5 2.15 5 4.8V11"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 11h9A2.5 2.5 0 0 1 19 13.5v4A2.5 2.5 0 0 1 16.5 20h-9A2.5 2.5 0 0 1 5 17.5v-4A2.5 2.5 0 0 1 7.5 11Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
};
