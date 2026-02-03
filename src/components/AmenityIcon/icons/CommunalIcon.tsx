export const CommunalIcon = () => {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
  } as const;

  return (
    <svg {...common} aria-label="Communal" role="img">
      <path
        d="M8 12a3 3 0 1 0-6 0v1.5C2 15.43 3.57 17 5.5 17H8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M22 13.5V12a3 3 0 1 0-6 0v1.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M8 13a4 4 0 0 1 8 0v1.5A2.5 2.5 0 0 1 13.5 17h-3A2.5 2.5 0 0 1 8 14.5V13Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
};
