import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

/**
 * The app's picker: a button with a rotating chevron that opens a list.
 * Used instead of native <select> so filters and settings look the same.
 *
 *   fullWidth  button fills its container (label left, chevron right), menu as wide as the button
 *   align      'right' (default) or 'left' edge of the menu
 *   id         on the button, so a <label htmlFor> can point at it
 */
const Dropdown = ({
  label,
  icon: Icon,
  options = [],
  value,
  onChange,
  id,
  ariaLabel,
  fullWidth = false,
  align = 'right',
  className = '',
  buttonClassName = '',
  menuClassName = '',
}) => {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const buttonRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const close = () => {
    setOpen(false)
    buttonRef.current?.focus()
  }

  const menuPosition = fullWidth ? 'left-0 right-0' : align === 'left' ? 'left-0' : 'right-0'

  return (
    <div
      className={`relative ${fullWidth ? 'w-full' : ''} ${className}`}
      ref={ref}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation()
          close()
        }
      }}
    >
      <button
        ref={buttonRef}
        id={id}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={`flex items-center gap-1.5 px-3.5 py-2 bg-surface border border-outline-variant rounded-xl text-sm font-medium text-on-surface hover:border-primary/40 transition-colors cursor-pointer ${
          fullWidth ? 'w-full justify-between' : ''
        } ${buttonClassName}`}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {Icon && <Icon className="size-4 text-on-surface-variant shrink-0" />}
          <span className="truncate">{label}</span>
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-on-surface-variant transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className={`absolute ${menuPosition} top-[calc(100%+6px)] z-30 bg-surface border border-outline-variant rounded-xl shadow-lg min-w-[160px] py-1 overflow-hidden ${menuClassName}`}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={value === opt.value}
              lang={opt.lang}
              onClick={() => {
                onChange(opt.value)
                close()
              }}
              className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                value === opt.value
                  ? 'text-primary bg-primary/10'
                  : 'text-on-surface hover:bg-surface-container-low'
              }`}
            >
              <span>{opt.label}</span>
              {value === opt.value && <Check className="size-4 text-primary shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default Dropdown
