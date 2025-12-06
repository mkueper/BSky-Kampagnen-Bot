import Button from './Button.jsx'
import Modal from './Modal.jsx'

export default function ConfirmDialog ({
  open,
  title = 'Bestätigen',
  description = '',
  confirmLabel = 'OK',
  cancelLabel = 'Abbrechen',
  variant = 'primary',
  onConfirm,
  onCancel
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      actions={(
        <>
          <Button variant='secondary' onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={variant} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      )}
    >
      {description ? (
        <p className='text-sm text-foreground'>{description}</p>
      ) : null}
    </Modal>
  )
}

