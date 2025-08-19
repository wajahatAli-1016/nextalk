import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    content: {
        type: String,
        required: false // Not required by default
    },
    messageType: {
        type: String,
        enum: ['text', 'image', 'video'],
        default: 'text'
    },
    fileUrl: {
        type: String,
        required: false
    },
    fileName: {
        type: String
    },
    fileSize: {
        type: Number
    },
    mimeType: {
        type: String
    },
    thumbnailUrl: {
        type: String
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    chat: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chat',
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for faster queries
messageSchema.index({ chat: 1, timestamp: 1 });

const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);

export default Message; 