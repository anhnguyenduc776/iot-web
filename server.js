const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const app = express();
const port = process.env.PORT || 3000;

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

// Serve static files from the current directory
app.use(express.static(__dirname));

// Serve index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve specific files with correct paths
app.get('/style.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'style.css'));
});

app.get('/script.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'script.js'));
});

app.get('/logotruong.jpg', (req, res) => {
    res.sendFile(path.join(__dirname, 'logotruong.jpg'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).send('Something broke!');
});

// Start server
const server = app.listen(port, '0.0.0.0', () => {
    const address = server.address();
    console.log(`Server is running on:`);
    console.log(`- http://localhost:${port}`);
    console.log(`- http://127.0.0.1:${port}`);
    console.log(`- http://172.16.9.222:${port}`);
    console.log(`- https://anhnguyenduc04.site`);
    console.log(`\nNetwork Information:`);
    console.log(`- Address: ${address.address}`);
    console.log(`- Port: ${address.port}`);
    console.log(`- Family: ${address.family}`);
    console.log(`\nTo make the server accessible from any network:`);
    console.log(`1. Configure Windows Firewall to allow port ${port}`);
    console.log(`2. Set up port forwarding on your router for port ${port}`);
    console.log(`3. Configure your domain DNS settings to point to your public IP`);
}); 