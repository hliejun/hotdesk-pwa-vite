import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockConfirm } from "./test/testUtils";

const renderMock = vi.fn();
const createRootMock = vi.fn(() => ({ render: renderMock }));

vi.mock("react-dom/client", () => {
  return {
    createRoot: createRootMock,
    default: {
      createRoot: createRootMock,
    },
  };
});

const updateFn = vi.fn();
type RegisterSwOptions = {
  immediate?: boolean;
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
};

let capturedSwOptions: RegisterSwOptions | undefined;

const registerSwMock = vi.fn((opts: RegisterSwOptions) => {
  capturedSwOptions = opts;
  return updateFn;
});

vi.mock("virtual:pwa-register", () => {
  return {
    registerSW: registerSwMock,
  };
});

describe("main", () => {
  beforeEach(() => {
    renderMock.mockClear();
    createRootMock.mockClear();
    registerSwMock.mockClear();
    updateFn.mockClear();
    capturedSwOptions = undefined;
    document.body.innerHTML = '<div id="root"></div>';
  });

  it("registers SW and mounts React", async () => {
    vi.resetModules();

    await import("./main");

    expect(registerSwMock).toHaveBeenCalledTimes(1);
    expect(createRootMock).toHaveBeenCalledTimes(1);

    const rootEl = document.getElementById("root");
    expect(createRootMock).toHaveBeenCalledWith(rootEl);
    expect(renderMock).toHaveBeenCalledTimes(1);
  });

  it("handles SW refresh prompt", async () => {
    vi.resetModules();

    await import("./main");

    const opts = capturedSwOptions;
    expect(typeof opts?.onNeedRefresh).toBe("function");
    expect(typeof opts?.onOfflineReady).toBe("function");

    const confirmMock = mockConfirm();

    confirmMock.mockReturnValue(false);
    opts?.onNeedRefresh?.();
    expect(updateFn).not.toHaveBeenCalled();

    confirmMock.mockReturnValue(true);
    opts?.onNeedRefresh?.();
    expect(updateFn).toHaveBeenCalledWith(true);

    opts?.onOfflineReady?.();
  });
});
