import { useState, useEffect } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { QRCodeSVG } from 'qrcode.react';
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

function Dashboard() {
  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUrl, setSelectedUrl] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    fetchUrls();
  }, []);

  const fetchUrls = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/urls');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch URLs');
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
    const canvas = document.getElementById('qr-code-canvas');
    if (canvas) {
      const pngUrl = canvas
        .toDataURL('image/png')
        .replace('image/png', 'image/octet-stream');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = 'qr-code.png';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  const handleDelete = async (e, shortId) => {
    e.stopPropagation(); // Prevent row selection when clicking delete
    
    if (!window.confirm('Are you sure you want to delete this URL?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/url/${shortId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete URL');
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
      const response = await fetch(`http://localhost:3000/api/url/${shortId}/toggle`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || `Failed to ${action} URL`);
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
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">URL Analytics Dashboard</h1>
        <p className="text-gray-600 mt-2">Track and analyze your shortened URLs</p>
      </div>

      {urls.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No URLs shortened yet</p>
          <a
            href="/"
            className="mt-4 inline-block text-indigo-600 hover:text-indigo-700"
          >
            Create your first short URL
          </a>
        </div>
      ) : (
        <div className="space-y-8">
          {/* URLs Table */}
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Original URL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Short URL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Clicks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {urls.map((url) => (
                  <tr 
                    key={url.id}
                    className={`cursor-pointer hover:bg-gray-50 ${selectedUrl?.id === url.id ? 'bg-indigo-50' : ''}`}
                    onClick={() => setSelectedUrl(url)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 truncate max-w-xs">
                        {url.originalUrl}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-indigo-600">{url.shortUrl}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{url.clicks}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(url.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(url.isActive, url.expiresAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-4">
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

          {/* Analytics Section */}
          {selectedUrl && (
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Analytics for {selectedUrl.shortUrl}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Clicks Over Time Chart */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-4">Clicks Over Time</h3>
                  <Line 
                    data={prepareClicksOverTimeData(selectedUrl.clicksOverTime)}
                    options={{
                      responsive: true,
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

                {/* Device Distribution Chart */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-4">Device Distribution</h3>
                  <Bar 
                    data={prepareDeviceData(selectedUrl.deviceStats)}
                    options={{
                      responsive: true,
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

              {/* Browser Stats */}
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-4">Browser Distribution</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(selectedUrl.browserStats).map(([browser, count]) => (
                    <div key={browser} className="bg-gray-50 p-4 rounded-lg text-center">
                      <div className="text-sm font-medium text-gray-600 mb-1">{browser}</div>
                      <div className="text-3xl font-bold text-indigo-600">{count}</div>
                      <div className="text-xs text-gray-500 mt-1">visits</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* QR Code Modal */}
          {showQRModal && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div className="flex flex-col items-center">
                  <h3 className="text-lg font-medium mb-4">QR Code for Short URL</h3>
                  <div className="bg-white p-4 rounded-lg shadow-inner">
                    <QRCodeSVG
                      id="qr-code-canvas"
                      value={qrUrl}
                      size={256}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  <div className="mt-4 space-x-3">
                    <button
                      onClick={downloadQRCode}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                    >
                      Download QR Code
                    </button>
                    <button
                      onClick={() => setShowQRModal(false)}
                      className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Dashboard; 