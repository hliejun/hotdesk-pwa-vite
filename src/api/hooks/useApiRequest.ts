import { useCallback, useState } from "react";

function asMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}

export function useApiRequest<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<{ data: TResult }>,
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const run = useCallback(
    async (...args: TArgs) => {
      setIsLoading(true);
      setError(undefined);
      try {
        const res = await fn(...args);
        return res.data;
      } catch (e) {
        const msg = asMessage(e);
        setError(msg);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [fn],
  );

  return { run, isLoading, error, clearError: () => setError(undefined) };
}
