import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { CreateIncidentModal } from './components/incidents/CreateIncidentModal';
import { Dashboard } from './pages/Dashboard';
import { Incidents } from './pages/Incidents';
import { IncidentDetail } from './pages/IncidentDetail';
import { Runbooks } from './pages/Runbooks';
import { Cluster } from './pages/Cluster';
import { AuditLog } from './pages/AuditLog';
import { Settings } from './pages/Settings';
import { fetchClusterStatus } from './api/client';

export const AppContent: React.FC = () => {
  const [clusterConnected, setClusterConnected] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  const checkCluster = async () => {
    try {
      const res = await fetchClusterStatus();
      setClusterConnected(res.connected);
    } catch {
      setClusterConnected(false);
    }
  };

  useEffect(() => {
    checkCluster();
    const interval = setInterval(checkCluster, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleCreated = (id: string) => {
    navigate(`/incidents/${id}`);
  };

  return (
    <div className="flex min-h-screen bg-[#0B0F17] text-[#F1F5F9]">
      <Sidebar clusterConnected={clusterConnected} />

      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <Header
          title="Opsara SRE Control Plane"
          subtitle="Agentic Kubernetes Incident Response & Safe Runbook Execution"
          onOpenCreateModal={() => setIsModalOpen(true)}
        />

        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/incidents" element={<Incidents onOpenCreateModal={() => setIsModalOpen(true)} />} />
            <Route path="/incidents/:id" element={<IncidentDetail />} />
            <Route path="/runbooks" element={<Runbooks />} />
            <Route path="/cluster" element={<Cluster />} />
            <Route path="/audit" element={<AuditLog />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>

      <CreateIncidentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
