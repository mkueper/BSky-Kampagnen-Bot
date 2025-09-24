import { useToastContext } from "../components/ui/ToastProvider";

export function useToast() {
  return useToastContext();
}
