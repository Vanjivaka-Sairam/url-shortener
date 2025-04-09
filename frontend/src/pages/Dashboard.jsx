import { useState, useEffect } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const API_URL = import.meta.env.VITE_API_URL;

function Dashboard() {
  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUrl, setSelectedUrl] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedUrls, setSelectedUrls] = useState(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    fetchUrls();
  }, [token]); // Re-fetch when token changes

  const fetchUrls = async () => {
    try {
      const response = await fetch(`${API_URL}/api/urls`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch URLs');
      }
      
      setUrls(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (url) => {
    navigator.clipboard.writeText(url);
  };

  const handleShowQR = (e, url) => {
    e.stopPropagation();
    setQrUrl(url);
    setShowQRModal(true);
  };

  const downloadQRCode = () => {
    // Get the SVG element
    const svg = document.getElementById('qr-code');
    if (!svg) return;

    // Create a canvas element
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Create an image element
    const img = new Image();
    
    // Convert SVG to data URL
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    
    img.onload = () => {
      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw image on canvas
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
      // Convert to PNG and download
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = 'qr-code.png';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      // Clean up
      URL.revokeObjectURL(svgUrl);
    };
    
    img.src = svgUrl;
  };

  const handleDelete = async (e, shortId) => {
    e.stopPropagation(); // Prevent row selection when clicking delete
    
    if (!window.confirm('Are you sure you want to delete this URL?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/url/${shortId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete URL');
      }

      // Remove the deleted URL from state
      setUrls(urls.filter(url => url.id !== shortId));
      if (selectedUrl?.id === shortId) {
        setSelectedUrl(null);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleStatus = async (e, shortId, currentStatus) => {
    e.stopPropagation(); // Prevent row selection when clicking toggle
    
    const action = currentStatus ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} this URL?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/url/${shortId}/toggle`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${action} URL`);
      }

      // Update the URL status in state
      setUrls(urls.map(url => {
        if (url.id === shortId) {
          return { ...url, isActive: !url.isActive };
        }
        return url;
      }));

      // Update selected URL if it's the one being toggled
      if (selectedUrl?.id === shortId) {
        setSelectedUrl(prev => ({ ...prev, isActive: !prev.isActive }));
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const getStatusBadge = (isActive, expiresAt) => {
    if (!isActive) {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Expired</span>;
    }
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Expiring Soon</span>;
    }
    return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Active</span>;
  };

  const prepareClicksOverTimeData = (clicksOverTime) => {
    const dates = Object.keys(clicksOverTime).sort();
    const today = new Date();
    const last7Days = [...Array(7)].map((_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    return {
      labels: last7Days,
      datasets: [
        {
          label: 'Clicks',
          data: last7Days.map(date => clicksOverTime[date] || 0),
          borderColor: 'rgb(99, 102, 241)',
          backgroundColor: 'rgba(99, 102, 241, 0.5)',
          tension: 0.1,
          fill: true
        }
      ]
    };
  };

  const prepareDeviceData = (deviceStats) => {
    return {
      labels: Object.keys(deviceStats),
      datasets: [
        {
          label: 'Devices',
          data: Object.values(deviceStats),
          backgroundColor: [
            'rgba(99, 102, 241, 0.7)',
            'rgba(59, 130, 246, 0.7)',
            'rgba(16, 185, 129, 0.7)'
          ],
          borderWidth: 1
        }
      ]
    };
  };

  const filteredUrls = urls.filter(url => {
    const matchesSearch = url.originalUrl.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         url.shortUrl.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' ||
                         (filterStatus === 'active' && url.isActive) ||
                         (filterStatus === 'expired' && !url.isActive);
    
    return matchesSearch && matchesFilter;
  });

  const handleUrlClick = (url) => {
    setSelectedUrl(url);
    setShowAnalytics(true);
  };

  const handleCloseAnalytics = () => {
    setShowAnalytics(false);
    setSelectedUrl(null);
  };

  const handleBulkSelect = (e) => {
    if (e.target.checked) {
      setSelectedUrls(new Set(filteredUrls.map(url => url.id)));
    } else {
      setSelectedUrls(new Set());
    }
  };

  const handleUrlSelect = (e, urlId) => {
    e.stopPropagation();
    const newSelectedUrls = new Set(selectedUrls);
    if (newSelectedUrls.has(urlId)) {
      newSelectedUrls.delete(urlId);
    } else {
      newSelectedUrls.add(urlId);
    }
    setSelectedUrls(newSelectedUrls);
  };

  const handleBulkAction = async (action) => {
    if (selectedUrls.size === 0) {
      alert('Please select at least one URL');
      return;
    }

    const confirmMessage = {
      delete: 'Are you sure you want to delete the selected URLs?',
      activate: 'Are you sure you want to activate the selected URLs?',
      deactivate: 'Are you sure you want to deactivate the selected URLs?'
    }[action];

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setError('');
    setBulkActionLoading(true);
    try {
      const selectedUrlObjects = urls.filter(url => selectedUrls.has(url.id));
      const urlsToProcess = selectedUrlObjects.filter(url => {
        if (action === 'activate') return !url.isActive;
        if (action === 'deactivate') return url.isActive;
        return true; // for delete action
      });

      if (urlsToProcess.length === 0) {
        setError(`No URLs need to be ${action}d`);
        setBulkActionLoading(false);
        return;
      }

      const results = await Promise.all(urlsToProcess.map(async url => {
        try {
          let response;
          if (action === 'delete') {
            response = await fetch(`${API_URL}/api/url/${url.id}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
          } else {
            response = await fetch(`${API_URL}/api/url/${url.id}/toggle`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
          }

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || `Failed to ${action} URL ${url.id}`);
          }

          return { success: true, urlId: url.id };
        } catch (error) {
          return { success: false, urlId: url.id, error: error.message };
        }
      }));

      // Check for any failures
      const failures = results.filter(result => !result.success);
      if (failures.length > 0) {
        setError(`Failed to process some URLs: ${failures.map(f => f.error).join(', ')}`);
      } else {
        // Show success message
        const successCount = results.filter(r => r.success).length;
        setError(`Successfully ${action}d ${successCount} URL${successCount !== 1 ? 's' : ''}`);
      }

      setSelectedUrls(new Set());
      await fetchUrls(); // Refresh the URL list
    } catch (err) {
      setError(`Operation failed: ${err.message}`);
    } finally {
      setBulkActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-md">
        {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">Dashboard</h1>
        
        {/* Search and Filter Section */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search URLs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="w-full sm:w-48">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Links</option>
              <option value="active">Active Links</option>
              <option value="expired">Expired Links</option>
            </select>
          </div>
        </div>

        {showAnalytics ? (
          <div className="bg-white shadow-sm rounded-lg p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-semibold truncate">Analytics for {selectedUrl.shortUrl}</h2>
              <button
                onClick={handleCloseAnalytics}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Clicks Over Time Chart */}
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <h3 className="text-base sm:text-lg font-medium mb-3 sm:mb-4">Clicks Over Time</h3>
                <div className="h-64 sm:h-80">
                  <Line 
                    data={prepareClicksOverTimeData(selectedUrl.clicksOverTime)}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'top',
                        },
                        title: {
                          display: true,
                          text: 'Last 7 Days'
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            stepSize: 1
                          }
                        }
                      }
                    }}
                  />
                </div>
              </div>

              {/* Device Distribution Chart */}
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <h3 className="text-base sm:text-lg font-medium mb-3 sm:mb-4">Device Distribution</h3>
                <div className="h-64 sm:h-80">
                  <Bar 
                    data={prepareDeviceData(selectedUrl.deviceStats)}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            stepSize: 1
                          }
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Browser Stats */}
            <div className="mt-4 sm:mt-6">
              <h3 className="text-base sm:text-lg font-medium mb-3 sm:mb-4">Browser Distribution</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {Object.entries(selectedUrl.browserStats).map(([browser, count]) => (
                  <div key={browser} className="bg-gray-50 p-3 sm:p-4 rounded-lg text-center">
                    <div className="text-sm font-medium text-gray-600 mb-1 truncate">{browser}</div>
                    <div className="text-2xl sm:text-3xl font-bold text-indigo-600">{count}</div>
                    <div className="text-xs text-gray-500 mt-1">visits</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-8">
            {/* Bulk Actions Section */}
            {selectedUrls.size > 0 && (
              <div className="bg-white shadow-sm rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
                  <span className="text-gray-700">
                    {selectedUrls.size} URL{selectedUrls.size !== 1 ? 's' : ''} selected
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleBulkAction('activate')}
                      disabled={bulkActionLoading}
                      className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm disabled:opacity-50"
                    >
                      {bulkActionLoading ? 'Processing...' : 'Activate Selected'}
                    </button>
                    <button
                      onClick={() => handleBulkAction('deactivate')}
                      disabled={bulkActionLoading}
                      className="px-3 sm:px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-sm disabled:opacity-50"
                    >
                      {bulkActionLoading ? 'Processing...' : 'Deactivate Selected'}
                    </button>
                    <button
                      onClick={() => handleBulkAction('delete')}
                      disabled={bulkActionLoading}
                      className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm disabled:opacity-50"
                    >
                      {bulkActionLoading ? 'Processing...' : 'Delete Selected'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* URLs Table */}
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectedUrls.size === filteredUrls.length}
                          onChange={handleBulkSelect}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Original URL
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Short URL
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Clicks
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUrls.map((url) => (
                      <tr 
                        key={url.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleUrlClick(url)}
                      >
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedUrls.has(url.id)}
                            onChange={(e) => handleUrlSelect(e, url.id)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="px-3 sm:px-6 py-4">
                          <div className="text-sm text-gray-900 truncate max-w-[150px] sm:max-w-xs">
                            {url.originalUrl}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-indigo-600 truncate max-w-[100px] sm:max-w-none">
                            {url.shortUrl}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{url.clicks}</div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(url.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(url.isActive, url.expiresAt)}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap min-w-[200px]">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(url.shortUrl);
                              }}
                              className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                            >
                              Copy
                            </button>
                            <button
                              onClick={(e) => handleShowQR(e, url.shortUrl)}
                              className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                            >
                              QR Code
                            </button>
                            <button
                              onClick={(e) => handleToggleStatus(e, url.id, url.isActive)}
                              className={`${
                                url.isActive 
                                  ? 'text-yellow-600 hover:text-yellow-900' 
                                  : 'text-green-600 hover:text-green-900'
                              } text-sm font-medium`}
                            >
                              {url.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={(e) => handleDelete(e, url.id)}
                              className="text-red-600 hover:text-red-900 text-sm font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* QR Code Modal */}
        {showQRModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-4 sm:top-20 mx-auto p-4 sm:p-5 border w-[90%] sm:w-96 shadow-lg rounded-md bg-white">
              <div className="flex flex-col items-center">
                <h3 className="text-lg font-medium mb-3 sm:mb-4">QR Code for Short URL</h3>
                <div className="bg-white p-3 sm:p-4 rounded-lg shadow-inner">
                  <QRCodeSVG
                    id="qr-code"
                    value={qrUrl}
                    size={256}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <div className="mt-3 sm:mt-4 space-x-2 sm:space-x-3">
                  <button
                    onClick={downloadQRCode}
                    className="bg-indigo-600 text-white px-3 sm:px-4 py-2 rounded-md hover:bg-indigo-700 text-sm"
                  >
                    Download QR Code
                  </button>
                  <button
                    onClick={() => setShowQRModal(false)}
                    className="bg-gray-200 text-gray-800 px-3 sm:px-4 py-2 rounded-md hover:bg-gray-300 text-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard; 