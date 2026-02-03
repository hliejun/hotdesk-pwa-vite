import { apiClient } from "../client";
import { useApiRequest } from "./useApiRequest";

export function useListUsers() {
  const { run, isLoading, error, clearError } = useApiRequest(
    apiClient.listUsers,
  );

  return {
    listUsers: run,
    isLoading,
    error,
    clearError,
  };
}
