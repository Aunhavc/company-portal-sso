import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { Announcement, AnnouncementCategoryEntry, AppEntry } from '../lib/types'

interface AsyncState<T> {
  data: T
  loading: boolean
  error: string | null
}

function useAsyncList<T>(loader: () => Promise<T[]>) {
  const [state, setState] = useState<AsyncState<T[]>>({ data: [], loading: true, error: null })

  const reload = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await loader()
      setState({ data, loading: false, error: null })
    } catch (e) {
      setState({ data: [], loading: false, error: e instanceof Error ? e.message : String(e) })
    }
  }, [loader])

  useEffect(() => {
    void reload()
  }, [reload])

  return { ...state, reload }
}

export function useApps() {
  return useAsyncList<AppEntry>(useCallback(() => api.listApps(), []))
}

export function useAllApps() {
  return useAsyncList<AppEntry>(useCallback(() => api.listAllApps(), []))
}

export function useAnnouncements() {
  return useAsyncList<Announcement>(useCallback(() => api.listAnnouncements(), []))
}

export function useAllAnnouncements() {
  return useAsyncList<Announcement>(useCallback(() => api.listAllAnnouncements(), []))
}

export function useAnnouncementCategories() {
  return useAsyncList<AnnouncementCategoryEntry>(
    useCallback(() => api.listAnnouncementCategories(), []),
  )
}
