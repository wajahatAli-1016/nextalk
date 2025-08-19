import connectDB from "@/lib/db";
import Chat from "@/models/Chat";
import Message from "@/models/Message";
import { NextResponse } from "next/server";

// POST - Send a message to a chat
export async function POST(request, { params }) {
    try {
        await connectDB();
        const { chatId } = await params;
        const { content, senderId, messageType, fileUrl, fileName, fileSize, mimeType, thumbnailUrl } = await request.json();

        if (!senderId) {
            return NextResponse.json(
                { message: "Sender ID is required" },
                { status: 400 }
            );
        }

        // Validate message type and required fields
        if (messageType === 'text') {
            if (!content || content.trim() === '') {
                return NextResponse.json(
                    { message: "Content is required for text messages" },
                    { status: 400 }
                );
            }
        } else if (messageType === 'image' || messageType === 'video') {
            if (!fileUrl) {
                return NextResponse.json(
                    { message: "File URL is required for media messages" },
                    { status: 400 }
                );
            }
        }

        // Check if chat exists
        const chat = await Chat.findById(chatId);
        if (!chat) {
            return NextResponse.json(
                { message: "Chat not found" },
                { status: 404 }
            );
        }

        // Create message data based on type
        const messageData = {
            sender: senderId,
            chat: chatId,
            messageType: messageType || 'text'
        };

        if (messageType === 'text') {
            messageData.content = content;
        } else if (messageType === 'image' || messageType === 'video') {
            messageData.fileUrl = fileUrl;
            messageData.fileName = fileName;
            messageData.fileSize = fileSize;
            messageData.mimeType = mimeType;
            messageData.thumbnailUrl = thumbnailUrl;
            // For media messages, set a default content for display purposes
            messageData.content = messageType === 'image' ? '📷 Image' : '🎥 Video';
        }

        console.log('Creating message with data:', messageData);

        // Create new message
        const newMessage = await Message.create(messageData);

        // Update chat with new message and last message info
        const lastMessageText = messageType === 'text' ? content : (messageType === 'image' ? '📷 Image' : '🎥 Video');
        await Chat.findByIdAndUpdate(chatId, {
            $push: { messages: newMessage._id },
            lastMessage: lastMessageText,
            lastMessageTime: new Date()
        });

        // Populate the message with sender info
        const populatedMessage = await Message.findById(newMessage._id)
            .populate('sender', 'username mobile');

        return NextResponse.json({ 
            message: populatedMessage 
        }, { status: 201 });
    } catch (error) {
        console.error("Error sending message:", error);
        return NextResponse.json(
            { message: "Failed to send message", error: error.message },
            { status: 500 }
        );
    }
} 