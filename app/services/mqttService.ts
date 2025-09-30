import mqtt from 'mqtt';
import type { MqttClient, IClientOptions } from 'mqtt';
import { 
  type MQTTConfig, 
  hiveMQConfig, 
  mqttTopics,
  type CoolerBoxSensorData,
  type WarningCommand
} from '../config/mqtt';

export type MQTTMessageHandler<T = any> = (topic: string, message: T) => void;

export class MQTTService {
  private client: MqttClient | null = null;
  private config: MQTTConfig;
  private messageHandlers: Map<string, MQTTMessageHandler[]> = new Map();
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  constructor(config: MQTTConfig = hiveMQConfig) {
    this.config = config;
  }

  // Koneksi ke HiveMQ Broker
  async connect(): Promise<boolean> {
    try {
      const options: IClientOptions = {
        clientId: this.config.clientId,
        username: this.config.username,
        password: this.config.password,
        keepalive: this.config.keepalive,
        reconnectPeriod: this.config.reconnectPeriod,
        connectTimeout: this.config.connectTimeout,
        clean: this.config.clean,
        protocol: 'wss',
      };

      this.client = mqtt.connect(this.config.brokerUrl, options);

      return new Promise((resolve, reject) => {
        if (!this.client) {
          reject(new Error('Failed to create MQTT client'));
          return;
        }

        this.client.on('connect', () => {
          console.log('✅ Connected to HiveMQ broker');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.subscribeToTopics();
          resolve(true);
        });

        this.client.on('error', (error) => {
          console.error('❌ MQTT connection error:', error);
          this.isConnected = false;
          reject(error);
        });

        this.client.on('close', () => {
          console.log('🔌 MQTT connection closed');
          this.isConnected = false;
        });

        this.client.on('reconnect', () => {
          this.reconnectAttempts++;
          console.log(`🔄 Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ Max reconnection attempts reached');
            this.client?.end();
          }
        });

        this.client.on('message', (topic, message) => {
          this.handleMessage(topic, message);
        });
      });
    } catch (error) {
      console.error('❌ Failed to connect to MQTT broker:', error);
      return false;
    }
  }

  // Subscribe ke semua topics yang diperlukan
  private subscribeToTopics(): void {
    if (!this.client || !this.isConnected) return;

    const topics = Object.values(mqttTopics);
    topics.forEach(topic => {
      this.client!.subscribe(topic, (error) => {
        if (error) {
          console.error(`❌ Failed to subscribe to ${topic}:`, error);
        } else {
          console.log(`✅ Subscribed to ${topic}`);
        }
      });
    });
  }

  // Handle incoming messages
  private handleMessage(topic: string, message: Buffer): void {
    try {
      const messageStr = message.toString();
      let parsedMessage: any;

      try {
        parsedMessage = JSON.parse(messageStr);
      } catch {
        parsedMessage = messageStr;
      }

      console.log(`📨 Received message on ${topic}:`, parsedMessage);

      // Panggil semua handlers untuk topic ini
      const handlers = this.messageHandlers.get(topic) || [];
      handlers.forEach(handler => {
        try {
          handler(topic, parsedMessage);
        } catch (error) {
          console.error(`❌ Error in message handler for ${topic}:`, error);
        }
      });
    } catch (error) {
      console.error(`❌ Error handling message for ${topic}:`, error);
    }
  }

  // Subscribe ke topic tertentu dengan handler
  subscribe<T = any>(topic: string, handler: MQTTMessageHandler<T>): void {
    if (!this.messageHandlers.has(topic)) {
      this.messageHandlers.set(topic, []);
    }
    this.messageHandlers.get(topic)!.push(handler);

    // Subscribe ke topic jika belum
    if (this.client && this.isConnected) {
      this.client.subscribe(topic, (error) => {
        if (error) {
          console.error(`❌ Failed to subscribe to ${topic}:`, error);
        } else {
          console.log(`✅ Subscribed to ${topic}`);
        }
      });
    }
  }

  // Unsubscribe dari topic
  unsubscribe(topic: string, handler?: MQTTMessageHandler): void {
    if (handler) {
      const handlers = this.messageHandlers.get(topic) || [];
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    } else {
      this.messageHandlers.delete(topic);
    }

    if (this.client && this.isConnected) {
      this.client.unsubscribe(topic);
    }
  }

  // Publish message ke topic
  publish(topic: string, message: any, retain: boolean = false): boolean {
    if (!this.client || !this.isConnected) {
      console.error('❌ MQTT client not connected');
      return false;
    }

    try {
      const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
      this.client.publish(topic, messageStr, { retain }, (error) => {
        if (error) {
          console.error(`❌ Failed to publish to ${topic}:`, error);
        } else {
          console.log(`✅ Published to ${topic}:`, message);
        }
      });
      return true;
    } catch (error) {
      console.error(`❌ Error publishing to ${topic}:`, error);
      return false;
    }
  }

  // Kirim warning command
  sendWarning(warningData: WarningCommand): boolean {
    return this.publish(mqttTopics.warning, warningData);
  }

  // Disconnect dari broker
  disconnect(): void {
    if (this.client) {
      this.client.end();
      this.client = null;
      this.isConnected = false;
      this.messageHandlers.clear();
      console.log('🔌 Disconnected from MQTT broker');
    }
  }

  // Getter untuk status koneksi
  get connected(): boolean {
    return this.isConnected;
  }

  // Getter untuk client ID
  get clientId(): string {
    return this.config.clientId;
  }
}

// Singleton instance
export const mqttService = new MQTTService();