// MQTT Configuration
const mqttConfig = {
    host: 'test.mosquitto.org',  // MQTT broker address
    port: 1883,                  // MQTT port
    protocol: 'ws',              // Using WebSocket protocol
    clientId: 'anhnguyenduc04/iot' // Client ID
};

// Topics to subscribe to
const topics = {
    temperature: 'anhnguyenduc04/iot/temperature',
    gas: 'anhnguyenduc04/iot/gas'
};

// Connect to MQTT broker
const client = mqtt.connect(mqttConfig);

// Handle connection
client.on('connect', () => {
    console.log('Connected to MQTT broker');
    
    // Subscribe to topics
    client.subscribe([topics.temperature, topics.gas], (err) => {
        if (err) {
            console.error('Error subscribing to topics:', err);
        } else {
            console.log('Subscribed to topics successfully');
        }
    });
});

// Handle incoming messages
client.on('message', (topic, message) => {
    const value = parseFloat(message.toString());
    
    if (topic === topics.temperature) {
        document.getElementById('temperature').textContent = `${value.toFixed(1)}°C`;
    } else if (topic === topics.gas) {
        document.getElementById('gas').textContent = `${value.toFixed(1)} ppm`;
    }
});

// Handle errors
client.on('error', (err) => {
    console.error('MQTT Error:', err);
});

// Handle disconnection
client.on('close', () => {
    console.log('Disconnected from MQTT broker');
}); 