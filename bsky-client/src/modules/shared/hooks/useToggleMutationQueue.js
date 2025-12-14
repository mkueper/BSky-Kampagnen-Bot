import { useCallback, useEffect, useRef, useState } from 'react';

function createAbortError () {
  const error = new Error('Aborted');
  error.name = 'AbortError';
  return error;
}

/**
 * Warteschlange für Toggle-Operationen (z.B. Like/Unlike).
 * Mehrere schnelle Aktionen werden serialisiert, wobei nur der letzte gewünschte Zustand
 * tatsächlich ausgeführt wird. Jede queueToggle-Rückgabe löst mit dem Serverstatus
 * der jeweiligen Aktion auf.
 */
export function useToggleMutationQueue ({ initialState, runMutation, onSuccess }) {
  const [queue] = useState(() => ({
    activeTask: null,
    queuedTask: null,
  }));

  const processQueue = useCallback(async () => {
    if (queue.activeTask) {
      return;
    }

    let confirmedState = initialState;
    try {
      while (queue.queuedTask) {
        const previousTask = queue.activeTask;
        const nextTask = queue.queuedTask;
        queue.activeTask = nextTask;
        queue.queuedTask = null;

        if (previousTask?.isOn === nextTask.isOn) {
          previousTask.reject(createAbortError());
          continue;
        }

        try {
          confirmedState = await runMutation(confirmedState, nextTask.isOn);
          nextTask.resolve(confirmedState);
        } catch (error) {
          nextTask.reject(error);
        }
      }
    } finally {
      onSuccess?.(confirmedState);
      queue.activeTask = null;
      queue.queuedTask = null;
    }
  }, [initialState, onSuccess, queue, runMutation]);

  const queueToggle = useCallback(
    (isOn) =>
      new Promise((resolve, reject) => {
        if (queue.queuedTask) {
          queue.queuedTask.reject(createAbortError());
        }
        queue.queuedTask = { isOn, resolve, reject };
        processQueue();
      }),
    [processQueue, queue],
  );

  const queueToggleRef = useRef(queueToggle);
  useEffect(() => {
    queueToggleRef.current = queueToggle;
  }, [queueToggle]);

  return useCallback((isOn) => queueToggleRef.current(isOn), []);
}
