import React from 'react';

const StatsWidget = ({ title, value, icon }) => {
  return (
    <div className="stats-widget">
      <div className="stats-icon">{icon}</div>
      <div className="stats-content">
        <h3>{title}</h3>
        <p>{value}</p>
      </div>
    </div>
  );
};

export default StatsWidget;