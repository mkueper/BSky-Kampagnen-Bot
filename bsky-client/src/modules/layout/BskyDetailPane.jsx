import { useEffect, useMemo } from 'react'
import PropTypes from 'prop-types'
import clsx from 'clsx'
import DetailPaneHeader from '../shared/DetailPaneHeader.jsx'

export default function BskyDetailPane ({
  header = null,
  children,
  containerClassName = '',
  bodyClassName = '',
  registerLayoutHeader = null,
  renderHeaderInLayout = false
}) {
  const headerNode = useMemo(() => {
    if (!header) return null
    return (
      <DetailPaneHeader
        {...header}
        wrapInCard={!renderHeaderInLayout}
        className={renderHeaderInLayout ? 'mb-0' : undefined}
      />
    )
  }, [header, renderHeaderInLayout])

  useEffect(() => {
    if (!renderHeaderInLayout || typeof registerLayoutHeader !== 'function') return undefined
    registerLayoutHeader(headerNode)
    return () => registerLayoutHeader(null)
  }, [renderHeaderInLayout, registerLayoutHeader, headerNode])

  return (
    <div
      className={clsx(
        'flex h-full min-h-[400px] flex-col gap-4 overflow-hidden rounded-2xl border border-border bg-background shadow-soft p-3 sm:p-4',
        containerClassName
      )}
      data-component='BskyDetailPane'
    >
      {!renderHeaderInLayout ? headerNode : null}
      <div
        className={clsx(
          'flex-1 overflow-hidden rounded-[20px] border border-border/60 bg-background-subtle/30',
          bodyClassName
        )}
      >
        {children}
      </div>
    </div>
  )
}

BskyDetailPane.propTypes = {
  header: PropTypes.shape({
    eyebrow: PropTypes.string,
    title: PropTypes.string.isRequired,
    subtitle: PropTypes.string,
    onBack: PropTypes.func.isRequired,
    backLabel: PropTypes.string,
    actions: PropTypes.node,
    children: PropTypes.node
  }),
  children: PropTypes.node.isRequired,
  containerClassName: PropTypes.string,
  bodyClassName: PropTypes.string,
  registerLayoutHeader: PropTypes.func,
  renderHeaderInLayout: PropTypes.bool
}
