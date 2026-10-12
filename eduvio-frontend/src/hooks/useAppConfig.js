/**
 * src/hooks/useAppConfig.js
 *
 * Public settings of the backend (GET /api/config), loaded before login.
 *
 *   registrationEnabled  false only when the backend says so (unknown → the form
 *                        stays; the backend refuses a closed registration anyway)
 *   allowedDomains       e-mail domains allowed to register ([] = any)
 */

import { useQuery } from '@tanstack/react-query'
import * as api from '../services/api'

export const APP_CONFIG_KEY = 'appConfig'

export const useAppConfig = () => {
  const query = useQuery({
    queryKey: [APP_CONFIG_KEY],
    queryFn: () => api.getAppConfig().then((result) => {
      if (result.status === 'error') throw new Error(result.error)
      return result.data
    }),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const registration = query.data?.registration
  return {
    isLoading: query.isLoading,
    registrationEnabled: registration?.enabled !== false,
    allowedDomains: registration?.allowed_domains ?? [],
  }
}
