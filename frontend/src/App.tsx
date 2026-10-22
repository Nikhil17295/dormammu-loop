import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { FlowListPage } from './pages/FlowListPage';
import { FlowEditorPage } from './pages/FlowEditorPage';
import { HomePage } from './pages/HomePage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<FlowListPage />} />
        <Route path="/flows/new" element={<FlowEditorPage />} />
        <Route path="/flows/:id" element={<FlowEditorPage />} />
        <Route path="/health" element={<HomePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
