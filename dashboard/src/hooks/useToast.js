/**
 * @file useToast.js
 * @description Zugriff auf den globalen Toast-Context für Benachrichtigungen.
 * @exports useToast
 * @dependencies React.useContext, ToastContext
 */

import { useContext } from "react";
import { ToastContext } from "../components/ui/toast-context";

/**
 * Convenience-Hook, der Zugriff auf den globalen Toast-Context liefert.
 * Wirft einen Fehler, falls der Aufrufer nicht innerhalb von `<ToastProvider>`
 * gerendert wird, damit Integrationsfehler früh auffallen.
 *
 * @returns {{ success: Function, error: Function, info: Function }}
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast muss innerhalb von <ToastProvider> verwendet werden.");
  }
  return ctx;
}
