import mongoose from 'mongoose';

/**
 * Connect once before accepting HTTP traffic. Avoids Mongoose buffering timeouts
 * when findOne/create run before the driver finishes connecting to Atlas.
 */
export default async function connectDB() {
    const uri = process.env.MONGODB_URI;
    if (!uri || typeof uri !== 'string' || !uri.trim()) {
        throw new Error('MONGODB_URI is missing. Set it in backend/.env');
    }

    await mongoose.connect(uri.trim(), {
        serverSelectionTimeoutMS: 20_000,
        socketTimeoutMS: 45_000,
        maxPoolSize: 10,
    });

    console.log('Connected to MongoDB');
}
