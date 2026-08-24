import { useState, useEffect } from 'react'

export const useEventForm = ({
  currentSubjects = [],
  onEditEvent,
  onCreateEvent,
  setIsModalOpen,
}) => {
  const [editingEventId, setEditingEventId] = useState(null)
  const [newTitle, setNewTitle] = useState('')
  const [newSubject, setNewSubject] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('10:00')
  const [newDuration, setNewDuration] = useState('60')
  const [newType, setNewType] = useState('Lecture')

  // Set default subject when subjects load
  useEffect(() => {
    if (currentSubjects.length > 0 && !newSubject) {
      setTimeout(() => {
        setNewSubject(currentSubjects[0].name)
      }, 0)
    }
  }, [currentSubjects, newSubject])

  const handleFormSubmit = (e) => {
    e.preventDefault()
    if (!newTitle.trim()) return

    const targetSubj = currentSubjects.find(s => s.name === newSubject)

    // Calculate end time based on duration
    const [h, m] = newTime.split(':').map(Number)
    const minutesAdded = Number(newDuration)
    const totalMinutes = h * 60 + m + minutesAdded
    const endH = String(Math.floor(totalMinutes / 60) % 24).padStart(2, '0')
    const endM = String(totalMinutes % 60).padStart(2, '0')
    const formattedEndTime = `${endH}:${endM}`

    const eventData = {
      id: editingEventId || Date.now(), // Preserve ID if editing
      subjectId: targetSubj ? targetSubj.id : 1,
      title: newTitle,
      date: newDate,
      startTime: newTime,
      endTime: formattedEndTime,
      type: newType,
      status: 'Not Started'
    }

    if (editingEventId) {
      if (onEditEvent) onEditEvent(eventData)
    } else {
      if (onCreateEvent) onCreateEvent(eventData)
    }
    
    // Reset form and close modal
    setNewTitle('')
    setEditingEventId(null)
    setIsModalOpen(false)
  }

  const openCreateModal = (dateStr) => {
    setNewDate(dateStr)
    setIsModalOpen(true)
  }

  return {
    editingEventId,
    setEditingEventId,
    newTitle,
    setNewTitle,
    newSubject,
    setNewSubject,
    newDate,
    setNewDate,
    newTime,
    setNewTime,
    newDuration,
    setNewDuration,
    newType,
    setNewType,
    handleFormSubmit,
    openCreateModal,
  }
}
