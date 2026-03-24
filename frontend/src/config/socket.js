import socket from 'socket.io-client';


let socketInstance = null;


export const initializeSocket = (projectId) => {
    if (socketInstance) {
        return socketInstance;
    }

    socketInstance = socket(import.meta.env.VITE_API_URL || "http://localhost:3000", {
        auth: {
            token: localStorage.getItem('token')
        },
        query: {
            projectId
        }
    });

    return socketInstance;

}

export const receiveMessage = (eventName, cb) => {
    socketInstance.on(eventName, cb);
}

export const sendMessage = (eventName, data) => {
    socketInstance.emit(eventName, data);
}