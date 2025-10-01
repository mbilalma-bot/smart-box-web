// MQTT Configuration for HiveMQ Connection
export interface MQTTConfig {
  brokerUrl: string;
  port: number;
  clientId: string;
  username?: string;
  password?: string;
  keepalive: number;
  reconnectPeriod: number;
  connectTimeout: number;
  clean: boolean;
}

// HiveMQ Cloud Configuration
// Ganti dengan kredensial HiveMQ Cloud Anda
export const hiveMQConfig: MQTTConfig = {
  // Format: wss://your-cluster-url:8884/mqtt
  brokerUrl: "wss://67d560452e2d4534b5decfc22c4cb938.s1.eu.hivemq.cloud:8884/mqtt",
  port: 8884,
  clientId: `smart-box-web-${Math.random().toString(16).substr(2, 8)}`,
  username: "smartbox-user", // Kredensial alternatif - pastikan terdaftar di HiveMQ Console
  password: "SMARTbox123", // Password yang lebih kuat
  keepalive: 60,
  reconnectPeriod: 5000, // Increased to 5 seconds to reduce reconnection frequency
  connectTimeout: 30 * 1000,
  clean: true,
};

// Topic Configuration untuk Smart Box
export const mqttTopics = {
  // Topic utama untuk menerima semua data sensor dari ESP32 CoolerBox
  sensorData: "coolerbox/sensor/data",
  
  // Topics untuk mengirim perintah ke Smart Box
  warning: "smartbox/command/warning",
  control: "smartbox/command/control",
} as const;

// Data Types untuk MQTT Messages sesuai payload ESP32
export interface CoolerBoxSensorData {
  device_id: string;
  temperature: number;
  humidity: number;
  gps_location: string; // Format: "latitude,longitude"
  status: "active" | "inactive" | "error";
}

export interface WarningCommand {
  type: "temperature" | "humidity" | "system";
  message: string;
  timestamp: string;
  severity: "low" | "medium" | "high";
}

// Export default untuk kemudahan import
export default {
  hiveMQConfig,
  mqttTopics
};