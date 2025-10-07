import { useEffect, useMemo, useRef, useState } from "react";
import { useMQTT } from "../hooks/useMQTT";
import { useNavigate } from "react-router";

type LatLng = { lat: number; lng: number; accuracy?: number | null };

declare global {
  interface Window {
    google?: any;
  }
}

function useGoogleMaps(apiKey?: string) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!apiKey) return;
    if (window.google?.maps) {
      setLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.defer = true;
    script.onload = () => setLoaded(true);
    document.body.appendChild(script);
    return () => {
      script.remove();
    };
  }, [apiKey]);

  return loaded;
}

export function meta() {
  return [{ title: "Smart Box Dashboard" }];
}

export default function Dashboard() {
  const navigate = useNavigate();
  
  // MQTT Integration
  const { 
    smartBoxData, 
    connectionStatus, 
    sendWarning, 
    isConnected, 
    isConnecting 
  } = useMQTT();

  // User state
  const [user, setUser] = useState<{ email: string; isLoggedIn: boolean } | null>(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Local state for UI
  const [lastUpdate, setLastUpdate] = useState<string>("--:--:--");
  const [locationText, setLocationText] = useState<string>("Getting Location...");
  const [coordinatesText, setCoordinatesText] = useState<string>("Loading coordinates...");
  const [locationUpdateTime, setLocationUpdateTime] = useState<string>("Loading...");
  const [statusClass, setStatusClass] = useState<"normal" | "warning" | "danger" | "connecting">("warning");
  const [statusLabel, setStatusLabel] = useState<string>("Connecting to Smart Box");
  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);

  // Check for logged in user
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      } catch (error) {
        console.error("Error parsing user data:", error);
        localStorage.removeItem("user");
      }
    }
  }, []);

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };

    if (showUserDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserDropdown]);

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    navigate("/", { replace: true });
  };

  // Redirect to login if user is not authenticated
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  // Extract data from MQTT
  const temperature = smartBoxData.temperature.value;
  const humidity = smartBoxData.humidity.value;

  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);

  const googleMapsApiKey = useMemo(() => {
    // Prefer env, fallback to provided key
    return (
      (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) ||
      "AIzaSyDKFI58nZIgKnL2l8gobe0Ms--PwkId2OY"
    );
  }, []);

  const mapsLoaded = useGoogleMaps(googleMapsApiKey);

  // Format date as DD-MM-YYYY (HH:MM:SS)
  const formatDateTime = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${day}-${month}-${year} (${hours}:${minutes}:${seconds})`;
  };

  // Last update clock - updated when MQTT data is received
  useEffect(() => {
    if (smartBoxData.systemStatus.lastUpdate !== "Never") {
      setLastUpdate(smartBoxData.systemStatus.lastUpdate);
    }
  }, [smartBoxData.systemStatus.lastUpdate]);

  // Update system status based on MQTT connection and data
  useEffect(() => {
    if (isConnecting) {
      setStatusClass("warning");
      setStatusLabel("Connecting to Smart Box");
    } else if (isConnected && smartBoxData.systemStatus.online) {
      setStatusClass("normal");
      setStatusLabel("Smart Box Online");
    } else if (isConnected && !smartBoxData.systemStatus.online) {
      setStatusClass("danger");
      setStatusLabel("Smart Box Offline");
    } else {
      setStatusClass("danger");
      setStatusLabel("Connection Failed");
    }
  }, [isConnecting, isConnected, smartBoxData.systemStatus.online]);

  // Update location data from MQTT payload
  useEffect(() => {
    const { latitude, longitude, lastUpdate } = smartBoxData.location;
    
    // Use MQTT location data if available and valid
    if (latitude !== 0 && longitude !== 0) {
      setCurrentLocation({ lat: latitude, lng: longitude, accuracy: 10 });
      setCoordinatesText(`Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`);
      setLocationText("Device Location (MQTT)");
      setLocationUpdateTime(`Updated: ${lastUpdate}`);
    } else {
      // Fallback to default location if no MQTT data
      setCurrentLocation({ lat: -6.2088, lng: 106.8456, accuracy: null });
      setCoordinatesText(`Lat: -6.2088, Lng: 106.8456`);
      setLocationText("Default Location (No GPS Data)");
      setLocationUpdateTime(`Updated on ${formatDateTime(new Date())}`);
    }
  }, [smartBoxData.location]);

  // Initialize and update Google Map
  useEffect(() => {
    if (!mapsLoaded || !mapRef.current) return;
    const gmaps = window.google?.maps;
    if (!gmaps) return;

    const initial = currentLocation ?? { lat: -6.2088, lng: 106.8456 };
    if (!mapInstance.current) {
      mapInstance.current = new gmaps.Map(mapRef.current, {
        zoom: 11,
        center: initial,
        mapTypeId: "roadmap",
      });
      markerRef.current = new gmaps.Marker({
        position: initial,
        map: mapInstance.current,
        title: "Current Device Location",
        animation: gmaps.Animation.DROP,
      });
      infoWindowRef.current = new gmaps.InfoWindow({
        content: `<div style="padding:10px;font-family:Inter,sans-serif;">
          <h3 style="margin:0 0 5px 0;color:#2563eb;">Loading Location...</h3>
          <p style="margin:0;color:#64748b;">IoT Monitoring System</p>
        </div>`,
      });
      markerRef.current.addListener("click", () => {
        infoWindowRef.current.open({ map: mapInstance.current, anchor: markerRef.current });
      });
    }

    if (currentLocation && mapInstance.current && markerRef.current) {
      mapInstance.current.setCenter(currentLocation);
      markerRef.current.setPosition(currentLocation);
      infoWindowRef.current?.setContent(`
        <div style="padding:10px;font-family:Inter,sans-serif;">
          <h3 style="margin:0 0 5px 0;color:#2563eb;">Current Device Location</h3>
          <p style="margin:0;color:#64748b;">IoT Monitoring System</p>
          <p style="margin:5px 0 0 0;font-size:12px;color:#64748b;">
            Lat: ${currentLocation.lat.toFixed(6)}, Lng: ${currentLocation.lng.toFixed(6)}
          </p>
          ${currentLocation.accuracy ? `<p style="margin:5px 0 0 0;font-size:11px;color:#94a3b8;">Accuracy: ±${Math.round(currentLocation.accuracy)}m</p>` : ""}
        </div>
      `);
    }
  }, [mapsLoaded, currentLocation]);

  // Temperature status logic
  const temperatureStatus = useMemo(() => {
    if (temperature <= 0) return { cls: "frozen", label: "Frozen" } as const;
    if (temperature > 0 && temperature <= 4) return { cls: "safe", label: "Safe Point" } as const;
    return { cls: "danger", label: "Danger" } as const;
  }, [temperature]);

  // Humidity status logic
  const humidityStatus = useMemo(() => {
    if (humidity >= 85) return { cls: "safe", label: "Safe Point" } as const;
    return { cls: "danger", label: "Danger" } as const;
  }, [humidity]);

  // Handle Send Warning button click
  const handleSendWarning = () => {
    const warningMessage = {
      temperature: temperature,
      humidity: humidity,
      temperatureStatus: temperatureStatus.label,
      humidityStatus: humidityStatus.label,
      timestamp: new Date().toISOString(),
      location: currentLocation
    };
    
    sendWarning("system", `Temperature: ${temperature.toFixed(2)}°C (${temperatureStatus.label}), Humidity: ${humidity.toFixed(2)}% (${humidityStatus.label})`, "high");
    alert(`Warning sent via MQTT!\n\nCurrent Status:\nTemperature: ${temperature.toFixed(2)}°C (${temperatureStatus.label})\nHumidity: ${humidity.toFixed(2)}% (${humidityStatus.label})\nTime: ${formatDateTime(new Date())}`);
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Show loading or redirect if not authenticated */}
      {!user ? (
        <div className="flex items-center justify-center w-full h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Checking authentication...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Sidebar */}
          <div className={`fixed inset-y-0 left-0 z-50 bg-emerald-600 transform transition-all duration-500 ease-in-out lg:static lg:inset-0 ${
            sidebarOpen 
              ? 'translate-x-0 w-64' 
              : 'lg:w-16 w-64 -translate-x-full lg:translate-x-0'
          }`}>
        <div className="flex items-center justify-between h-16 px-4 bg-emerald-700">
          {sidebarOpen ? (
            <>
              <h2 className="text-white font-bold text-lg">Navigation</h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-white hover:text-gray-200"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </>
          ) : (
            <div className="w-full flex justify-center">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <i className="fas fa-cube text-emerald-600 text-lg"></i>
              </div>
            </div>
          )}
        </div>
        <nav className="mt-8">
          <div className={`px-4 ${!sidebarOpen ? 'lg:px-2' : ''}`}>
            <a
              href="#"
              className={`flex items-center py-3 text-white bg-emerald-700 rounded-lg mb-2 ${
                sidebarOpen ? 'px-4' : 'lg:px-2 lg:justify-center px-4'
              }`}
            >
              <i className={`fas fa-tachometer-alt ${sidebarOpen ? 'mr-3' : 'lg:mr-0 mr-3'}`}></i>
              <span className={`${sidebarOpen ? 'block' : 'lg:hidden'}`}>Dashboard</span>
            </a>
            <a
              href="/menu-lain"
              className={`flex items-center py-3 text-white hover:bg-emerald-700 rounded-lg mb-2 transition-colors duration-200 ${
                sidebarOpen ? 'px-4' : 'lg:px-2 lg:justify-center px-4'
              }`}
            >
              <i className={`fas fa-list ${sidebarOpen ? 'mr-3' : 'lg:mr-0 mr-3'}`}></i>
              <span className={`${sidebarOpen ? 'block' : 'lg:hidden'}`}>Menu Lain</span>
            </a>
          </div>
        </nav>
      </div>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Main content */}
      <div className={`flex-1 flex flex-col transition-all duration-500 ease-in-out ${
        sidebarOpen ? 'lg:ml-0' : 'lg:ml-0'
      }`}>
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 mr-4 transition-colors duration-200"
              >
                <div className="w-6 h-6 flex flex-col justify-center items-center">
                  <div className={`w-5 h-0.5 bg-current transition-all duration-500 ease-in-out ${sidebarOpen ? 'rotate-45 translate-y-1.5' : 'mb-1'}`}></div>
                  <div className={`w-5 h-0.5 bg-current transition-all duration-500 ease-in-out ${sidebarOpen ? 'opacity-0' : 'mb-1'}`}></div>
                  <div className={`w-5 h-0.5 bg-current transition-all duration-500 ease-in-out ${sidebarOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></div>
                </div>
              </button>
              <h1 className="text-xl sm:text-2xl font-bold text-emerald-600">
                Smart Box Monitoring
              </h1>
            </div>
            
            {/* User Dropdown */}
            {user && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-800 px-3 py-2 rounded-lg transition-colors duration-200 border border-gray-200 shadow-sm"
                >
                  <i className="fas fa-user-circle text-lg text-emerald-600"></i>
                  <div className="flex flex-col items-start">
                    <span className="text-xs text-gray-500 leading-tight">Welcome,</span>
                    <span className="text-sm font-medium leading-tight truncate max-w-[120px]">{user.email}</span>
                  </div>
                  <i className={`fas fa-chevron-down text-xs transition-transform duration-200 ${showUserDropdown ? 'rotate-180' : ''}`}></i>
                </button>
                
                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
                      <div className="font-medium text-gray-800">{user.email}</div>
                      <div className="text-gray-500 text-xs">User Account</div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-gray-800 hover:bg-gray-50 transition-colors duration-200 flex items-center gap-2"
                    >
                      <i className="fas fa-sign-out-alt text-sm text-red-500"></i>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          <div className="mx-auto w-full max-w-7xl">
            {/* Original dashboard content starts here */}
            <div className="flex flex-col gap-4 sm:gap-6 items-start justify-center">
              {/* Device ID Container */}
              <section id="device-info" className="w-full lg:w-[420px] lg:shrink-0">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-4 sm:p-6 shadow-lg border border-indigo-200">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-[50px] h-[50px] sm:w-[60px] sm:h-[60px] rounded-full flex items-center justify-center text-xl sm:text-2xl shrink-0 bg-white/20 text-white">
                      <i className="fas fa-microchip" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white/80 font-medium mb-1 text-sm sm:text-base">Device ID</h3>
                      <p className="text-lg sm:text-xl font-bold text-white mb-1 break-all" id="device-id-value">
                        {smartBoxData.deviceId}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                        <span className="text-white/70 text-xs sm:text-sm">
                          {isConnected ? 'Connected' : 'Disconnected'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

          {/* Box Status and Location Status - Side by Side */}
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 w-full">
            <section id="box-status" className="flex-1 lg:max-w-[420px]">
              <h2 className="text-lg sm:text-xl font-semibold text-red-500 inline-block mb-4 sm:mb-6 pb-2 border-b-2 border-red-500">Box Status</h2>

              <div className="flex flex-col gap-4">
                <div className="bg-slate-50 rounded-xl p-4 sm:p-6 shadow border border-slate-200 flex items-center gap-3 sm:gap-4 hover:-translate-y-0.5 hover:shadow-lg transition">
                  <div className="w-[50px] h-[50px] sm:w-[65px] sm:h-[65px] rounded-full flex items-center justify-center text-xl sm:text-2xl shrink-0 bg-gradient-to-br from-amber-100 to-amber-400 text-amber-700">
                    <i className="fas fa-thermometer-half" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-slate-500 font-medium mb-2 text-sm sm:text-base">Temperature</h3>
                    <p className="text-xl sm:text-2xl font-bold text-slate-800 mb-2" id="temperature-value">{temperature.toFixed(2)}°C</p>
                    <span className={`inline-flex items-center gap-2 rounded-full px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium ${
                      temperatureStatus.cls === "safe"
                        ? "bg-emerald-100 text-emerald-700"
                        : temperatureStatus.cls === "frozen"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-red-100 text-red-600"
                    }`}>{temperatureStatus.label}</span>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 sm:p-6 shadow border border-slate-200 flex items-center gap-3 sm:gap-4 hover:-translate-y-0.5 hover:shadow-lg transition">
                  <div className="w-[50px] h-[50px] sm:w-[65px] sm:h-[65px] rounded-full flex items-center justify-center text-xl sm:text-2xl shrink-0 bg-gradient-to-br from-blue-200 to-blue-600 text-blue-700">
                    <i className="fas fa-tint" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-slate-500 font-medium mb-2 text-sm sm:text-base">Humidity</h3>
                    <p className="text-xl sm:text-2xl font-bold text-slate-800 mb-2" id="humidity-value">{humidity.toFixed(2)}%</p>
                    <span className={`inline-flex items-center gap-2 rounded-full px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium ${
                      humidityStatus.cls === "safe"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-600"
                    }`}>{humidityStatus.label}</span>
                  </div>
                </div>
              </div>

              <h2 className="text-lg sm:text-xl font-semibold text-emerald-600 inline-block mt-6 sm:mt-8 mb-3 sm:mb-4 pb-2 border-b-2 border-emerald-600">System Status</h2>
              <div className="flex flex-col gap-4">
                <div className="bg-slate-50 rounded-xl p-4 sm:p-6 shadow border border-slate-200 hover:-translate-y-0.5 hover:shadow-lg transition">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-[50px] h-[50px] sm:w-[65px] sm:h-[65px] rounded-full flex items-center justify-center text-xl sm:text-2xl shrink-0 bg-gradient-to-br from-emerald-100 to-emerald-500 text-emerald-800">
                      <i className="fas fa-server" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col gap-2">
                        <div className="inline-flex items-center gap-2 text-emerald-600 font-medium bg-emerald-100 rounded-full px-2 sm:px-3 py-1 text-xs sm:text-sm w-fit">
                          <i className="fas fa-circle animate-pulse" />
                          <span>System Online</span>
                        </div>
                        <div className="text-slate-500 text-xs sm:text-sm">
                          Last Update: <span id="last-update" className="break-all">{lastUpdate}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 relative min-h-[80px] sm:min-h-[60px]">
                    <div className="text-slate-600 text-xs sm:text-sm ml-1">
                      <div className="mb-2">
                        <div className="mb-1">
                          <strong>Current Temperature:</strong> {temperature.toFixed(2)}°C
                        </div>
                        <span className={`inline-flex items-center gap-2 rounded-full px-2 sm:px-3 py-1 text-xs font-medium ${
                          temperatureStatus.cls === "safe"
                            ? "bg-emerald-100 text-emerald-700"
                            : temperatureStatus.cls === "frozen"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-red-100 text-red-600"
                        }`}>{temperatureStatus.label}</span>
                      </div>
                      <div className="mb-2">
                        <div className="mb-1">
                          <strong>Current Humidity:</strong> {humidity.toFixed(2)}%
                        </div>
                        <span className={`inline-flex items-center gap-2 rounded-full px-2 sm:px-3 py-1 text-xs font-medium ${
                          humidityStatus.cls === "safe"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-600"
                        }`}>{humidityStatus.label}</span>
                      </div>
                    </div>
                    <div className="absolute bottom-0 right-0">
                      <button 
                        onClick={handleSendWarning}
                        className="bg-green-500 hover:bg-green-600 text-yellow-300 font-semibold px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm transition-colors duration-200 shadow-md hover:shadow-lg"
                      >
                        Send a Warning
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section id="location-status" className="flex-1 lg:max-w-[780px]">
              <h2 className="text-lg sm:text-xl font-semibold text-blue-600 inline-block mb-4 sm:mb-6 pb-2 border-b-2 border-blue-600">Location Status</h2>
              <div className="bg-slate-50 rounded-xl overflow-hidden shadow border border-slate-200">
                <div id="map" ref={mapRef} className="w-full h-[300px] sm:h-[400px] lg:h-[500px]" />
                <div className="p-4 sm:p-6 bg-white">
                  <div className="flex items-center gap-3 mb-2">
                    <i className="fas fa-map-marker-alt text-red-500 text-base sm:text-lg" />
                    <span id="location-text" className="font-semibold text-slate-800 text-sm sm:text-base break-words">{locationText}</span>
                  </div>
                  <div className="font-mono text-xs sm:text-sm text-slate-500 mb-2 break-all">
                    <span id="coordinates">{coordinatesText}</span>
                  </div>
                  <div className="text-xs sm:text-sm text-slate-400 mb-2 italic">
                    <span id="location-update-time">{locationUpdateTime}</span>
                  </div>
                  <div className="mt-2">
                    <span id="location-status-indicator" className={`inline-flex items-center gap-2 rounded-full px-2 sm:px-2.5 py-1 text-xs font-medium ${
                      statusClass === "normal"
                        ? "bg-emerald-100 text-emerald-700"
                        : statusClass === "warning"
                        ? "bg-amber-100 text-amber-700"
                        : statusClass === "connecting"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-red-100 text-red-600"
                    }`}>
                      {isConnected ? (
                        <i className="fas fa-wifi text-emerald-600" />
                      ) : (
                        <i className="fas fa-wifi-slash text-red-600" />
                      )}
                      {statusLabel}
                    </span>
                  </div>
                </div>
              </div>
            </section>
            </div>
          </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <i className="fas fa-copyright text-emerald-600"></i>
              <span>2025 - SELEB Smart Box Monitoring. All rights reserved.</span>
            </div>
          </div>
        </footer>
      </div>
        </>
      )}
    </div>
  );
}


