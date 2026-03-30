import 'dotenv/config';
import http from 'http';
import connectDB from './db/db.js';
import app from './app.js';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import projectModel from './models/project.model.js';
import messageModel from './models/message.model.js';
import { generateResult } from './services/ai.service.js';

const port = process.env.PORT || 3000;

try {
    await connectDB();
} catch (err) {
    console.error('Failed to connect to MongoDB:', err.message);
    console.error('Check MONGODB_URI, Atlas IP whitelist (Network Access), and cluster status.');
    process.exit(1);
}

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*'
    }
});


io.use(async (socket, next) => {

    try {

        const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.split(' ')[ 1 ];
        const projectId = socket.handshake.query.projectId;

        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return next(new Error('Invalid projectId'));
        }


        socket.project = await projectModel.findById(projectId);


        if (!token) {
            return next(new Error('Authentication error'))
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded) {
            return next(new Error('Authentication error'))
        }


        socket.user = decoded;

        next();

    } catch (error) {
        next(error)
    }

})


const projectOnlineUsers = {};

io.on('connection', socket => {
    socket.roomId = socket.project._id.toString();


    console.log('a user connected');

    socket.join(socket.roomId);

    // Track online users
    if (!projectOnlineUsers[socket.roomId]) {
        projectOnlineUsers[socket.roomId] = new Set();
    }
    projectOnlineUsers[socket.roomId].add(socket.user.email);
    io.to(socket.roomId).emit('online-users', Array.from(projectOnlineUsers[socket.roomId]));

    socket.on('typing', (data) => {
        socket.broadcast.to(socket.roomId).emit('typing', data);
    });

    socket.on('stop_typing', (data) => {
        socket.broadcast.to(socket.roomId).emit('stop_typing', data);
    });

    socket.on('project-message', async data => {
        try {
            const message = data.message || "";
            const aiIsPresentInMessage = message.includes('@ai');

            // Save incoming user message
            const savedUserMessage = await messageModel.create({
                project: socket.roomId,
                sender: {
                    _id: socket.user._id,
                    email: socket.user.email
                },
                message: message,
                attachment: data.attachment || null
            });

            socket.broadcast.to(socket.roomId).emit('project-message', {
                ...data,
                timestamp: savedUserMessage.createdAt
            });

            if (aiIsPresentInMessage) {

                // Notify clients that AI is generating
                io.to(socket.roomId).emit('ai-typing', { isTyping: true });

                const prompt = message.replace('@ai', '');

                const result = await generateResult(prompt, data.fileTree, data.currentFile);

                // Parse AI result for potential fileTree updates to persist in DB
                try {
                    const parsedResult = JSON.parse(result);
                    if (parsedResult.fileTree) {
                        await projectModel.findByIdAndUpdate(socket.roomId, {
                            fileTree: parsedResult.fileTree
                        });
                    }
                } catch (parseErr) {
                    // If not JSON, it's just a text message, no fileTree update needed
                }

                const aiMessageData = {
                    message: result,
                    sender: {
                        _id: 'ai',
                        email: 'AI'
                    }
                };

                const savedAiMessage = await messageModel.create({
                    project: socket.roomId,
                    sender: aiMessageData.sender,
                    message: result
                });

                aiMessageData.timestamp = savedAiMessage.createdAt;

                io.to(socket.roomId).emit('project-message', aiMessageData)
                
                // Notify clients AI finished
                io.to(socket.roomId).emit('ai-typing', { isTyping: false });

                return
            }
        } catch (err) {
            console.error("Project message error:", err);
            io.to(socket.roomId).emit('ai-typing', { isTyping: false });
        }
    })

    socket.on('project-update', async data => {
        const project = await projectModel.findByIdAndUpdate(socket.roomId, {
            fileTree: data.fileTree
        }, { new: true });
        socket.broadcast.to(socket.roomId).emit('project-update', data);
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
        if (projectOnlineUsers[socket.roomId]) {
            projectOnlineUsers[socket.roomId].delete(socket.user.email);
            io.to(socket.roomId).emit('online-users', Array.from(projectOnlineUsers[socket.roomId]));
        }
        socket.leave(socket.roomId)
    });
});




server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})