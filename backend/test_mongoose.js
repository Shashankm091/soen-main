import 'dotenv/config';
import mongoose from 'mongoose';
import Message from './models/message.model.js';

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log("Connected to MongoDB");
    
    try {
        const savedAiMessage = new Message({
            project: new mongoose.Types.ObjectId(),
            sender: {
                _id: 'ai',
                email: 'AI'
            },
            message: ""
        });
        
        await savedAiMessage.save();
        console.log("Saved AI message with empty string");
    } catch (err) {
        console.error("Error saving empty string:", err.message);
    }
    
    try {
        const savedAiMessage2 = new Message({
            project: new mongoose.Types.ObjectId(),
            sender: {
                _id: 'ai',
                email: 'AI'
            },
            message: "Hello"
        });
        
        await savedAiMessage2.save();
        console.log("Saved AI message with valid string");
    } catch (err) {
        console.error("Error saving valid string:", err.message);
    }
    
    process.exit(0);
  })
  .catch(err => {
      console.error(err);
      process.exit(1);
  });
