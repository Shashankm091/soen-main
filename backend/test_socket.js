import { io } from "socket.io-client";
import jwt from "jsonwebtoken";

const token = jwt.sign({ _id: "64a023b12345678901234567", email: "test@example.com" }, "super_secret_jwt_key_123!");
// Need a valid project ID
console.log("Starting test...");
