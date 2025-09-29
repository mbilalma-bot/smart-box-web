import { useEffect, useMemo, useRef, useState } from "react";

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
  const [temperature, setTemperature] = useState<number>(-5);
  const [humidity, setHumidity] = useState<number>(80);
  const [lastUpdate, setLastUpdate] = useState<string>("--:--:--");
  const [locationText, setLocationText] = useState<string>("Getting Location...");
  const [coordinatesText, setCoordinatesText] = useState<string>("Loading coordinates...");
  const [locationUpdateTime, setLocationUpdateTime] = useState<string>("Loading...");
  const [statusClass, setStatusClass] = useState<"normal" | "warning" | "danger">("warning");
  const [statusLabel, setStatusLabel] = useState<string>("Detecting Location");
  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);

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

  // Last update clock - updated every 10 seconds
  useEffect(() => {
    const update = () => setLastUpdate(formatDateTime(new Date()));
    update();
    const t = setInterval(update, 10000); // 10 seconds
    return () => clearInterval(t);
  }, []);

  // Generate random temperature and humidity every 10 seconds
  useEffect(() => {
    const updateSensorData = () => {
      // Random temperature between -10 to 10 degrees Celsius
      const newTemp = Math.floor(Math.random() * 21) - 10; // -10 to 10
      setTemperature(newTemp);
      
      // Random humidity between 70% to 95%
      const newHumidity = Math.floor(Math.random() * 26) + 70; // 70 to 95
      setHumidity(newHumidity);
    };
    
    updateSensorData(); // Initial update
    const t = setInterval(updateSensorData, 10000); // 10 seconds
    return () => clearInterval(t);
  }, []);

  // Geolocation - updated every 10 seconds
  useEffect(() => {
    const updateLocation = () => {
      if (!navigator.geolocation) {
        setCurrentLocation({ lat: -6.2088, lng: 106.8456, accuracy: null });
        setCoordinatesText(`Lat: -6.2088, Lng: 106.8456`);
        setLocationText("Default Location (GPS Unavailable)");
        setLocationUpdateTime(`Updated on ${formatDateTime(new Date())}`);
        setStatusClass("danger");
        setStatusLabel("GPS Unavailable");
        return;
      }

      const onSuccess = (position: GeolocationPosition) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        setCurrentLocation(loc);
        setCoordinatesText(`Lat: ${loc.lat.toFixed(6)}, Lng: ${loc.lng.toFixed(6)}`);
        setLocationText("Current Device Location");
        setLocationUpdateTime(`Updated on ${formatDateTime(new Date())}`);
        setStatusClass("normal");
        setStatusLabel("Location Active");
      };

      const onError = () => {
        setCurrentLocation({ lat: -6.2088, lng: 106.8456, accuracy: null });
        setCoordinatesText(`Lat: -6.2088, Lng: 106.8456`);
        setLocationText("Default Location (GPS Unavailable)");
        setLocationUpdateTime(`Updated on ${formatDateTime(new Date())}`);
        setStatusClass("danger");
        setStatusLabel("GPS Unavailable");
      };

      navigator.geolocation.getCurrentPosition(onSuccess, onError, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0, // Always get fresh location
      });
    };

    // Initial location update
    updateLocation();
    
    // Update location every 10 seconds
    const locationInterval = setInterval(updateLocation, 10000);
    
    return () => clearInterval(locationInterval);
  }, []);

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
    alert(`Warning sent!\n\nCurrent Status:\nTemperature: ${temperature}°C (${temperatureStatus.label})\nHumidity: ${humidity}% (${humidityStatus.label})\nTime: ${formatDateTime(new Date())}`);
  };

  return (
    <div className="min-h-screen flex flex-col p-4 sm:p-6 lg:p-8 w-full bg-white">
      <div className="mx-auto w-full max-w-7xl">
        <header className="text-center mb-4 sm:mb-6">
          <h1 className="inline-block text-white font-bold shadow-md rounded-xl px-4 sm:px-6 py-3 sm:py-4 text-[clamp(1.2rem,4vw,2.5rem)] bg-emerald-500">
            <span className="text-yellow-300">Smart Box</span> for Fish Storage Monitoring
          </h1>
        </header>

        <main className="flex flex-col lg:flex-row gap-4 sm:gap-6 items-start justify-center">
          <div className="flex flex-col gap-4 sm:gap-6 w-full lg:w-[420px] lg:shrink-0">
            <section id="box-status">
              <h2 className="text-lg sm:text-xl font-semibold text-red-500 inline-block mb-4 sm:mb-6 pb-2 border-b-2 border-red-500">Box Status</h2>

              <div className="flex flex-col gap-4">
                <div className="bg-slate-50 rounded-xl p-4 sm:p-6 shadow border border-slate-200 flex items-center gap-3 sm:gap-4 hover:-translate-y-0.5 hover:shadow-lg transition">
                  <div className="w-[50px] h-[50px] sm:w-[65px] sm:h-[65px] rounded-full flex items-center justify-center text-xl sm:text-2xl shrink-0 bg-gradient-to-br from-amber-100 to-amber-400 text-amber-700">
                    <i className="fas fa-thermometer-half" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-slate-500 font-medium mb-2 text-sm sm:text-base">Temperature</h3>
                    <p className="text-xl sm:text-2xl font-bold text-slate-800 mb-2" id="temperature-value">{temperature}°C</p>
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
                    <p className="text-xl sm:text-2xl font-bold text-slate-800 mb-2" id="humidity-value">{humidity}%</p>
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
                <div className="bg-slate-50 rounded-xl p-4 sm:p-6 shadow border border-slate-200">
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
                          <strong>Current Temperature:</strong> {temperature}°C
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
                          <strong>Current Humidity:</strong> {humidity}%
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
          </div>

          <section id="location-status" className="w-full lg:w-[780px] lg:shrink-0">
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
                      : "bg-red-100 text-red-600"
                  }`}>
                    {statusLabel}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}


