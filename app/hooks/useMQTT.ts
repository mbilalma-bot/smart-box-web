import { useState, useEffect, useCallback, useRef } from 'react';
import { mqttService, type MQTTMessageHandler } from '../services/mqttService';
import { 
  mqttTopics,
  type CoolerBoxSensorData,
  type WarningCommand
} from '../config/mqtt';

// Smart Box Data State Interface
export interface SmartBoxData {
  deviceId: string;
  temperature: {
    value: number;
    unit: string;
    status: "frozen" | "safe" | "danger";
    lastUpdate: string;
  };
  humidity: {
    value: number;
    unit: string;
    status: "safe" | "danger";
    lastUpdate: string;
  };
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
    lastUpdate: string;
  };
  systemStatus: {
    online: boolean;
    status: "active" | "inactive" | "error";
    lastUpdate: string;
  };
}

// MQTT Connection Status
export interface MQTTConnectionStatus {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  clientId: string;
}

// Custom Hook untuk MQTT Integration
export const useMQTT = () => {
  // State untuk data Smart Box
  const [smartBoxData, setSmartBoxData] = useState<SmartBoxData>({
    deviceId: "Unknown",
    temperature: {
      value: 0,
      unit: "°C",
      status: "safe",
      lastUpdate: "Never"
    },
    humidity: {
      value: 0,
      unit: "%",
      status: "safe",
      lastUpdate: "Never"
    },
    location: {
      latitude: 0,
      longitude: 0,
      accuracy: 0,
      lastUpdate: "Never"
    },
    systemStatus: {
      online: false,
      status: "inactive",
      lastUpdate: "Never"
    }
  });

  // State untuk status koneksi MQTT
  const [connectionStatus, setConnectionStatus] = useState<MQTTConnectionStatus>({
    connected: false,
    connecting: false,
    error: null,
    clientId: ''
  });

  // Ref untuk mencegah multiple subscriptions
  const isSubscribed = useRef(false);

  // Function untuk menentukan status temperature
  const getTemperatureStatus = (temp: number): "frozen" | "safe" | "danger" => {
    if (temp < 0) return "frozen";
    if (temp > 30) return "danger";
    return "safe";
  };

  // Function untuk menentukan status humidity
  const getHumidityStatus = (humidity: number): "safe" | "danger" => {
    if (humidity < 30 || humidity > 70) return "danger";
    return "safe";
  };

  // Function untuk parse GPS location
  const parseGPSLocation = (gpsString: string): { latitude: number; longitude: number } => {
    try {
      const [lat, lng] = gpsString.split(',').map(coord => parseFloat(coord.trim()));
      return { latitude: lat || 0, longitude: lng || 0 };
    } catch (error) {
      console.error('Error parsing GPS location:', error);
      return { latitude: 0, longitude: 0 };
    }
  };

  // Handler untuk data sensor dari ESP32
  const handleSensorData: MQTTMessageHandler<CoolerBoxSensorData> = useCallback((topic: string, data: CoolerBoxSensorData) => {
    console.log('📡 Received sensor data:', data);
    
    const timestamp = new Date().toLocaleString();
    const { latitude, longitude } = parseGPSLocation(data.gps_location);
    
    setSmartBoxData(prevData => ({
      ...prevData,
      deviceId: data.device_id,
      temperature: {
        value: parseFloat(data.temperature.toFixed(2)), // Convert back to number after truncating to 2 decimal places
        unit: "°C",
        status: getTemperatureStatus(data.temperature),
        lastUpdate: timestamp
      },
      humidity: {
        value: parseFloat(data.humidity.toFixed(2)), // Convert back to number after truncating to 2 decimal places
        unit: "%",
        status: getHumidityStatus(data.humidity),
        lastUpdate: timestamp
      },
      location: {
        latitude,
        longitude,
        accuracy: 10, // Default accuracy
        lastUpdate: timestamp
      },
      systemStatus: {
        online: data.status === "active",
        status: data.status,
        lastUpdate: timestamp
      }
    }));
  }, []);

  // Initialize MQTT connection
  useEffect(() => {
    const initializeMQTT = async () => {
      try {
        setConnectionStatus(prev => ({ ...prev, connecting: true, error: null }));
        
        // Connect to MQTT broker
        const connected = await mqttService.connect();
        
        if (connected) {
          setConnectionStatus(prev => ({
             ...prev,
             connected: true,
             connecting: false,
             clientId: mqttService.clientId
           }));

          // Subscribe to sensor data topic
          if (!isSubscribed.current) {
            mqttService.subscribe(mqttTopics.sensorData, handleSensorData);
            isSubscribed.current = true;
            console.log('✅ Subscribed to:', mqttTopics.sensorData);
          }
        } else {
          throw new Error('Failed to connect to MQTT broker');
        }
      } catch (error) {
        console.error('❌ MQTT connection error:', error);
        setConnectionStatus(prev => ({
          ...prev,
          connected: false,
          connecting: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }));
      }
    };

    initializeMQTT();

    // Cleanup on unmount
    return () => {
      if (isSubscribed.current) {
        mqttService.unsubscribe(mqttTopics.sensorData, handleSensorData);
        isSubscribed.current = false;
      }
    };
  }, [handleSensorData]);

  // Reconnect function
  const reconnect = useCallback(async () => {
    setConnectionStatus(prev => ({ ...prev, connecting: true, error: null }));
    
    try {
      await mqttService.disconnect();
      const connected = await mqttService.connect();
      
      if (connected) {
        setConnectionStatus(prev => ({
           ...prev,
           connected: true,
           connecting: false,
           clientId: mqttService.clientId
         }));
        
        if (!isSubscribed.current) {
          mqttService.subscribe(mqttTopics.sensorData, handleSensorData);
          isSubscribed.current = true;
        }
      }
    } catch (error) {
      setConnectionStatus(prev => ({
        ...prev,
        connected: false,
        connecting: false,
        error: error instanceof Error ? error.message : 'Reconnection failed'
      }));
    }
  }, [handleSensorData]);

  // Disconnect function
  const disconnect = useCallback(async () => {
    try {
      if (isSubscribed.current) {
        mqttService.unsubscribe(mqttTopics.sensorData, handleSensorData);
        isSubscribed.current = false;
      }
      
      await mqttService.disconnect();
      
      setConnectionStatus({
        connected: false,
        connecting: false,
        error: null,
        clientId: '',
      });
    } catch (error) {
      console.error('❌ Disconnect error:', error);
    }
  }, [handleSensorData]);

  // Reset data function
  const resetData = useCallback(() => {
    setSmartBoxData({
      deviceId: "Unknown",
      temperature: {
        value: 0,
        unit: "°C",
        status: "safe",
        lastUpdate: "Never"
      },
      humidity: {
        value: 0,
        unit: "%",
        status: "safe",
        lastUpdate: "Never"
      },
      location: {
        latitude: 0,
        longitude: 0,
        accuracy: 0,
        lastUpdate: "Never"
      },
      systemStatus: {
        online: false,
        status: "inactive",
        lastUpdate: "Never"
      }
    });
  }, []);

  // Send warning command
  const sendWarning = useCallback((type: "temperature" | "humidity" | "system", message: string, severity: "low" | "medium" | "high" = "medium") => {
    if (!connectionStatus.connected) {
      console.error('❌ Cannot send warning: MQTT not connected');
      return false;
    }

    const warningCommand: WarningCommand = {
      type,
      message,
      timestamp: new Date().toISOString(),
      severity
    };

    try {
      mqttService.publish(mqttTopics.warning, warningCommand);
      console.log('✅ Warning sent:', warningCommand);
      return true;
    } catch (error) {
      console.error('❌ Failed to send warning:', error);
      return false;
    }
  }, [connectionStatus.connected]);

  return {
    // Data
    smartBoxData,
    connectionStatus,
    
    // Functions
    reconnect,
    disconnect,
    resetData,
    sendWarning,
    
    // Computed values
    isConnected: connectionStatus.connected,
    isConnecting: connectionStatus.connecting,
    hasError: !!connectionStatus.error,
    errorMessage: connectionStatus.error
  };
};