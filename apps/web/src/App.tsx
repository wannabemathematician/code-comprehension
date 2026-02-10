import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import AppLayout from './components/Layout/AppLayout';
import Home from './routes/Home';
import Login from './routes/Login';
import Challenges from './routes/Challenges';

const ChallengeDetail = lazy(() => import('./routes/ChallengeDetail'));

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="challenges">
          <Route index element={<Challenges />} />
          <Route
            path=":id"
            element={
              <Suspense fallback={<div className="p-4 text-slate-400">Loading challenge…</div>}>
                <ChallengeDetail />
              </Suspense>
            }
          />
        </Route>
      </Route>
    </Routes>
  );
}
