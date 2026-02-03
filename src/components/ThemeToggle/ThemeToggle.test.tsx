import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "./ThemeToggle";
import type { ThemeMode } from "../../store/reducer";

describe("ThemeToggle", () => {
  it.each([
    ["system", "Theme: System", "System", "light"],
    ["light", "Theme: light", "Light", "dark"],
    ["dark", "Theme: dark", "Dark", "system"],
  ] as Array<[ThemeMode, string, string, ThemeMode]>)(
    "cycles from %s",
    async (mode, ariaLabel, text, next) => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<ThemeToggle value={mode} onChange={onChange} />);

      const button = screen.getByRole("button", { name: ariaLabel });
      expect(button).toHaveTextContent("Theme");
      expect(button).toHaveTextContent(text);

      await user.click(button);
      expect(onChange).toHaveBeenCalledWith(next);
    },
  );
});
