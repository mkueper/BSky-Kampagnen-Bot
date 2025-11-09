import { useCallback, useState } from 'react'

export function useConfirmDialog () {
  const [dialog, setDialog] = useState({ open: false })

  const closeConfirm = useCallback(() => {
    setDialog(prev => ({ ...prev, open: false }))
  }, [])

  const openConfirm = useCallback((config = {}) => {
    const {
      onConfirm,
      ...rest
    } = config
    const wrappedConfirm = async () => {
      try {
        if (typeof onConfirm === 'function') {
          await onConfirm()
        }
      } finally {
        closeConfirm()
      }
    }
    setDialog({
      open: true,
      ...rest,
      onConfirm: wrappedConfirm
    })
  }, [closeConfirm])

  return {
    dialog,
    openConfirm,
    closeConfirm
  }
}
