import { apiClient } from "../client";
import { useApiRequest } from "./useApiRequest";

export function useListDesks() {
  const { run, isLoading, error, clearError } = useApiRequest(
    apiClient.listDesks,
  );

  return {
    listDesks: run,
    isLoading,
    error,
    clearError,
  };
}
