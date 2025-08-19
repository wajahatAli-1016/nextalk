import connectDB from "@/lib/db";
import Chat from "@/models/Chat";
import Message from "@/models/Message";
import { NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";

// DELETE - Delete a specific message
export async function DELETE(request, { params }) {
    try {
        await connectDB();
        const { chatId, messageId } = await params;
        const { userId } = await request.json();

        if (!userId) {
            return NextResponse.json(
                { message: "User ID is required" },
                { status: 400 }
            );
        }

        // Find the message
        const message = await Message.findById(messageId);
        if (!message) {
            return NextResponse.json(
                { message: "Message not found" },
                { status: 404 }
            );
        }

        // Check if user owns the message or is a participant in the chat
        const chat = await Chat.findById(chatId);
        if (!chat) {
            return NextResponse.json(
                { message: "Chat not found" },
                { status: 404 }
            );
        }

        // Check if user is a participant in the chat
        const isParticipant = chat.participants.some(p => p.toString() === userId);
        if (!isParticipant) {
            return NextResponse.json(
                { message: "You can only delete messages in chats you're part of" },
                { status: 403 }
            );
        }

        // Allow deletion if user owns the message OR if it's not their message (for moderation)
        const isOwnMessage = message.sender.toString() === userId;
        if (!isOwnMessage) {
            // For other users' messages, we'll allow deletion but log it for moderation purposes
            console.log(`Moderation: User ${userId} deleted message ${messageId} from user ${message.sender}`);
        }

        // Delete associated file if it's a media message
        if (message.messageType === 'image' || message.messageType === 'video') {
            try {
                if (message.fileUrl) {
                    const filePath = path.join(process.cwd(), 'public', message.fileUrl);
                    await unlink(filePath);
                    console.log('Deleted file:', filePath);
                }
            } catch (fileError) {
                console.error('Error deleting file:', fileError);
                // Continue with message deletion even if file deletion fails
            }
        }

        // Delete the message
        await Message.findByIdAndDelete(messageId);

        // Update chat to remove the message reference
        await Chat.findByIdAndUpdate(chatId, {
            $pull: { messages: messageId }
        });

        // Update chat's last message if this was the last message
        const updatedChat = await Chat.findById(chatId).populate('messages');
        if (updatedChat.messages.length > 0) {
            const lastMessage = updatedChat.messages[updatedChat.messages.length - 1];
            await Chat.findByIdAndUpdate(chatId, {
                lastMessage: lastMessage.content || (lastMessage.messageType === 'image' ? '📷 Image' : '🎥 Video'),
                lastMessageTime: lastMessage.timestamp
            });
        } else {
            // No messages left
            await Chat.findByIdAndUpdate(chatId, {
                lastMessage: null,
                lastMessageTime: null
            });
        }

        return NextResponse.json({ 
            success: true,
            message: "Message deleted successfully" 
        });

    } catch (error) {
        console.error("Error deleting message:", error);
        return NextResponse.json(
            { message: "Failed to delete message", error: error.message },
            { status: 500 }
        );
    }
} 