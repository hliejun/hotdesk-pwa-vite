import { apiClient } from "../client";
import { useApiRequest } from "./useApiRequest";

export function useCreateBooking() {
  const { run, isLoading, error, clearError } = useApiRequest(
    apiClient.createBooking,
  );

  return {
    createBooking: run,
    isLoading,
    error,
    clearError,
  };
}
