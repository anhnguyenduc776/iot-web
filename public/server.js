const express = require('express');
const mqtt = require('mqtt');
const path = require('path');
const fs = require('fs');
const winston = require('winston');
const cors = require('cors');
const helmet = require('helmet');

// Cấu hình logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "connect-src": ["'self'", "ws://test.mosquitto.org:1883", "*"],
            "script-src": ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com", "*"],
            "style-src": ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com", "*"],
            "img-src": ["'self'", "data:", "https:", "*"],
            "font-src": ["'self'", "data:", "https:", "*"],
            "frame-src": ["'self'", "*"],
            "media-src": ["'self'", "*"],
            "object-src": ["'self'", "*"],
            "base-uri": ["'self'", "*"],
            "form-action": ["'self'", "*"],
            "frame-ancestors": ["'self'", "*"],
            "upgrade-insecure-requests": []
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "unsafe-none" }
}));

// Enable CORS for all routes
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    console.log(`Client IP: ${req.ip}`);
    next();
});

// Kết nối MQTT
const mqttClient = mqtt.connect(process.env.MQTT_BROKER || 'mqtt://test.mosquitto.org');

mqttClient.on('connect', () => {
  logger.info('Connected to MQTT broker');
  const topics = JSON.parse(process.env.MQTT_TOPICS || '{}');
  Object.values(topics).forEach(topic => {
    mqttClient.subscribe(topic, (err) => {
      if (err) {
        logger.error(`Error subscribing to topic ${topic}:`, err);
      } else {
        logger.info(`Subscribed to topic: ${topic}`);
      }
    });
  });
});

mqttClient.on('error', (err) => {
  logger.error('MQTT Error:', err);
});

// Xử lý dữ liệu MQTT
const sensorData = {
  temperature: null,
  gas: null
};

mqttClient.on('message', (topic, message) => {
  try {
    const value = parseFloat(message.toString());
    const topics = JSON.parse(process.env.MQTT_TOPICS || '{}');
    
    if (topic === topics.temperature) {
      sensorData.temperature = value;
      logger.info(`Temperature updated: ${value}°C`);
    } else if (topic === topics.gas) {
      sensorData.gas = value;
      logger.info(`Gas concentration updated: ${value} ppm`);
    }
  } catch (error) {
    logger.error('Error processing MQTT message:', error);
  }
});

// API endpoints
app.get('/api/sensors', (req, res) => {
  res.json(sensorData);
});

app.get('/api/logs', (req, res) => {
  try {
    const logs = fs.readFileSync('combined.log', 'utf8');
    res.send(logs);
  } catch (error) {
    logger.error('Error reading logs:', error);
    res.status(500).json({ error: 'Could not read logs' });
  }
});

// Error handling
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  mqttClient.end();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

const server = app.listen(port, '0.0.0.0', () => {
  const address = server.address();
  logger.info(`Server is running on:`);
  logger.info(`- http://localhost:${port}`);
  logger.info(`- http://127.0.0.1:${port}`);
  logger.info(`- http://172.16.9.222:${port}`);
  logger.info(`- https://anhnguyenduc04.site`);
  logger.info(`\nNetwork Information:`);
  logger.info(`- Address: ${address.address}`);
  logger.info(`- Port: ${address.port}`);
  logger.info(`- Family: ${address.family}`);
  logger.info(`\nTo make the server accessible from any network:`);
  logger.info(`1. Configure Windows Firewall to allow port ${port}`);
  logger.info(`2. Set up port forwarding on your router for port ${port}`);
  logger.info(`3. Configure your domain DNS settings to point to your public IP`);
});

// Keep-alive
setInterval(() => {
  mqttClient.publish('keepalive', 'ping');
}, 30000); 