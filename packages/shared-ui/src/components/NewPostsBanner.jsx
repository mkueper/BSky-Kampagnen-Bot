import PropTypes from 'prop-types'

export default function NewPostsBanner ({
  visible = false,
  onClick,
  busy = false,
  buttonLabel = 'Show new posts'
}) {
  if (!visible || busy) return null
  return (
    <div
      data-component='BskyNewPostsBanner'
      className='sticky top-2 z-10 mx-auto w-fit rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary shadow-soft backdrop-blur supports-[backdrop-filter]:bg-primary/20'
    >
      <button
        type='button'
        className='inline-flex items-center gap-2 text-primary hover:text-primary/80 focus:outline-none'
        onClick={onClick}
        disabled={busy}
      >
        {buttonLabel}
      </button>
    </div>
  )
}

NewPostsBanner.propTypes = {
  visible: PropTypes.bool,
  onClick: PropTypes.func,
  busy: PropTypes.bool,
  buttonLabel: PropTypes.string
}
