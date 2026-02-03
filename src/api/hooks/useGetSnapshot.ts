import { apiClient } from "../client";
import { useApiRequest } from "./useApiRequest";

export function useGetSnapshot() {
  const { run, isLoading, error, clearError } = useApiRequest(
    apiClient.getSnapshot,
  );

  return {
    getSnapshot: run,
    isLoading,
    error,
    clearError,
  };
}
