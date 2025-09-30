// MQTT utility functions for data processing and validation
import type { CoolerBoxSensorData } from '~/config/mqtt';

/**
 * Parse incoming MQTT message data
 */
export function parseSmartBoxData(topic: string, message: string): any | null {
  try {
    const data = JSON.parse(message);
    
    // Validate based on topic
    if (topic.includes('/temperature')) {
      return validateTemperatureData(data) ? { temperature: data.value, lastUpdate: new Date() } : null;
    }
    
    if (topic.includes('/humidity')) {
      return validateHumidityData(data) ? { humidity: data.value, lastUpdate: new Date() } : null;
    }
    
    if (topic.includes('/location')) {
      return validateLocationData(data) ? { 
        location: { lat: data.latitude, lng: data.longitude, accuracy: data.accuracy },
        lastUpdate: new Date()
      } : null;
    }
    
    if (topic.includes('/status')) {
      return validateSystemStatusData(data) ? { 
        systemStatus: data.online ? 'online' : 'offline',
        batteryLevel: data.batteryLevel,
        lastUpdate: new Date()
      } : null;
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing MQTT message:', error);
    return null;
  }
}

/**
 * Validate temperature data
 */
interface TemperatureData {
  value: number;
  unit: string;
}

function validateTemperatureData(data: any): data is TemperatureData {
  return (
    typeof data === 'object' &&
    typeof data.value === 'number' &&
    data.value >= -50 &&
    data.value <= 100 &&
    typeof data.unit === 'string'
  );
}

/**
 * Validate humidity data
 */
interface HumidityData {
  value: number;
  unit: string;
}

function validateHumidityData(data: any): data is HumidityData {
  return (
    typeof data === 'object' &&
    typeof data.value === 'number' &&
    data.value >= 0 &&
    data.value <= 100 &&
    typeof data.unit === 'string'
  );
}

/**
 * Validate location data
 */
interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

function validateLocationData(data: any): data is LocationData {
  return (
    typeof data === 'object' &&
    typeof data.latitude === 'number' &&
    typeof data.longitude === 'number' &&
    data.latitude >= -90 &&
    data.latitude <= 90 &&
    data.longitude >= -180 &&
    data.longitude <= 180
  );
}

/**
 * Validate system status data
 */
interface SystemStatusData {
  online: boolean;
  batteryLevel?: number;
}

function validateSystemStatusData(data: any): data is SystemStatusData {
  return (
    typeof data === 'object' &&
    typeof data.online === 'boolean'
  );
}

/**
 * Format temperature status based on value
 */
export function getTemperatureStatus(temperature: number): { cls: string; label: string } {
  if (temperature <= 0) return { cls: "frozen", label: "Frozen" };
  if (temperature > 0 && temperature <= 4) return { cls: "safe", label: "Safe Point" };
  return { cls: "danger", label: "Danger" };
}

/**
 * Format humidity status based on value
 */
export function getHumidityStatus(humidity: number): { cls: string; label: string } {
  if (humidity >= 85) return { cls: "safe", label: "Safe Point" };
  return { cls: "danger", label: "Danger" };
}

/**
 * Generate MQTT client ID
 */
export function generateClientId(): string {
  return `smartbox_web_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format date and time for display
 */
export function formatDateTime(date: Date): string {
  return date.toLocaleString('id-ID', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Jakarta'
  });
}