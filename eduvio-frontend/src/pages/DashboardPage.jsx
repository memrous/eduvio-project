import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Trans, useTranslation } from 'react-i18next'
import CustomIcon from '../components/CustomIcon'
import * as api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useSubjects } from '../hooks/useSubjects'
import { useDashboardSummary } from '../hooks/useDashboardSummary'
import PageState from '../components/PageState'

import SubjectMiniCard from '../components/dashboard/SubjectMiniCard'
import NeedsAttention from '../components/dashboard/NeedsAttention'
import NextUp from '../components/dashboard/NextUp'
import TodaySchedule from '../components/dashboard/TodaySchedule'
import QuickProgress from '../components/dashboard/QuickProgress'

const DashboardPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useTranslation(['dashboard', 'common'])
  const queryClient = useQueryClient()

  const { data: summary, isLoading: summaryLoading, error: summaryError, refetch: refetchSummary } = useDashboardSummary()
  const { data: allSubjects, isLoading: subjectsLoading, error: subjectsError, refetch: refetchSubjects } = useSubjects()

  // Derive initial sync status from user object:
  // - Use stag_sync_status if available
  // - Fall back to 'pending' only if the user has STAG credentials but has never synced
  const derivedInitialStatus = (() => {
    if (!user) return null
    if (user.stag_sync_status) return user.stag_sync_status
    if (user.stag_username && !user.stag_synced_at) return 'pending'
    return null
  })()
  const [stagSyncStatus, setStagSyncStatus] = useState(derivedInitialStatus)

  // Keep stagSyncStatus in sync when the user object updates (e.g. after refreshUser)
  useEffect(() => {
    if (user?.stag_sync_status && user.stag_sync_status !== stagSyncStatus) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStagSyncStatus(user.stag_sync_status)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.stag_sync_status])

  // Poll stag_sync_status while it is 'pending', then invalidate React Query cache
  useEffect(() => {
    if (stagSyncStatus !== 'pending') return

    const interval = setInterval(async () => {
      const result = await api.getStagSyncStatus()

      // Stop polling on logout / token expiry
      if (result.error === 'unauthorized') {
        clearInterval(interval)
        return
      }

      if (result.status === 'success') {
        const newStatus = result.data?.stag_sync_status
        if (newStatus && newStatus !== 'pending') {
          setStagSyncStatus(newStatus)
          clearInterval(interval)

          // Invalidate React Query cache — data will reload automatically
          queryClient.invalidateQueries({ queryKey: ['subjects'] })
          queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] })
        }
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [stagSyncStatus, queryClient])

  const isLoading = summaryLoading || subjectsLoading
  const error = summaryError || subjectsError

  const reloadData = () => {
    refetchSummary()
    refetchSubjects()
  }

  const handleSubjectSelect = (subject) => {
    navigate(`/subjects/${subject.id}`)
  }

  const handleUploadClick = () => {
    navigate('/materials')
  }

  const handleViewSubject = (subjectId) => {
    navigate(`/subjects/${subjectId}`)
  }

  const handleOpenMaterials = () => {
    navigate('/materials')
  }

  const handleAddToCalendar = () => {
    navigate('/calendar')
  }

  // Merge summary subjects with plain subjects to ensure we have all required fields (like lecturer, completionType, score, points)
  const displaySubjects = useMemo(() => {
    const summarySubs = summary?.subjects || []
    const plainSubs = allSubjects || []

    const summaryHasScore = summarySubs.some((s) => s.score !== undefined && s.score !== null)
    if (summaryHasScore) {
      return summarySubs
    }

    return summarySubs.map((s) => {
      const matched = plainSubs.find((p) => p.id === s.id || p.code === s.code)
      return {
        ...matched,
        ...s,
        score: s.score ?? matched?.score ?? null,
        gainedPoints: s.gainedPoints ?? matched?.gainedPoints ?? matched?.gained_points ?? null,
        maxPoints: s.maxPoints ?? matched?.maxPoints ?? matched?.max_points ?? null,
      }
    })
  }, [summary?.subjects, allSubjects])

  const todayDeadlinesCount = useMemo(() => {
    return (summary?.todaySchedule || []).filter((e) => e.type !== 'Lecture').length
  }, [summary?.todaySchedule])

  if (isLoading) {
    return <PageState variant="loading" title={t('common:loading')} />
  }

  if (error) {
    return (
      <PageState
        variant="error"
        title={error}
        description={t('common:errorDescription')}
        actionLabel={t('common:tryAgain')}
        onAction={reloadData}
      />
    )
  }

  const isDataEmpty = !summary || (summary.todaySchedule.length === 0 && summary.needsAttention.length === 0 && displaySubjects.length === 0)

  if (isDataEmpty) {
    // Sync stále probíhá — zobraz loading místo "Žádná data"
    if (stagSyncStatus === 'pending') {
      return (
        <PageState
          variant="loading"
          title={t('common:syncingSchedule')}
          description={t('common:syncingDescription')}
        />
      )
    }

    // Sync selhal — zobraz chybu s možností přejít do profilu
    if (stagSyncStatus === 'failed') {
      return (
        <PageState
          variant="error"
          title={t('common:syncFailed')}
          description={t('common:syncFailedDescription')}
          actionLabel={t('common:goToProfile')}
          onAction={() => navigate('/profile')}
        />
      )
    }

    // Žádný sync neprobíhá — skutečně prázdný stav
    return (
      <PageState
        variant="empty"
        title={t('common:noData')}
        description={t('common:noDataDescription')}
      />
    )
  }

  return (
  <div className="flex flex-col gap-6 lg:grid lg:grid-cols-3">
    {/* Main feed (2/3) */}
    <div className="contents lg:flex lg:flex-col lg:gap-6 lg:col-span-2">
      {/* Greeting */}
      <div className="order-1 lg:order-none">
        <div className="flex flex-col gap-2">
          <h1 className="text-display text-on-surface">
            {t('dashboardPage.greeting', { name: user.name })}
          </h1>
          <div className="flex items-center gap-2 text-body-md text-on-surface-variant font-medium">
            <div className="w-5 h-5 bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center rounded-sm">
              <CustomIcon name="calendar" className="w-3.5 h-3.5" />
            </div>
            <span>
              <Trans
                t={t}
                i18nKey="dashboardPage.todayDeadlines"
                values={{ count: todayDeadlinesCount }}
                components={{ strong: <strong className="text-on-surface font-semibold" /> }}
              />
            </span>
          </div>
        </div>
      </div>

      <div className="order-3 lg:order-none">
        <NeedsAttention
          alerts={summary.needsAttention}
          subjects={allSubjects}
          onUploadClick={handleUploadClick}
          onViewSubject={handleViewSubject}
        />
      </div>

      <div className="order-2 lg:order-none">
        <NextUp
          nextClass={summary.nextClass}
          onOpenMaterials={handleOpenMaterials}
          onAddToCalendar={handleAddToCalendar}
        />
      </div>

      <div className="order-5 lg:order-none">
        <section className="flex flex-col gap-4 lg:gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-headline-md text-on-surface font-semibold">
              {t('dashboardPage.mySubjects')}
            </h2>
            <button
              onClick={() => navigate('/subjects')}
              className="text-label-md text-primary hover:underline font-semibold bg-transparent border-0 cursor-pointer"
            >
              {t('dashboardPage.viewAll')}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {displaySubjects.slice(0, 4).map((sub) => (
              <SubjectMiniCard
                key={sub.id}
                subject={sub}
                onSelect={handleSubjectSelect}
              />
            ))}
          </div>
        </section>
      </div>
    </div>

    {/* Context & progress sidebar (1/3) */}
<div className="contents lg:flex lg:flex-col lg:gap-6 lg:col-span-1 lg:sticky lg:top-6 lg:self-start">
  <div className="order-4 lg:order-none">
    <TodaySchedule schedule={summary.todaySchedule} />
  </div>
  <div className="order-6 lg:order-none">
    <QuickProgress progress={summary.progress} />
    </div>
  </div>
</div>
)
}

export default DashboardPage
