import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Home } from '../features/public/Home';
import { Callback } from '../features/public/Callback';
import { ProtectedRoute } from './ProtectedRoute';
import { AppLayout } from '../components/custom/layout/AppLayout';
import { DashboardPlaceholder } from '../features/portal/DashboardPlaceholder';
import { ProjectsPlaceholder } from '../features/portal/ProjectsPlaceholder';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/callback',
    element: <Callback />,
  },
  {
    path: '/app',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/app/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardPlaceholder />,
      },
      {
        path: 'projetos',
        element: <ProjectsPlaceholder />,
      },
      {
        path: '*',
        element: <Navigate to="/app/dashboard" replace />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
