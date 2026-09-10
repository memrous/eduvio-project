import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

const Dropdown = ({
  label,
  icon: Icon,
  options = [],
  value,
  onChange,
  className = '',
  buttonClassName = '',
  menuClassName = '',
}) => {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex items-center gap-1.5 px-3.5 py-2 bg-surface border border-outline-variant rounded-xl text-sm font-medium text-on-surface hover:border-primary/40 transition-colors cursor-pointer ${buttonClassName}`}
      >
        {Icon && <Icon className="w-3.5 h-3.5 text-on-surface-variant shrink-0" />}
        <span>{label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-on-surface-variant transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div
          className={`absolute right-0 top-[calc(100%+6px)] z-30 bg-surface border border-outline-variant rounded-xl shadow-lg min-w-[160px] py-1 overflow-hidden ${menuClassName}`}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
              className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                value === opt.value
                  ? 'text-primary bg-primary/10'
                  : 'text-on-surface hover:bg-surface-container-low'
              }`}
            >
              <span>{opt.label}</span>
              {value === opt.value && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default Dropdown
