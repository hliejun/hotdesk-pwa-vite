import { apiClient } from "../client";
import { useApiRequest } from "./useApiRequest";

export function useUpdateConfig() {
  const { run, isLoading, error, clearError } = useApiRequest(
    apiClient.updateConfig,
  );

  return {
    updateConfig: run,
    isLoading,
    error,
    clearError,
  };
}
