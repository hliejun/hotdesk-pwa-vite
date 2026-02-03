import { apiClient } from "../client";
import { useApiRequest } from "./useApiRequest";

export function useCancelBooking() {
  const { run, isLoading, error, clearError } = useApiRequest(
    apiClient.cancelBooking,
  );

  return {
    cancelBooking: run,
    isLoading,
    error,
    clearError,
  };
}
