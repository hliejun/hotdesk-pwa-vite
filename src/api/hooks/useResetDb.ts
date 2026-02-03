import { apiClient } from "../client";
import { useApiRequest } from "./useApiRequest";

export function useResetDb() {
  const { run, isLoading, error, clearError } = useApiRequest(apiClient.reset);

  return {
    resetDb: run,
    isLoading,
    error,
    clearError,
  };
}
