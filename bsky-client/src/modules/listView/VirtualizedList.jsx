export function VirtualizedList ({ items, renderItem, className, emptyFallback, ...restProps }) {
  const listItems = Array.isArray(items) ? items : []

  if (listItems.length === 0) {
    if (emptyFallback !== undefined) {
      return <>{emptyFallback}</>
    }
    return <ul className={className} {...restProps} />
  }

  return (
    <ul className={className} {...restProps}>
      {listItems.map((item, index) => (
        <li key={getItemKey(item, index)}>
          {renderItem(item, index)}
        </li>
      ))}
    </ul>
  )
}

function getItemKey (item, index) {
  return (
    item?.listEntryId ||
    item?.uri ||
    item?.cid ||
    item?.id ||
    `${index}`
  )
}
