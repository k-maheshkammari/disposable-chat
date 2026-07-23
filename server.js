const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// ఆడియో కోసం సైజ్ లిమిట్ 50MB
const io = new Server(server, {
    maxHttpBufferSize: 5e7 
});

app.use(express.static('public'));

io.on('connection', (socket) => {
    
    // రూమ్ క్రియేషన్
    socket.on('create_room', () => {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        socket.join(code);
        socket.emit('room_created', code);
    });

    // రూమ్ లో జాయిన్ అవ్వడం
    socket.on('join_room', (code) => {
        const room = io.sockets.adapter.rooms.get(code);
        if (room && room.size === 1) {
            socket.join(code);
            io.to(code).emit('room_joined', code);
        } else {
            socket.emit('error_msg', 'Invalid Code or Room is Full!');
        }
    });

    // టెక్స్ట్ మెసేజ్
    socket.on('send_message', (data) => {
        socket.to(data.room).emit('receive_message', data.message);
    });

    // వాయిస్ మెసేజ్
    socket.on('send_voice', (data) => {
        socket.to(data.room).emit('receive_voice', data.audio);
    });

    // 1. ఎండ్ బటన్ నొక్కినప్పుడు (Manual End)
    socket.on('end_chat', (room) => {
        io.to(room).emit('chat_ended'); 
        io.in(room).socketsLeave(room); 
    });

    // 2. కొత్త లాజిక్: ఎవరైనా రిఫ్రెష్ చేసినా, ట్యాబ్ క్లోజ్ చేసినా (Auto End)
    socket.on('disconnecting', () => {
        // కనెక్షన్ కట్ అవుతున్న యూజర్ ఏ రూమ్స్ లో ఉన్నాడో చెక్ చేస్తాం
        socket.rooms.forEach((room) => {
            if (room !== socket.id) {
                // ఆ రూమ్ లో మిగిలి ఉన్న రెండో యూజర్ కి ఎండ్ సిగ్నల్ పంపుతాం
                socket.to(room).emit('chat_ended');
            }
        });
    });

});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 సర్వర్ రన్ అవుతోంది: http://localhost:${PORT}`);
});