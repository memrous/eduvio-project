import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { getLocaleFromLanguage } from '../../utils/locale'

export const formatDateKey = (date) => {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export const useCalendarGrid = () => {
  const { i18n } = useTranslation()
  const [selectedDate, setSelectedDate] = useState(new Date()) 
  const [currentMonth, setCurrentMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [activeView, setActiveView] = useState('month')

  const handlePrev = () => {
    if (activeView === 'month') {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
    } else if (activeView === 'week' || activeView === 'agenda') {
      const nextD = new Date(selectedDate)
      nextD.setDate(nextD.getDate() - 7)
      setSelectedDate(nextD)
      setCurrentMonth(new Date(nextD.getFullYear(), nextD.getMonth(), 1))
    } else {
      const nextD = new Date(selectedDate)
      nextD.setDate(nextD.getDate() - 1)
      setSelectedDate(nextD)
      setCurrentMonth(new Date(nextD.getFullYear(), nextD.getMonth(), 1))
    }
  }

  const handleNext = () => {
    if (activeView === 'month') {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
    } else if (activeView === 'week' || activeView === 'agenda') {
      const nextD = new Date(selectedDate)
      nextD.setDate(nextD.getDate() + 7)
      setSelectedDate(nextD)
      setCurrentMonth(new Date(nextD.getFullYear(), nextD.getMonth(), 1))
    } else {
      const nextD = new Date(selectedDate)
      nextD.setDate(nextD.getDate() + 1)
      setSelectedDate(nextD)
      setCurrentMonth(new Date(nextD.getFullYear(), nextD.getMonth(), 1))
    }
  }

  const getMonthName = (date) => {
    const locale = getLocaleFromLanguage(i18n.language)
    return date.toLocaleString(locale, { month: 'long', year: 'numeric' })
  }

  const gridDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    
    const firstDay = new Date(year, month, 1)
    let startDayOfWeek = firstDay.getDay()
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1
    
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const daysInPrevMonth = new Date(year, month, 0).getDate()
    
    const days = []
    
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i
      const dateObj = new Date(year, month - 1, dayNum)
      days.push({
        date: dateObj,
        dayNum,
        isCurrentMonth: false,
        dateKey: formatDateKey(dateObj)
      })
    }
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d)
      days.push({
        date: dateObj,
        dayNum: d,
        isCurrentMonth: true,
        dateKey: formatDateKey(dateObj)
      })
    }
    
    const remaining = 42 - days.length
    for (let d = 1; d <= remaining; d++) {
      const dateObj = new Date(year, month + 1, d)
      days.push({
        date: dateObj,
        dayNum: d,
        isCurrentMonth: false,
        dateKey: formatDateKey(dateObj)
      })
    }
    
    return days
  }, [currentMonth])

  const currentWeekDays = useMemo(() => {
    const startOfWeek = new Date(selectedDate)
    let day = startOfWeek.getDay()
    let diff = day === 0 ? 6 : day - 1
    startOfWeek.setDate(startOfWeek.getDate() - diff)
    
    const week = []
    const dayNames = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
    for (let i = 0; i < 7; i++) {
      const dateObj = new Date(startOfWeek)
      dateObj.setDate(startOfWeek.getDate() + i)
      week.push({
        date: dateObj,
        dayNum: dateObj.getDate(),
        dateKey: formatDateKey(dateObj),
        dayName: dayNames[i]
      })
    }
    return week
  }, [selectedDate])

  const hourlySlots = useMemo(() => {
    const slots = []
    for (let i = 8; i <= 20; i++) {
      slots.push(String(i).padStart(2, '0') + ':00')
    }
    return slots
  }, [])

  return {
    selectedDate,
    setSelectedDate,
    currentMonth,
    setCurrentMonth,
    activeView,
    setActiveView,
    handlePrev,
    handleNext,
    getMonthName,
    gridDays,
    currentWeekDays,
    hourlySlots,
  }
}
