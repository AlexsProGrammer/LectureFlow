import { createBrowserRouter } from 'react-router-dom'
import { PublicLayout } from '../layouts/PublicLayout'
import { AdminLayout } from '../layouts/AdminLayout'
import { AdminGuard } from '../components/AdminGuard'
import { LobbyPage } from '../pages/LobbyPage'
import { LiveRoomPage } from '../features/room/LiveRoomPage'
import { AdminLoginPage } from '../pages/AdminLoginPage'
import { AdminDashboardPage } from '../pages/AdminDashboardPage'
import { AdminSetupPage } from '../pages/AdminSetupPage'
import { QuizList } from '../features/admin/QuizList'
import { QuizEditor } from '../features/admin/QuizEditor'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      {
        index: true,
        element: <LobbyPage />,
      },
      {
        path: 'room/:code',
        element: <LiveRoomPage />,
      },
    ],
  },
  {
    element: <AdminGuard />,
    children: [
      {
        path: '/admin/login',
        element: <AdminLoginPage />,
      },
      {
        path: '/admin/setup',
        element: <AdminSetupPage />,
      },
      {
        path: '/admin',
        element: <AdminLayout />,
        children: [
          {
            index: true,
            element: <AdminDashboardPage />,
          },
          {
            path: 'quizzes',
            element: <QuizList />,
          },
          {
            path: 'quizzes/new',
            element: <QuizEditor />,
          },
          {
            path: 'quizzes/:quizId/edit',
            element: <QuizEditor />,
          },
        ],
      },
    ],
  },
])
