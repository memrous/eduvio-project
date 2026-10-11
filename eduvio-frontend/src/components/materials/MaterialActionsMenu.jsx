import { useEffect, useId, useRef, useState } from 'react'
import { MoreVertical } from 'lucide-react'

/**
 * "⋮" menu with actions of one material (menu button pattern):
 * Enter / Space / ArrowDown open it, arrows and Home / End move,
 * Escape closes and returns focus to the button, Tab closes.
 *
 * @param {{ label: string, items: { key: string, label: string, icon: any, onSelect: () => void, danger?: boolean }[] }} props
 */
const MaterialActionsMenu = ({ label, items, className = '' }) => {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef(null)
  const menuRef = useRef(null)
  const itemRefs = useRef([])
  const menuId = useId()

  const focusItem = (index) => {
    const count = items.length
    itemRefs.current[(index + count) % count]?.focus()
  }

  const close = (returnFocus) => {
    setOpen(false)
    if (returnFocus) buttonRef.current?.focus()
  }

  // Close on a click outside
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e) => {
      if (!menuRef.current?.contains(e.target) && !buttonRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  // Focus the first item when the menu opens
  useEffect(() => {
    if (open) itemRefs.current[0]?.focus()
  }, [open])

  if (items.length === 0) return null

  const onButtonKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      e.stopPropagation()
      setOpen(true)
    }
  }

  const onMenuKeyDown = (e) => {
    const index = itemRefs.current.indexOf(document.activeElement)
    if (e.key === 'ArrowDown') { e.preventDefault(); focusItem(index + 1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); focusItem(index - 1) }
    else if (e.key === 'Home') { e.preventDefault(); focusItem(0) }
    else if (e.key === 'End') { e.preventDefault(); focusItem(items.length - 1) }
    else if (e.key === 'Escape') { e.preventDefault(); close(true) }
    else if (e.key === 'Tab') { close(false) }
    e.stopPropagation()
  }

  return (
    // Clicks inside must not open the card the menu sits on
    <div className={`relative z-10 ${className}`} onClick={(e) => e.stopPropagation()}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onButtonKeyDown}
        className="flex size-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-primary/15 hover:text-primary cursor-pointer bg-transparent border-0"
      >
        <MoreVertical className="size-4" aria-hidden="true" />
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 top-full mt-1 min-w-52 overflow-hidden rounded-xl border border-outline-variant bg-surface py-1 shadow-lg font-inter"
        >
          {items.map((item, index) => {
            const Icon = item.icon
            return (
              <button
                key={item.key}
                ref={(el) => { itemRefs.current[index] = el }}
                type="button"
                role="menuitem"
                tabIndex={-1}
                onClick={() => {
                  close(true)
                  item.onSelect()
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors cursor-pointer bg-transparent border-0 focus:outline-none ${
                  item.danger
                    ? 'text-error hover:bg-error/10 focus:bg-error/10'
                    : 'text-on-surface hover:bg-surface-container focus:bg-surface-container'
                }`}
              >
                {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
                {item.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default MaterialActionsMenu
