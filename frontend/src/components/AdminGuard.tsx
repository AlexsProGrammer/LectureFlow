import { useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useSetupStore } from '../store/useSetupStore'

export function AdminGuard() {
  const navigate = useNavigate()
  const location = useLocation()
  const { hasSuperAdmin, checkStatus } = useSetupStore()

  useEffect(() => {
    checkStatus()
  }, [checkStatus])

  if (hasSuperAdmin === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  if (hasSuperAdmin === false && location.pathname !== '/admin/setup') {
    navigate('/admin/setup', { replace: true })
    return null
  }

  if (hasSuperAdmin === true && location.pathname === '/admin/setup') {
    navigate('/admin/login', { replace: true })
    return null
  }

  return <Outlet />
}
