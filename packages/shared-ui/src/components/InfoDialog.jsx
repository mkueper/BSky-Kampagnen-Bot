import PropTypes from 'prop-types'
import Button from './Button.jsx'
import Modal from './Modal.jsx'

export default function InfoDialog ({
  open,
  title,
  introText,
  content,
  examples,
  onClose,
  panelClassName,
  closeLabel
}) {
  const label = closeLabel || 'Schließen'

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      panelClassName={panelClassName}
      actions={(
        <Button
          variant='secondary'
          onClick={onClose}
        >
          {label}
        </Button>
      )}
    >
      <div className='space-y-3 text-sm text-foreground'>
        {introText ? (
          <div className='text-foreground'>
            {introText}
          </div>
        ) : null}
        <div className='max-w-[52ch] rounded-2xl bg-background-subtle px-4 py-3 leading-relaxed space-y-2'>
          {content}
        </div>
        {examples ? (
          <pre className='font-mono text-xs md:text-sm bg-background-subtle rounded-2xl px-4 py-3 whitespace-pre leading-relaxed overflow-auto'>
            {examples}
          </pre>
        ) : null}
      </div>
    </Modal>
  )
}

InfoDialog.propTypes = {
  open: PropTypes.bool,
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  introText: PropTypes.node,
  content: PropTypes.node.isRequired,
  examples: PropTypes.node,
  onClose: PropTypes.func.isRequired,
  panelClassName: PropTypes.string,
  closeLabel: PropTypes.oneOfType([PropTypes.string, PropTypes.node])
}
