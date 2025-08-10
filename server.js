
const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const PORT = 5000;

// Middleware
app.use(express.json());
app.use(express.static('.'));

// Base de datos local (archivo JSON)
const DB_FILE = 'database.json';

// Inicializar base de datos si no existe
function initDatabase() {
    if (!fs.existsSync(DB_FILE)) {
        const initialData = {
            products: [],
            whatsappNumber: '573242821055',
            lastUpdate: new Date().toISOString()
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    }
}

// Leer datos de la base de datos
function readDatabase() {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error leyendo la base de datos:', error);
        return null;
    }
}

// Escribir datos a la base de datos
function writeDatabase(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error escribiendo en la base de datos:', error);
        return false;
    }
}

// Rutas API
app.get('/api/data', (req, res) => {
    const data = readDatabase();
    if (data) {
        res.json(data);
    } else {
        res.status(500).json({ error: 'Error leyendo los datos' });
    }
});

app.post('/api/data', (req, res) => {
    const newData = {
        ...req.body,
        lastUpdate: new Date().toISOString()
    };
    
    if (writeDatabase(newData)) {
        // Emitir los cambios a todos los clientes conectados
        io.emit('dataUpdated', newData);
        res.json({ success: true, message: 'Datos guardados correctamente' });
    } else {
        res.status(500).json({ error: 'Error guardando los datos' });
    }
});

// Servir el archivo HTML principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Manejar conexiones de WebSocket
io.on('connection', (socket) => {
    console.log('👤 Usuario conectado:', socket.id);
    
    // Enviar datos actuales al usuario que se conecta
    const currentData = readDatabase();
    if (currentData) {
        socket.emit('dataUpdated', currentData);
    }
    
    socket.on('disconnect', () => {
        console.log('👋 Usuario desconectado:', socket.id);
    });
});

// Inicializar y arrancar servidor
initDatabase();
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor corriendo en http://0.0.0.0:${PORT}`);
    console.log(`📊 Base de datos: ${DB_FILE}`);
    console.log(`🔄 WebSockets habilitados para sincronización en tiempo real`);
});
