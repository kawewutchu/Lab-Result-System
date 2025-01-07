import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import StaffLogin from './components/StaffLogin';
import { ResultsList } from './components/lab-results';
import UploadForm from './components/UploadForm';
import PatientSearch from './components/PatientSearch';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/staff/login" element={<StaffLogin />} />
        <Route
          path="/staff/upload"
          element={
            <ProtectedRoute>
              <UploadForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff/results"
          element={
            <ProtectedRoute>
              <ResultsList />
            </ProtectedRoute>
          }
        />
        <Route path="/search" element={<PatientSearch />} />
        <Route path="/" element={<Navigate to="/search" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;