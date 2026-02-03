import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ErrorModal } from "./ErrorModal";

describe("ErrorModal", () => {
  it("renders message and dismisses", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    const onRetry = vi.fn();

    render(
      <ErrorModal
        message="Boom"
        retryCount={0}
        onDismiss={onDismiss}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/boom/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /retry/i })).toBeNull();

    await user.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("shows retry button when retries are queued", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    const onRetry = vi.fn();

    render(
      <ErrorModal
        message="Offline"
        retryCount={2}
        onDismiss={onDismiss}
        onRetry={onRetry}
      />,
    );

    await user.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("dismisses on Escape", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();

    render(
      <ErrorModal
        message="Boom"
        retryCount={0}
        onDismiss={onDismiss}
        onRetry={() => {}}
      />,
    );

    await user.keyboard("{Escape}");
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
