import mongoose from 'mongoose';
import 'dotenv/config';

console.log("Connecting to", process.env.MONGODB_URI);
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connection SUCCESSFUL");
    process.exit(0);
  })
  .catch(err => {
    console.error("MongoDB connection FAILED:", err.message);
    process.exit(1);
  });
