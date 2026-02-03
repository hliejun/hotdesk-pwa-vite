import { apiClient } from "../client";
import { useApiRequest } from "./useApiRequest";

export function useListBookings() {
  const { run, isLoading, error, clearError } = useApiRequest(
    apiClient.listBookings,
  );

  return {
    listBookings: run,
    isLoading,
    error,
    clearError,
  };
}
