const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const mqtt = require('mqtt');
const nodemailer = require('nodemailer');
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
const httpServer = http.createServer(app);
const wss = new WebSocket.Server({ server: httpServer });
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

// Cấu hình transporter cho nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'ducanh20102004@gmail.com',
        pass: 'hqjq yqjz qqjz qqjz' // App Password đã được cung cấp
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Cấu hình ngưỡng cảnh báo
const alertConfig = {
    email: {
        from: 'ducanh20102004@gmail.com',
        to: 'ducanh20102004@gmail.com',
        subject: 'Cảnh báo từ hệ thống IoT'
    },
    thresholds: {
        temperature: 30, // Nhiệt độ cao hơn 30°C sẽ gửi cảnh báo
        humidity: 30    // Độ ẩm thấp hơn 30% sẽ gửi cảnh báo
    },
    interval: 5000 // Thời gian giữa các lần gửi cảnh báo (5 giây)
};

// Biến lưu thời gian gửi cảnh báo cuối cùng
const lastAlertSent = {
    temperature: 0,
    humidity: 0
};

// Biến lưu lịch sử cảnh báo
const alertHistory = [];

// Tạo thư mục data nếu chưa tồn tại
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// File lưu trữ dữ liệu
const dataFile = path.join(dataDir, 'sensor_data.json');
const commandsFile = path.join(dataDir, 'commands.json');

// Khởi tạo file nếu chưa tồn tại
if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify({
        temperature: [],
        humidity: [],
        timestamps: []
    }));
}

if (!fs.existsSync(commandsFile)) {
    fs.writeFileSync(commandsFile, JSON.stringify({
        sleep: [],
        fan: [],
        pump: [],
        light: []
    }));
}

// Thêm endpoint test gửi email
app.post('/api/test-email', (req, res) => {
    console.log('🔄 Bắt đầu gửi email test...');
    
    const mailOptions = {
        from: alertConfig.email.from,
        to: alertConfig.email.to,
        subject: 'Test Email - Hệ thống IoT',
        text: 'Đây là email test từ hệ thống IoT',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #e74c3c;">📧 Test Email</h2>
                <p>Đây là email test từ hệ thống IoT</p>
                <p>Thời gian: ${new Date().toLocaleString('vi-VN')}</p>
            </div>
        `
    };

    console.log('📝 Nội dung email test:', mailOptions);

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('❌ Lỗi khi gửi email test:', error);
            console.error('Chi tiết lỗi:', error.stack);
            res.status(500).json({ 
                error: 'Gửi email thất bại',
                details: error.message 
            });
        } else {
            console.log('✅ Gửi email test thành công!');
            console.log('📨 Thông tin gửi:', info);
            res.json({ 
                message: 'Email đã được gửi',
                info: info 
            });
        }
    });
});

// Cập nhật hàm gửi cảnh báo
function sendAlert(type, value, allData) {
    const now = Date.now();
    const timeSinceLastAlert = now - lastAlertSent[type];
    
    console.log(`⏰ Thời gian từ lần cảnh báo cuối: ${timeSinceLastAlert/1000} giây`);
    
    if (timeSinceLastAlert < alertConfig.interval) {
        console.log(`⏳ Bỏ qua cảnh báo ${type} do quá sớm`);
        return;
    }

    const alertEntry = {
        timestamp: new Date().toLocaleString('vi-VN'),
        type: type,
        value: value,
        message: `${type === 'temperature' ? 'Nhiệt độ' : 'Độ ẩm'} ${value}${type === 'temperature' ? '°C' : '%'} ${type === 'temperature' ? 'vượt ngưỡng' : 'thấp hơn ngưỡng'}`
    };
    alertHistory.push(alertEntry);
    
    if (alertHistory.length > 100) {
        alertHistory.shift();
    }

    const mailOptions = {
        from: alertConfig.email.from,
        to: alertConfig.email.to,
        subject: `[CẢNH BÁO] ${type === 'temperature' ? 'Nhiệt độ cao' : 'Độ ẩm thấp'} - Hệ thống IoT`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #e74c3c;">🚨 CẢNH BÁO QUAN TRỌNG!</h2>
                <p>${type === 'temperature' ? '🌡️ Nhiệt độ đã vượt ngưỡng cho phép!' : '💧 Độ ẩm đã xuống quá thấp!'}</p>
                
                <h3>Chi tiết cảnh báo:</h3>
                <ul>
                    <li>Loại cảnh báo: ${type === 'temperature' ? 'Nhiệt độ cao' : 'Độ ẩm thấp'}</li>
                    <li>Giá trị hiện tại: ${value}${type === 'temperature' ? '°C' : '%'}</li>
                    <li>Ngưỡng cảnh báo: ${type === 'temperature' ? '>' + alertConfig.thresholds.temperature + '°C' : '<' + alertConfig.thresholds.humidity + '%'}</li>
                    <li>Thời gian: ${new Date().toLocaleString('vi-VN')}</li>
                </ul>
            </div>
        `
    };

    console.log('📧 Đang gửi email cảnh báo...');
    console.log('📝 Nội dung email:', mailOptions);

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('❌ Lỗi khi gửi email:', error);
            console.error('Chi tiết lỗi:', error.stack);
        } else {
            console.log('✅ Đã gửi email cảnh báo thành công!');
            console.log('📨 Thông tin gửi:', info);
            lastAlertSent[type] = now;
        }
    });
}

// Hàm kiểm tra và gửi cảnh báo
function checkAndSendAlert(data) {
    console.log('🔍 Kiểm tra điều kiện cảnh báo...');
    console.log('🌡️ Nhiệt độ hiện tại:', data.temperature);
    console.log('💧 Độ ẩm hiện tại:', data.humidity);
    
    // Kiểm tra nhiệt độ cao
    if (data.temperature > alertConfig.thresholds.temperature) {
        console.log('⚠️ Nhiệt độ vượt ngưỡng, gửi cảnh báo...');
        sendAlert('temperature', data.temperature, data);
    }
    
    // Kiểm tra độ ẩm thấp
    if (data.humidity < alertConfig.thresholds.humidity) {
        console.log('⚠️ Độ ẩm thấp hơn ngưỡng, gửi cảnh báo...');
        sendAlert('humidity', data.humidity, data);
    }
}

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
        const data = JSON.parse(message.toString());
        console.log('📊 Nhận được dữ liệu MQTT:', data);
        
        // Cập nhật dữ liệu cảm biến
        if (data.temperature !== undefined) {
            sensorData.temperature = data.temperature;
            console.log(`🌡️ Nhiệt độ mới: ${data.temperature}°C`);
            
            // Kiểm tra và gửi cảnh báo
            if (data.temperature > alertConfig.thresholds.temperature) {
                console.log(`⚠️ Nhiệt độ ${data.temperature}°C vượt ngưỡng ${alertConfig.thresholds.temperature}°C`);
                checkAndSendAlert(data);
            }
        }
        
        if (data.gas !== undefined) {
            sensorData.gas = data.gas;
            console.log(`💨 Nồng độ khí: ${data.gas}`);
        }
        
        if (data.humidity !== undefined) {
            sensorData.humidity = data.humidity;
            console.log(`💧 Độ ẩm mới: ${data.humidity}%`);
            
            // Kiểm tra và gửi cảnh báo
            if (data.humidity < alertConfig.thresholds.humidity) {
                console.log(`⚠️ Độ ẩm ${data.humidity}% thấp hơn ngưỡng ${alertConfig.thresholds.humidity}%`);
                checkAndSendAlert(data);
            }
        }
        
        // Broadcast to WebSocket clients
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
                console.log('📡 Đã gửi dữ liệu đến WebSocket client');
            }
        });
    } catch (error) {
        console.error('❌ Lỗi khi xử lý dữ liệu MQTT:', error);
    }
});

// Kiểm tra kết nối email khi khởi động server
transporter.verify(function(error, success) {
    if (error) {
        console.error('❌ Lỗi kết nối email:', error);
        console.error('Chi tiết lỗi:', error.stack);
    } else {
        console.log('✅ Kết nối email thành công!');
        console.log('📧 Thông tin kết nối:', success);
    }
});

httpServer.listen(port, () => {
  logger.info(`Server is running on port ${port}`);
});
