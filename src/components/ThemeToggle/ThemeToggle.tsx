import React from "react";
import type { ThemeMode } from "../../store/reducer";

function nextTheme(mode: ThemeMode): ThemeMode {
  switch (mode) {
    case "system":
      return "light";
    case "light":
      return "dark";
    case "dark":
      return "system";
  }
}

export interface ThemeToggleProps {
  value: ThemeMode;
  onChange: (next: ThemeMode) => void;
}

const SunIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M12 3v2.5M12 18.5V21M21 12h-2.5M5.5 12H3M18.36 5.64 16.6 7.4M7.4 16.6l-1.76 1.76M18.36 18.36 16.6 16.6M7.4 7.4 5.64 5.64"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
      stroke="currentColor"
      strokeWidth="1.8"
    />
  </svg>
);

const MoonIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M21 14.5A7.5 7.5 0 0 1 9.5 3a6.5 6.5 0 1 0 11.5 11.5Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  </svg>
);

const SystemIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M4 6.5C4 5.12 5.12 4 6.5 4h11C18.88 4 20 5.12 20 6.5v7C20 14.88 18.88 16 17.5 16h-11C5.12 16 4 14.88 4 13.5v-7Z"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <path d="M10 20h4" stroke="currentColor" strokeWidth="1.8" />
    <path d="M12 16v4" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

function modeLabel(mode: ThemeMode) {
  return mode === "system" ? "System" : mode === "light" ? "Light" : "Dark";
}

function modeIcon(mode: ThemeMode) {
  return mode === "system" ? (
    <SystemIcon />
  ) : mode === "light" ? (
    <SunIcon />
  ) : (
    <MoonIcon />
  );
}

export const ThemeToggle = ({ value, onChange }: ThemeToggleProps) => {
  const label = value === "system" ? "Theme: System" : `Theme: ${value}`;
  const mode = modeLabel(value);

  return (
    <button
      className="themeSwitch"
      type="button"
      aria-label={label}
      data-mode={value}
      onClick={() => onChange(nextTheme(value))}
    >
      <span className="themeSwitchTrack" aria-hidden="true">
        <span className="themeSwitchThumb">{modeIcon(value)}</span>
      </span>
      <span className="themeSwitchText">
        <span className="themeSwitchTitle">Theme</span>
        <span className="themeSwitchMode">{mode}</span>
      </span>
    </button>
  );
};
