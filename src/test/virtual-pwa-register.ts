export type RegisterSWOptions = {
  immediate?: boolean;
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
};

export function registerSW(_options?: RegisterSWOptions) {
  return async function updateSW(_reloadPage?: boolean) {
    // no-op stub (tests usually `vi.mock()` this module)
  };
}
