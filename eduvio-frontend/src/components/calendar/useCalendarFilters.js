import { useState, useMemo, useEffect } from 'react'

export const useCalendarFilters = (currentEvents = [], currentSubjects = []) => {
  const SUBJECTS = useMemo(() => {
    return currentSubjects.map((subj) => ({
      id: subj.id,
      name: subj.name,
      code: subj.code
    }))
  }, [currentSubjects])

  const [selectedSubjects, setSelectedSubjects] = useState([])

  // Keep selectedSubjects in sync when subjects are loaded
  useEffect(() => {
    if (currentSubjects.length > 0 && selectedSubjects.length === 0) {
      setTimeout(() => {
        setSelectedSubjects(currentSubjects.map(s => s.name))
      }, 0)
    }
  }, [currentSubjects, selectedSubjects])

  const preparedEvents = useMemo(() => {
    return currentEvents.map(event => {
      const subjObj = SUBJECTS.find(s => s.id === event.subjectId)
      return {
        ...event,
        code: event.code || (subjObj ? subjObj.code : 'MOCK'),
        subject: subjObj ? subjObj.name : (event.subject || 'Unknown'),
        startTime: event.startTime || '10:00',
        endTime: event.endTime || '10:00',
        color: 'blue'
      }
    })
  }, [currentEvents, SUBJECTS])

  const filteredEvents = useMemo(() => {
    return preparedEvents.filter(event => selectedSubjects.includes(event.subject))
  }, [preparedEvents, selectedSubjects])

  const handleSubjectToggle = (subjName) => {
    if (selectedSubjects.includes(subjName)) {
      setSelectedSubjects(selectedSubjects.filter(s => s !== subjName))
    } else {
      setSelectedSubjects([...selectedSubjects, subjName])
    }
  }

  return {
    selectedSubjects,
    setSelectedSubjects,
    SUBJECTS,
    preparedEvents,
    filteredEvents,
    handleSubjectToggle,
  }
}
