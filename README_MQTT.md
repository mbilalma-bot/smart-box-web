# MQTT Integration Guide for Smart Box Dashboard

## Overview
This guide explains how to integrate MQTT.js with HiveMQ for real-time IoT data communication in the Smart Box Dashboard.

## Prerequisites

### 1. HiveMQ Cloud Setup
1. Create a free account at [HiveMQ Cloud](https://www.hivemq.com/mqtt-cloud-broker/)
2. Create a new cluster
3. Note down your connection details:
   - **Broker URL**: `your-cluster-url.s1.eu.hivemq.cloud`
   - **Port**: `8883` (TLS) or `1883` (non-TLS)
   - **Username**: Your HiveMQ username
   - **Password**: Your HiveMQ password

### 2. Dependencies
The following packages are already installed:
```bash
npm install mqtt
npm install --save-dev @types/mqtt
```

## Configuration

### 1. Update MQTT Configuration
Edit `app/config/mqtt.ts` with your HiveMQ credentials:

```typescript
export const MQTT_CONFIG = {
  broker: 'wss://your-cluster-url.s1.eu.hivemq.cloud:8884/mqtt', // WebSocket Secure
  // OR for non-secure: 'ws://your-cluster-url.s1.eu.hivemq.cloud:8000/mqtt'
  
  options: {
    clientId: `smartbox_web_${Math.random().toString(36).substr(2, 9)}`,
    username: 'your-hivemq-username',
    password: 'your-hivemq-password',
    clean: true,
    connectTimeout: 4000,
    reconnectPeriod: 1000,
    keepalive: 60,
  }
};
```

### 2. Environment Variables (Recommended)
Create a `.env` file in your project root:

```env
MQTT_BROKER_URL=wss://your-cluster-url.s1.eu.hivemq.cloud:8884/mqtt
MQTT_USERNAME=your-hivemq-username
MQTT_PASSWORD=your-hivemq-password
```

Then update `app/config/mqtt.ts`:

```typescript
export const MQTT_CONFIG = {
  broker: process.env.MQTT_BROKER_URL || 'wss://broker.hivemq.com:8884/mqtt',
  options: {
    clientId: `smartbox_web_${Math.random().toString(36).substr(2, 9)}`,
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    clean: true,
    connectTimeout: 4000,
    reconnectPeriod: 1000,
    keepalive: 60,
  }
};
```

## MQTT Topics Structure

### Subscribed Topics (Incoming Data)
- `smartbox/sensor/temperature` - Temperature readings
- `smartbox/sensor/humidity` - Humidity readings
- `smartbox/location/gps` - GPS coordinates
- `smartbox/system/status` - System status updates

### Published Topics (Outgoing Commands)
- `smartbox/command/warning` - Warning messages
- `smartbox/command/control` - Control commands

## Message Formats

### Temperature Data
```json
{
  "value": 2.5,
  "unit": "°C",
  "timestamp": "2024-01-15T10:30:00Z",
  "deviceId": "smartbox_001"
}
```

### Humidity Data
```json
{
  "value": 87.2,
  "unit": "%",
  "timestamp": "2024-01-15T10:30:00Z",
  "deviceId": "smartbox_001"
}
```

### Location Data
```json
{
  "latitude": -6.2088,
  "longitude": 106.8456,
  "accuracy": 10,
  "timestamp": "2024-01-15T10:30:00Z",
  "deviceId": "smartbox_001"
}
```

### Status Data
```json
{
  "status": "online",
  "batteryLevel": 85,
  "timestamp": "2024-01-15T10:30:00Z",
  "deviceId": "smartbox_001"
}
```

### Warning Message (Outgoing)
```json
{
  "temperature": 2.5,
  "humidity": 87.2,
  "temperatureStatus": "Safe Point",
  "humidityStatus": "Safe Point",
  "timestamp": "2024-01-15T10:30:00Z",
  "location": {
    "lat": -6.2088,
    "lng": 106.8456,
    "accuracy": 10
  }
}
```

## Usage

### 1. In React Components
```typescript
import { useMQTT } from '~/hooks/useMQTT';

export default function Dashboard() {
  const { 
    isConnected, 
    smartBoxData, 
    connect, 
    disconnect, 
    sendWarning 
  } = useMQTT();

  useEffect(() => {
    connect();
    return () => disconnect();
  }, []);

  const handleSendWarning = () => {
    const warningData = {
      temperature: smartBoxData.temperature,
      humidity: smartBoxData.humidity,
      // ... other data
    };
    sendWarning(warningData);
  };

  return (
    <div>
      <p>Connection: {isConnected ? 'Connected' : 'Disconnected'}</p>
      <p>Temperature: {smartBoxData.temperature}°C</p>
      <p>Humidity: {smartBoxData.humidity}%</p>
      <button onClick={handleSendWarning}>Send Warning</button>
    </div>
  );
}
```

### 2. Direct Service Usage
```typescript
import { mqttService } from '~/services/mqttService';

// Connect
await mqttService.connect();

// Subscribe to topics
mqttService.subscribe('smartbox/sensor/temperature');

// Publish message
mqttService.publish('smartbox/command/warning', {
  message: 'Temperature alert',
  timestamp: new Date().toISOString()
});

// Disconnect
mqttService.disconnect();
```

## Testing

### 1. Using HiveMQ WebSocket Client
1. Go to [HiveMQ WebSocket Client](http://www.hivemq.com/demos/websocket-client/)
2. Connect using your HiveMQ credentials
3. Subscribe to `smartbox/#` to see all messages
4. Publish test messages to simulate sensor data

### 2. Test Message Examples
Publish these messages to test the dashboard:

**Temperature:**
```
Topic: smartbox/sensor/temperature
Message: {"value": 3.2, "unit": "°C", "timestamp": "2024-01-15T10:30:00Z", "deviceId": "smartbox_001"}
```

**Humidity:**
```
Topic: smartbox/sensor/humidity
Message: {"value": 89.5, "unit": "%", "timestamp": "2024-01-15T10:30:00Z", "deviceId": "smartbox_001"}
```

**Location:**
```
Topic: smartbox/location/gps
Message: {"latitude": -6.2088, "longitude": 106.8456, "accuracy": 10, "timestamp": "2024-01-15T10:30:00Z", "deviceId": "smartbox_001"}
```

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Check your HiveMQ credentials
   - Ensure the broker URL is correct
   - Verify network connectivity

2. **Messages Not Received**
   - Check topic names match exactly
   - Verify message format is valid JSON
   - Check browser console for errors

3. **CORS Issues**
   - Use WebSocket Secure (WSS) for production
   - Ensure proper CORS configuration on HiveMQ

### Debug Mode
Enable debug logging by adding to your component:

```typescript
useEffect(() => {
  // Enable MQTT debug logging
  localStorage.setItem('debug', 'mqtt*');
}, []);
```

## Security Best Practices

1. **Use Environment Variables**
   - Never commit credentials to version control
   - Use `.env` files for local development
   - Use secure environment variables in production

2. **Use TLS/SSL**
   - Always use WSS (WebSocket Secure) in production
   - Use port 8884 for secure WebSocket connections

3. **Authentication**
   - Use strong passwords for HiveMQ accounts
   - Regularly rotate credentials
   - Implement proper access controls

## Production Deployment

### 1. Environment Setup
Ensure these environment variables are set in production:
- `MQTT_BROKER_URL`
- `MQTT_USERNAME`
- `MQTT_PASSWORD`

### 2. Error Handling
The MQTT service includes automatic reconnection and error handling. Monitor connection status and implement appropriate user feedback.

### 3. Performance Considerations
- Use QoS level 0 for non-critical messages
- Implement message throttling if needed
- Monitor connection stability

## Support

For issues related to:
- **MQTT.js**: [MQTT.js Documentation](https://github.com/mqttjs/MQTT.js)
- **HiveMQ**: [HiveMQ Documentation](https://docs.hivemq.com/)
- **Smart Box Dashboard**: Check the main README.md file