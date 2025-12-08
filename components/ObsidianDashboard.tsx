import React from 'react';

const ObsidianDashboard: React.FC = () => {
  const telemetryLogs = [
    { timestamp: '10:42:01', level: 'INFO', message: 'REVENUE-WATCHER-DELTA-0: Heartbeat received.' },
    { timestamp: '10:42:05', level: 'SUCCESS', message: 'Harmonic Codex Gate 4: PASSED. Integrity verified.' },
    { timestamp: '10:42:12', level: 'INFO', message: 'Ingesting live yield data stream...' },
    { timestamp: '10:42:15', level: 'SUCCESS', message: 'Total Net Yield updated: $1,240,500.00' },
    { timestamp: '10:42:18', level: 'INFO', message: 'R/A Harmonic Ratio calculation: 1.618 (Stable).' },
    { timestamp: '10:42:25', level: 'SECURE', message: 'Bearer Token authentication validated for endpoint /api/v1/telemetry.' },
    { timestamp: '10:42:30', level: 'INFO', message: 'Glass Break Protocol monitoring: ACTIVE. No anomalies detected.' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 text-white p-6 rounded-lg shadow-xl border border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-wider text-green-400">OBSIDIAN Φ-CORE</h2>
            <p className="text-sm text-gray-400 font-mono">LIVE TELEMETRY // HARMONIC-NEXUS-PROD</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-green-400 font-mono text-sm font-bold">SYSTEM ONLINE</span>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Net Yield */}
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 hover:border-green-500 transition-colors duration-300">
            <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Total Net Yield</p>
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-bold text-white">$1,240,500.00</span>
            </div>
            <p className="text-xs text-green-400 mt-2 flex items-center">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
              High-Growth Trajectory
            </p>
          </div>

          {/* R/A Harmonic Ratio */}
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 hover:border-yellow-500 transition-colors duration-300">
            <p className="text-xs text-gray-400 uppercase font-semibold mb-1">R/A Harmonic Ratio</p>
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-bold text-yellow-400">1.618</span>
              <span className="text-sm text-gray-400">Φ</span>
            </div>
            <p className="text-xs text-yellow-400 mt-2">Structural Fidelity VERIFIED</p>
          </div>

          {/* Minimal Input Cost */}
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 hover:border-blue-500 transition-colors duration-300">
            <p className="text-xs text-gray-400 uppercase font-semibold mb-1">OpEx (Input Cost)</p>
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-bold text-blue-400">$4.50</span>
              <span className="text-sm text-gray-400">/ Day</span>
            </div>
            <p className="text-xs text-blue-400 mt-2">Scale-to-Zero Efficiency</p>
          </div>

          {/* Security Posture */}
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 hover:border-purple-500 transition-colors duration-300">
            <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Security Posture</p>
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-bold text-purple-400">HARDENED</span>
            </div>
            <p className="text-xs text-purple-400 mt-2 flex items-center">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
              Auth & Monitoring Active
            </p>
          </div>
        </div>

        {/* Live Logs */}
        <div className="bg-black rounded border border-gray-800 p-4 font-mono text-xs h-64 overflow-y-auto">
          <p className="text-gray-500 mb-2 border-b border-gray-800 pb-1">:: SYSTEM LOGSTREAM ::</p>
          {telemetryLogs.map((log, idx) => (
            <div key={idx} className="mb-1">
              <span className="text-gray-500">[{log.timestamp}]</span>
              <span className={`mx-2 font-bold ${
                log.level === 'INFO' ? 'text-blue-400' :
                log.level === 'SUCCESS' ? 'text-green-400' :
                log.level === 'SECURE' ? 'text-purple-400' : 'text-gray-400'
              }`}>
                {log.level}
              </span>
              <span className="text-gray-300">{log.message}</span>
            </div>
          ))}
          <div className="mt-2 animate-pulse text-green-500">_</div>
        </div>
      </div>
    </div>
  );
};

export default ObsidianDashboard;