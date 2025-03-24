import { AxiosError, AxiosResponse } from "@/types/api";
import { toast } from "@/hooks/use-toast";

/**
 * Handles API responses with common error handling and toast notifications
 */
export function handleApiResponse<T>(
  promise: Promise<AxiosResponse<T>>,
  {
    successMessage,
    errorMessage = "An error occurred",
    showSuccessToast = false,
    showErrorToast = true,
  }: {
    successMessage?: string;
    errorMessage?: string;
    showSuccessToast?: boolean;
    showErrorToast?: boolean;
  } = {},
): Promise<T> {
  return promise
    .then((response) => {
      if (showSuccessToast && successMessage) {
        toast({
          title: "Success",
          description: successMessage,
        });
      }
      return response.data;
    })
    .catch((error: unknown) => {
      let message = errorMessage;

      if (error instanceof Error) {
        if ("isAxiosError" in error && error.isAxiosError) {
          const axiosError = error as unknown as AxiosError;
          message =
            axiosError.response?.data?.error ||
            axiosError.message ||
            errorMessage;
        } else {
          message = error.message;
        }
      }

      if (showErrorToast) {
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      }

      throw error;
    });
}

/**
 * Helper to format error messages from API responses
 */
export function formatApiError(error: unknown): string {
  if (error instanceof Error) {
    if ("isAxiosError" in error && error.isAxiosError) {
      const axiosError = error as unknown as AxiosError;
      return (
        axiosError.response?.data?.error ||
        axiosError.message ||
        "An error occurred"
      );
    }
    return error.message;
  }

  return "An unexpected error occurred";
}
