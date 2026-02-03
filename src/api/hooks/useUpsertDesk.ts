import { apiClient } from "../client";
import { useApiRequest } from "./useApiRequest";

export function useUpsertDesk() {
  const { run, isLoading, error, clearError } = useApiRequest(
    apiClient.upsertDesk,
  );

  return {
    upsertDesk: run,
    isLoading,
    error,
    clearError,
  };
}
