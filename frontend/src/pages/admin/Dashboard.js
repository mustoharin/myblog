import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminHeader from '../../components/admin/AdminHeader';
import AdminSidebar from '../../components/admin/AdminSidebar';
import StatsWidget from '../../components/admin/StatsWidget';
import RecentPosts from '../../components/admin/RecentPosts';
import RecentComments from '../../components/admin/RecentComments';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalUsers: 0,
    totalComments: 0,
    recentPosts: [],
    recentComments: []
  });

  useEffect(() => {
    // Fetch dashboard stats
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/stats', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="admin-dashboard">
      <AdminHeader />
      <div className="dashboard-container">
        <AdminSidebar />
        <main className="dashboard-content">
          <h1>Dashboard</h1>
          
          <div className="stats-grid">
            <StatsWidget
              title="Total Posts"
              value={stats.totalPosts}
              icon="📝"
            />
            <StatsWidget
              title="Total Users"
              value={stats.totalUsers}
              icon="👥"
            />
            <StatsWidget
              title="Total Comments"
              value={stats.totalComments}
              icon="💬"
            />
          </div>

          <div className="dashboard-widgets">
            <RecentPosts posts={stats.recentPosts} />
            <RecentComments comments={stats.recentComments} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;