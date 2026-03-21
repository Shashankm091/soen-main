import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'project',
        required: true
    },
    sender: {
        type: Object, // Stores { _id: string, email: string }, supports "ai" user
        required: true
    },
    message: {
        type: String,
        required: true
    }
}, { timestamps: true });

const Message = mongoose.model('message', messageSchema);
export default Message;
