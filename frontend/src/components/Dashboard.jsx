import { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Adjusted status colors to look good in both light and dark modes
const statusColors = {
  available: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  reserved: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  in_use: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  maintenance: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  decommissioned: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
};

export default function Dashboard({ user, onLogout }) {
  const [resources, setResources] = useState([]);
  const [selectedResource, setSelectedResource] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState(null);
  
  // Analytics State
  const [analyticsData, setAnalyticsData] = useState(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');

  // Fetch Live Resources
  useEffect(() => {
    fetch('/api/resources', {
      headers: { 'Authorization': `Bearer ${user.token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data)) {
        setResources(data);
      } else {
        console.error("Fetch Error:", data);
        setResources([]);
      }
    })
    .catch(console.error);
  }, [user.token]);

  // Handle AI Forecasting
  const handlePredict = async (category_name) => {
    if (!category_name) return;
    setIsLoadingAnalytics(true);
    setAnalyticsData(null);
    try {
      const res = await fetch(`/api/analytics/forecast?category_name=${encodeURIComponent(category_name)}`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      const data = await res.json();
      
      if (data && data.forecast) {
        setAnalyticsData({
          message: data.message,
          warnings: data.crunch_warnings,
          chart: {
            labels: data.forecast.map(f => f.time),
            datasets: [{
              label: `Predicted Demand (${category_name})`,
              data: data.forecast.map(f => f.predicted_demand),
              borderColor: 'rgb(59, 130, 246)',
              backgroundColor: 'rgba(59, 130, 246, 0.5)',
              tension: 0.3,
              pointBackgroundColor: data.forecast.map(f => f.fest_day ? 'red' : 'rgb(59, 130, 246)'),
              pointRadius: data.forecast.map(f => f.fest_day ? 6 : 3)
            }]
          }
        });
      }
    } catch (e) {
      console.error(e);
      setToast("Failed to fetch AI predictions");
      setTimeout(() => setToast(null), 3000);
    }
    setIsLoadingAnalytics(false);
  };
  
  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Apply the dark class to the HTML document when toggled
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const today = new Date().toISOString().slice(0, 16);

  const filteredResources = resources.filter(r => 
    r.resource_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleBookSubmit = (e) => {
    e.preventDefault();
    setResources(resources.map(r => 
      r.resource_id === selectedResource.resource_id 
        ? { ...r, status: 'reserved' } 
        : r
    ));
    setToast(`Successfully requested: ${selectedResource.resource_name}`);
    setTimeout(() => setToast(null), 3000); 
    setSelectedResource(null);
  };

  return (
    <div className="min-h-screen p-8 transition-colors duration-200 bg-gray-50 dark:bg-gray-950 relative">
      
      {/* Header */}
      <div className="flex flex-col gap-6 mb-8 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-gray-800 dark:text-white">
          Resource Dashboard
        </h1>
        
        <div className="flex items-center gap-4">
          
          {/* Dark Mode Toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 text-gray-500 transition-colors bg-gray-200 rounded-lg dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            aria-label="Toggle Dark Mode"
          >
            {isDarkMode ? (
              // Sun Icon
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              // Moon Icon
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          <div className="flex items-center gap-3 pr-4 border-r border-gray-200 dark:border-gray-800">
            <span className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-100 rounded-full shadow-sm dark:bg-indigo-900/50 dark:text-indigo-300">
              {user.role_name}
            </span>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {user.email}
            </span>
          </div>
          <button 
            onClick={onLogout}
            className="px-4 py-2 text-sm font-medium text-red-600 transition-colors bg-red-50 rounded-lg dark:bg-red-900/20 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 focus:outline-none focus:ring-2 focus:ring-red-500/50"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Search Bar Container */}
      <div className="mb-8">
        <div className="relative max-w-md">
          <input 
            type="text" 
            placeholder="Search resources..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2.5 pl-10 text-sm transition-colors border border-gray-300 rounded-xl bg-white shadow-sm dark:bg-gray-900 dark:border-gray-800 dark:text-white dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
          />
          <svg className="absolute left-3.5 top-3 w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </div>
      </div>

      {/* AI Analytics Panel */}
      <div className="p-6 mb-8 bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-gray-900 dark:border-gray-800">
        <h2 className="flex items-center gap-2 mb-4 text-xl font-bold text-gray-900 dark:text-white">
          <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          Smart Clerk Predictive Analytics
        </h2>
        <div className="flex flex-col gap-4 mb-4 sm:flex-row">
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2.5 text-sm transition-colors border border-gray-300 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="">Select a Category...</option>
            <option value="Electronics">Electronics</option>
            <option value="Auditoriums">Auditoriums</option>
            <option value="Rooms">Rooms</option>
            <option value="Sports Equipment">Sports Equipment</option>
          </select>
          <button 
            onClick={() => handlePredict(selectedCategory)}
            disabled={!selectedCategory || isLoadingAnalytics}
            className="px-6 py-2.5 text-sm font-semibold text-white transition-all bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-800 disabled:text-gray-500 hover:shadow-lg hover:shadow-indigo-600/20 active:scale-[0.98] focus:outline-none"
          >
            {isLoadingAnalytics ? 'Forecasting...' : 'Run SARIMAX Forecast'}
          </button>
        </div>
        
        {analyticsData && (
          <div className="mt-6 animate-fade-in-up">
            <div className={`p-4 mb-6 text-sm font-medium rounded-lg border ${analyticsData.warnings?.length > 0 ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400' : 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-900/50 dark:text-green-400'}`}>
              <strong className="tracking-wide uppercase">AI Insight:</strong> {analyticsData.message}
            </div>
            <div className="h-64 p-4 border border-gray-100 rounded-lg dark:border-gray-800">
              <Line 
                data={analyticsData.chart} 
                options={{ 
                  responsive: true, 
                  maintainAspectRatio: false,
                  plugins: { legend: { labels: { color: isDarkMode ? '#e5e7eb' : '#374151' } } },
                  scales: { 
                    x: { ticks: { color: isDarkMode ? '#9ca3af' : '#6b7280' }, grid: { color: isDarkMode ? '#374151' : '#e5e7eb' } },
                    y: { ticks: { color: isDarkMode ? '#9ca3af' : '#6b7280' }, grid: { color: isDarkMode ? '#374151' : '#e5e7eb' } }
                  }
                }} 
              />
            </div>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredResources.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-500 bg-white border border-dashed border-gray-300 rounded-xl dark:bg-gray-900 dark:border-gray-800 dark:text-gray-400">
            No resources found matching "{searchTerm}"
          </div>
        ) : (
          filteredResources.map((resource) => (
            <div key={resource.resource_id} className="p-6 transition-all bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-gray-900 dark:border-gray-800 hover:shadow-md dark:hover:border-gray-700">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{resource.resource_name}</h3>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold tracking-wide ${statusColors[resource.status]}`}>
                  {resource.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <div className="space-y-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                <p className="flex justify-between"><span>ID:</span> <span className="text-gray-900 dark:text-gray-200">#{resource.resource_id}</span></p>
                <p className="flex justify-between"><span>Rate:</span> <span className="text-gray-900 dark:text-gray-200">₹{resource.hourly_rate}/hr</span></p>
                <p className="flex justify-between"><span>Type:</span> <span className="text-gray-900 dark:text-gray-200">{resource.is_fixed_asset ? 'Fixed Asset' : 'Movable'}</span></p>
              </div>
              <button 
                onClick={() => setSelectedResource(resource)}
                className="w-full mt-6 px-4 py-2.5 text-sm font-semibold text-white transition-all bg-gray-900 rounded-lg dark:bg-blue-600 disabled:bg-gray-200 disabled:text-gray-400 dark:disabled:bg-gray-800 dark:disabled:text-gray-600 disabled:cursor-not-allowed active:scale-[0.98] hover:bg-gray-800 dark:hover:bg-blue-700"
                disabled={resource.status !== 'available'}
              >
                {resource.status === 'available' ? 'Book Resource' : 'Unavailable'}
              </button>
            </div>
          ))
        )}
      </div>

      {/* Booking Modal Overlay */}
      {selectedResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md transition-all">
          <div className="w-full max-w-md p-8 bg-white border border-gray-100 rounded-2xl shadow-2xl dark:bg-gray-900 dark:border-gray-800">
            
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Book Resource</h2>
              <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                {selectedResource.resource_name}
              </p>
            </div>
            
            <form onSubmit={handleBookSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300">Start Time</label>
                  <input 
                    type="datetime-local" 
                    min={today}
                    required 
                    className="w-full px-3 py-2.5 text-sm transition-colors border border-gray-300 rounded-lg bg-gray-50 dark:bg-gray-950 dark:border-gray-700 dark:text-white dark:color-scheme-dark focus:bg-white dark:focus:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500" 
                  />
                </div>
                <div>
                  <label className="block mb-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300">End Time</label>
                  <input 
                    type="datetime-local" 
                    min={today}
                    required 
                    className="w-full px-3 py-2.5 text-sm transition-colors border border-gray-300 rounded-lg bg-gray-50 dark:bg-gray-950 dark:border-gray-700 dark:text-white dark:color-scheme-dark focus:bg-white dark:focus:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500" 
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300">Purpose</label>
                <textarea 
                  required 
                  rows="3" 
                  className="w-full px-4 py-3 text-sm transition-colors border border-gray-300 rounded-lg resize-none bg-gray-50 dark:bg-gray-950 dark:border-gray-700 dark:text-white focus:bg-white dark:focus:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500" 
                  placeholder="Briefly explain your requirement..."
                ></textarea>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setSelectedResource(null)}
                  className="w-1/2 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors bg-white border border-gray-300 rounded-xl dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="w-1/2 px-4 py-2.5 text-sm font-semibold text-white transition-all bg-blue-600 rounded-xl hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  Confirm Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-6 py-4 text-white bg-gray-900 rounded-xl shadow-2xl animate-fade-in-up dark:bg-gray-800 dark:border dark:border-gray-700">
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <span className="text-sm font-medium">{toast}</span>
        </div>
      )}

    </div>
  );
}