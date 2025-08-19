"use client"

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useState, useEffect, useRef } from "react";

export default function Dashboard() {
    const { user, logout } = useAuth();
    const { isDarkMode, toggleTheme } = useTheme();
    const [allUsers, setAllUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedChat, setSelectedChat] = useState(null);
    const [message, setMessage] = useState("");
    const [isMobileView, setIsMobileView] = useState(false);
    const [showMobileChat, setShowMobileChat] = useState(false);
    
    // Chat functionality states
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [deletingMessageId, setDeletingMessageId] = useState(null);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [hasNewMessages, setHasNewMessages] = useState(false);
    
    // Video note states
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [showVideoPreview, setShowVideoPreview] = useState(false);
    const [recordedVideo, setRecordedVideo] = useState(null);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [stream, setStream] = useState(null);
    const [isVideoButtonPressed, setIsVideoButtonPressed] = useState(false);
    
    // Delete confirmation modal states
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [messageToDelete, setMessageToDelete] = useState(null);
    
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const emojiPickerRef = useRef(null);
    const fileInputRef = useRef(null);
    const pollingIntervalRef = useRef(null);
    const videoRef = useRef(null);
    const recordingTimerRef = useRef(null);

    // Common emojis for the picker
    const emojis = [
        "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇",
        "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚",
        "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩",
        "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣",
        "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬",
        "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗",
        "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😯", "😦", "😧",
        "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢",
        "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "💩", "👻", "💀",
        "☠️", "👽", "👾", "🤖", "😺", "😸", "😹", "😻", "😼", "😽",
        "🙀", "😿", "😾", "🙈", "🙉", "🙊", "💌", "💘", "💝", "💖",
        "💗", "💓", "💞", "💕", "💟", "❣️", "💔", "❤️", "🧡", "💛",
        "💚", "💙", "💜", "🖤", "🤍", "🤎", "💯", "💢", "💥", "💫",
        "💦", "💨", "🕳️", "💬", "🗨️", "🗯️", "💭", "💤", "👋", "🤚",
        "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘",
        "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍", "👎", "✊",
        "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️",
        "💪", "🦾", "🦿", "🦵", "🦶", "👂", "🦻", "👃", "🧠", "🫀",
        "🫁", "🦷", "🦴", "👀", "👁️", "👅", "👄", "💋", "🩸", "🩹"
    ];
    
    // Fetch all users excluding current user
    const fetchAllUsers = async () => {
        if (!user?.id) return;
        
        setLoading(true);
        try {
            const response = await fetch(`/api/users?currentUserId=${user.id}`);
            if (response.ok) {
                const data = await response.json();
                setAllUsers(data.users || []);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };

    // Handle search
    const handleSearch = (query) => {
        setSearchQuery(query);
        if (query.trim()) {
            const filtered = allUsers.filter(u => 
                u.username.toLowerCase().includes(query.toLowerCase()) ||
                String(u.mobile).includes(query)
            );
            setFilteredUsers(filtered);
            setShowSearchResults(true);
        } else {
            setFilteredUsers([]);
            setShowSearchResults(false);
        }
    };

    // Fetch user's chats
    const fetchUserChats = async () => {
        if (!user?.id) return;
        
        try {
            const response = await fetch(`/api/chats?userId=${user.id}`);
            if (response.ok) {
                const data = await response.json();
                setChats(data.chats || []);
            }
        } catch (error) {
            console.error("Error fetching chats:", error);
        }
    };

    // Fetch selected chat with messages
    const fetchSelectedChat = async () => {
        if (!selectedChat?._id) return;
        
        try {
            const response = await fetch(`/api/chats/${selectedChat._id}`);
            if (response.ok) {
                const data = await response.json();
                const wasAtBottom = checkIfAtBottom();
                const previousMessageCount = selectedChat?.messages?.length || 0;
                const newMessageCount = data.chat?.messages?.length || 0;
                
                setSelectedChat(data.chat);
                
                // Check if there are new messages
                if (newMessageCount > previousMessageCount) {
                    setHasNewMessages(true);
                }
                
                // Only auto-scroll if user was at the bottom
                if (wasAtBottom) {
                    setTimeout(scrollToBottom, 100);
                    setHasNewMessages(false);
                }
            }
        } catch (error) {
            console.error("Error fetching selected chat:", error);
        }
    };

    // Create or open chat with a user
    const createOrOpenChat = async (otherUser) => {
        if (!user?.id || !otherUser._id) return;
        
        try {
            const response = await fetch('/api/chats', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: user.id,
                    otherUserId: otherUser._id
                })
            });

            if (response.ok) {
                const data = await response.json();
                setSelectedChat(data.chat);
                
                // On mobile, show the chat view
                if (isMobileView) {
                    setShowMobileChat(true);
                }
                
                // If it's a new chat, refresh the chats list
                if (data.isNew) {
                    fetchUserChats();
                }
            }
        } catch (error) {
            console.error("Error creating/opening chat:", error);
        }
    };

    // Open existing chat
    const openChat = async (chatId) => {
        try {
            const response = await fetch(`/api/chats/${chatId}`);
            if (response.ok) {
                const data = await response.json();
                setSelectedChat(data.chat);
                
                // On mobile, show the chat view
                if (isMobileView) {
                    setShowMobileChat(true);
                }
                
                setTimeout(scrollToBottom, 100);
            }
        } catch (error) {
            console.error("Error opening chat:", error);
        }
    };

    // Mobile detection
    useEffect(() => {
        const checkMobileView = () => {
            setIsMobileView(window.innerWidth < 768);
        };
        
        checkMobileView();
        window.addEventListener('resize', checkMobileView);
        
        return () => {
            window.removeEventListener('resize', checkMobileView);
        };
    }, []);

    // Prevent body scrolling on mobile when chat is open
    useEffect(() => {
        if (isMobileView && showMobileChat) {
            // Prevent body scrolling
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
            document.body.style.height = '100%';
        } else {
            // Restore body scrolling
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
            document.body.style.height = '';
        }

        return () => {
            // Cleanup: restore body scrolling when component unmounts
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
            document.body.style.height = '';
        };
    }, [isMobileView, showMobileChat]);

    // Initial data fetch
    useEffect(() => {
        if (user?.id) {
            fetchAllUsers();
            fetchUserChats();
        }
    }, [user]);

    // Refresh selected chat periodically
    useEffect(() => {
        if (selectedChat?._id) {
            const interval = setInterval(fetchSelectedChat, 3000); // Refresh every 3 seconds
            pollingIntervalRef.current = interval;
            
            return () => {
                if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                }
            };
        }
    }, [selectedChat?._id]);
   
   // Close emoji picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
                setShowEmojiPicker(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Cleanup video recording on unmount
    useEffect(() => {
        return () => {
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
            }
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            if (recordedVideo?.url) {
                URL.revokeObjectURL(recordedVideo.url);
            }
        };
    }, [stream, recordedVideo]);

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!message.trim() || !user?.id || !selectedChat) return;

        try {
            const response = await fetch(`/api/chats/${selectedChat._id}/messages`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    content: message,
                    senderId: user.id,
                    messageType: 'text'
                }),
            });

            if (response.ok) {
                setMessage("");
                setShowEmojiPicker(false);
                fetchSelectedChat();
                fetchUserChats(); // Refresh chats list to update last message
                // Always scroll to bottom when sending a message
                setTimeout(scrollToBottom, 100);
            }
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    const handleFileUpload = async (file) => {
        if (!user?.id || !selectedChat) return;

        setIsUploading(true);
        setUploadProgress(0);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('chatId', selectedChat._id);
            formData.append('senderId', user.id);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const uploadData = await response.json();
                
                // Send the media message
                const messageResponse = await fetch(`/api/chats/${selectedChat._id}/messages`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        senderId: user.id,
                        messageType: uploadData.messageType,
                        fileUrl: uploadData.fileUrl,
                        fileName: uploadData.fileName,
                        fileSize: uploadData.fileSize,
                        mimeType: uploadData.mimeType,
                        thumbnailUrl: uploadData.thumbnailUrl
                    }),
                });

                if (messageResponse.ok) {
                    fetchSelectedChat();
                    fetchUserChats();
                    // Always scroll to bottom when sending media
                    setTimeout(scrollToBottom, 100);
                }
            } else {
                const errorData = await response.json();
                if (errorData.message === "Content violates community guidelines") {
                    alert(`❌ Upload blocked: ${errorData.reason}\n\nThis content violates our community guidelines and cannot be uploaded.`);
                } else {
                    alert(errorData.message || 'Upload failed');
                }
            }
        } catch (error) {
            console.error("Error uploading file:", error);
            alert('Upload failed');
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFileUpload(file);
        }
        // Reset the input
        e.target.value = '';
    };

    const deleteMessage = async (messageId, isOwnMessage) => {
        if (!selectedChat || !user?.id) return;

        // Show delete confirmation modal
        setMessageToDelete({ messageId, isOwnMessage });
        setShowDeleteModal(true);
    };

    const confirmDeleteMessage = async () => {
        if (!messageToDelete || !selectedChat || !user?.id) return;

        const { messageId, isOwnMessage } = messageToDelete;
        setDeletingMessageId(messageId);

        try {
            const response = await fetch(`/api/chats/${selectedChat._id}/messages/${messageId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: user.id
                })
            });

            if (response.ok) {
                // Refresh the chat to show updated messages
                fetchSelectedChat();
                fetchUserChats(); // Refresh chats list to update last message
            } else {
                const errorData = await response.json();
                alert(errorData.message || 'Failed to delete message');
            }
        } catch (error) {
            console.error('Error deleting message:', error);
            alert('Failed to delete message');
        } finally {
            setDeletingMessageId(null);
            setShowDeleteModal(false);
            setMessageToDelete(null);
        }
    };

    const cancelDeleteMessage = () => {
        setShowDeleteModal(false);
        setMessageToDelete(null);
    };

    const addEmoji = (emoji) => {
        setMessage(prev => prev + emoji);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const checkIfAtBottom = () => {
        if (!messagesContainerRef.current) return true;
        
        const container = messagesContainerRef.current;
        const threshold = 100; // pixels from bottom to consider "at bottom"
        
        const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
        setIsAtBottom(isAtBottom);
        return isAtBottom;
    };

    const handleScroll = () => {
        checkIfAtBottom();
    };

    const getOtherParticipant = (chat) => {
        if (!user?.id) return null;
        return chat.participants.find(p => p._id !== user.id && p._id !== user._id);
    };

    const getOtherParticipantFromSelected = () => {
        if (!selectedChat || !user?.id) return null;
        const otherParticipant = selectedChat.participants.find(p => p._id !== user.id && p._id !== user._id);
        console.log('Other participant data:', otherParticipant);
        return otherParticipant;
    };

    // Helper function to format timestamps safely
    const formatTimestamp = (timestamp, fallbackText = 'Just now') => {
        const date = new Date(timestamp || new Date());
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
            return fallbackText;
        }
        
        return date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Handle mobile back navigation
    const handleMobileBack = () => {
        setShowMobileChat(false);
        setSelectedChat(null);
    };

    // Video note functions
    const startVideoRecording = async () => {
        // Check if MediaRecorder is supported
        if (!window.MediaRecorder) {
            alert('Video recording is not supported in your browser. Please use a modern browser like Chrome, Firefox, or Safari.');
            return;
        }

        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                }, 
                audio: true 
            });
            
            setStream(mediaStream);
            
            // Try different MIME types for better browser compatibility
            let mimeType = 'video/webm;codecs=vp9';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'video/webm;codecs=vp8';
            }
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'video/webm';
            }
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'video/mp4';
            }
            
            // If none of the preferred types are supported, use the default
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = '';
                console.warn('No preferred MIME types supported, using default');
            }
            
            console.log('Using MIME type for recording:', mimeType);
            
            const recorder = new MediaRecorder(mediaStream, mimeType ? {
                mimeType: mimeType
            } : {});
            
            const chunks = [];
            
            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunks.push(event.data);
                }
            };
            
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: mimeType || 'video/webm' });
                const videoUrl = URL.createObjectURL(blob);
                console.log('Recording stopped, blob created:', {
                    type: blob.type,
                    size: blob.size,
                    mimeType: mimeType || 'video/webm'
                });
                setRecordedVideo({ blob, url: videoUrl, mimeType: mimeType || 'video/webm' });
                setShowVideoPreview(true);
                setIsRecording(false);
                setRecordingTime(0);
                
                // Stop all tracks
                mediaStream.getTracks().forEach(track => track.stop());
                setStream(null);
            };
            
            setMediaRecorder(recorder);
            recorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            
            // Start timer
            recordingTimerRef.current = setInterval(() => {
                setRecordingTime(prev => {
                    if (prev >= 60) { // Max 60 seconds
                        stopVideoRecording();
                        return prev;
                    }
                    return prev + 1;
                });
            }, 1000);
            
        } catch (error) {
            console.error('Error starting video recording:', error);
            if (error.name === 'NotAllowedError') {
                alert('Camera access denied. Please allow camera permissions to record video notes.');
            } else if (error.name === 'NotFoundError') {
                alert('No camera found. Please connect a camera to record video notes.');
            } else {
                alert('Could not access camera. Please check permissions and try again.');
            }
        }
    };

    const stopVideoRecording = () => {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            clearInterval(recordingTimerRef.current);
        }
    };

    const cancelVideoRecording = () => {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            clearInterval(recordingTimerRef.current);
            setIsRecording(false);
            setRecordingTime(0);
            
            // Stop all tracks
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                setStream(null);
            }
        }
    };

    const sendVideoNote = async () => {
        if (!recordedVideo || !user?.id || !selectedChat) return;

        // Check if the video blob is valid
        if (!recordedVideo.blob || recordedVideo.blob.size === 0) {
            alert('Invalid video recording. Please try recording again.');
            return;
        }

        console.log('Starting video note upload with blob size:', recordedVideo.blob.size);

        // Check if file size is reasonable (should be less than 25MB)
        const maxSize = 25 * 1024 * 1024; // 25MB
        if (recordedVideo.blob.size > maxSize) {
            alert('Video note is too large. Please record a shorter video note.');
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);

        try {
            const formData = new FormData();
            
            // Create a proper file with the correct extension based on the MIME type
            const mimeType = recordedVideo.mimeType || recordedVideo.blob.type;
            let fileName = 'video-note.webm';
            if (mimeType.includes('mp4')) {
                fileName = 'video-note.mp4';
            } else if (mimeType.includes('webm')) {
                fileName = 'video-note.webm';
            } else if (mimeType.includes('ogg')) {
                fileName = 'video-note.ogg';
            }
            
            // Create a new File object with the proper name and type
            let videoFile = new File([recordedVideo.blob], fileName, {
                type: mimeType
            });
            
            // Validate that the MIME type is allowed
            const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
            if (!allowedVideoTypes.includes(mimeType)) {
                console.warn('MIME type not in allowed list:', mimeType);
                // Try to use a fallback MIME type
                const fallbackMimeType = 'video/webm';
                const fallbackFileName = 'video-note.webm';
                videoFile = new File([recordedVideo.blob], fallbackFileName, {
                    type: fallbackMimeType
                });
                console.log('Using fallback MIME type:', fallbackMimeType);
            }
            
            console.log('Video file details:', {
                name: videoFile.name,
                type: videoFile.type,
                size: videoFile.size,
                blobType: recordedVideo.blob.type,
                mimeType: mimeType
            });
            
            formData.append('file', videoFile);
            formData.append('chatId', selectedChat._id);
            formData.append('senderId', user.id);

            // Debug: Log FormData contents
            console.log('FormData contents:');
            for (let [key, value] of formData.entries()) {
                if (key === 'file') {
                    console.log(`${key}:`, {
                        name: value.name,
                        type: value.type,
                        size: value.size
                    });
                } else {
                    console.log(`${key}:`, value);
                }
            }

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const uploadData = await response.json();
                
                // Send the video note message
                const messageResponse = await fetch(`/api/chats/${selectedChat._id}/messages`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        senderId: user.id,
                        messageType: 'video',
                        fileUrl: uploadData.fileUrl,
                        fileName: 'Video Note',
                        fileSize: uploadData.fileSize,
                        mimeType: uploadData.mimeType,
                        isVideoNote: true
                    }),
                });

                if (messageResponse.ok) {
                    fetchSelectedChat();
                    fetchUserChats();
                    setTimeout(scrollToBottom, 100);
                }
            } else {
                const errorData = await response.json();
                console.error('Upload error details:', errorData);
                alert(errorData.message || 'Upload failed');
            }
        } catch (error) {
            console.error("Error uploading video note:", error);
            alert('Upload failed');
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
            setShowVideoPreview(false);
            setRecordedVideo(null);
        }
    };

    const cancelVideoPreview = () => {
        setShowVideoPreview(false);
        setRecordedVideo(null);
        if (recordedVideo?.url) {
            URL.revokeObjectURL(recordedVideo.url);
        }
    };

    // Format recording time
    const formatRecordingTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <ProtectedRoute>
            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from { 
                        opacity: 0; 
                        transform: scale(0.9) translateY(-20px);
                    }
                    to { 
                        opacity: 1; 
                        transform: scale(1) translateY(0);
                    }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out;
                }
                .animate-scaleIn {
                    animation: scaleIn 0.3s ease-out;
                }
            `}</style>
            <div className="h-screen flex overflow-hidden fixed inset-0" style={{ background: 'var(--chat-bg)' }}>
                {/* Sidebar - Hidden on mobile when chat is open */}
                <div className={`${
                    isMobileView 
                        ? (showMobileChat ? 'hidden' : 'w-full') 
                        : 'w-1/3'
                } border-r flex flex-col min-w-0`} style={{ background: 'var(--message-bg)', borderColor: 'var(--border-color)' }}>
                    {/* Header */}
                    <div className="p-3 sm:p-4 flex items-center justify-between min-w-0" style={{ background: 'var(--header-bg)', color: 'var(--header-text)' }}>
                        <div className="flex items-center min-w-0 flex-1">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                                <h1 className="text-xl font-bold truncate">
                                    NexTalk
                                </h1>
                                <p className="text-sm opacity-80 truncate">
                                    Connect & Chat
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={toggleTheme}
                                className="bg-white/20 hover:bg-white/30 p-2 rounded transition-colors flex-shrink-0"
                                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                            >
                                {isDarkMode ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                    </svg>
                                )}
                            </button>
                            <button
                                onClick={logout}
                                className="bg-white/20 hover:bg-white/30 px-2 sm:px-3 py-1 rounded text-sm transition-colors flex-shrink-0"
                            >
                                Logout
                            </button>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="p-2" style={{ background: 'var(--message-bg)' }}>
                        <div className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                placeholder="Search users..."
                                className="w-full px-4 py-2 pl-10 rounded-lg focus:outline-none focus:ring-2"
                                style={{
                                    background: 'var(--recent-header-bg)',
                                    color: 'var(--message-text)',
                                    borderColor: 'var(--border-color)',
                                    '--tw-ring-color': 'var(--header-bg)'
                                }}
                            />
                            <svg 
                                className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2"
                                style={{ color: 'var(--message-text-secondary)' }}
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>

                    {/* Search Results */}
                    {showSearchResults && (
                        <div className="flex-1 overflow-y-auto">
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map((searchedUser) => (
                                    <div
                                        key={searchedUser._id}
                                        onClick={() => {
                                            createOrOpenChat(searchedUser);
                                            setSearchQuery("");
                                            setShowSearchResults(false);
                                        }}
                                        className="flex items-center px-4 py-3 cursor-pointer border-b transition-colors"
                                        style={{ 
                                            borderColor: 'var(--border-color)',
                                            background: 'transparent',
                                            ':hover': { background: 'var(--hover-bg)' }
                                        }}
                                    >
                                                                                            <div className="w-10 h-10 bg-[#00A884] rounded-full flex items-center justify-center mr-3 overflow-hidden">
                                                        {searchedUser.profileImage ? (
                                                            <img 
                                                                src={searchedUser.profileImage} 
                                                                alt={searchedUser.username}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <span className="text-white font-bold text-sm">
                                                                {searchedUser.username.charAt(0).toUpperCase()}
                                                            </span>
                                                        )}
                                                    </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--message-text)' }}>
                                                {searchedUser.username}
                                            </h3>
                                            <p className="text-xs truncate" style={{ color: 'var(--message-text-secondary)' }}>
                                                {searchedUser.mobile}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-4 text-center" style={{ color: 'var(--message-text-secondary)' }}>
                                    No users found
                                </div>
                            )}
                        </div>
                    )}

                    {/* Recent Chats Section */}
                    {!showSearchResults && (
                        <div className="flex-1 overflow-hidden flex flex-col">
                            {chats.length > 0 ? (
                                <>
                                    <div className="px-4 py-3 border-b" style={{ 
                                        background: 'var(--recent-header-bg)',
                                        borderColor: 'var(--border-color)',
                                        color: 'var(--recent-header-text)'
                                    }}>
                                        <h2 className="text-sm font-medium">Recent Chats</h2>
                                    </div>
                                    <div className="flex-1 overflow-y-auto">
                                        {chats.map((chat) => {
                                            const otherUser = getOtherParticipant(chat);
                                            if (!otherUser) return null;

                                            return (
                                                <div
                                                    key={chat._id}
                                                    onClick={() => openChat(chat._id)}
                                                    className={`flex items-center px-4 cursor-pointer border-b transition-colors ${
                                                        isMobileView ? 'py-4' : 'py-3'
                                                    }`}
                                                    style={{ 
                                                        borderColor: 'var(--border-color)',
                                                        background: selectedChat?._id === chat._id ? 'var(--active-chat-bg)' : 'transparent',
                                                        ':hover': { background: 'var(--hover-bg)' }
                                                    }}
                                                >
                                                    <div className="w-10 h-10 bg-[#00A884] rounded-full flex items-center justify-center mr-3 overflow-hidden">
                                                        {otherUser.profileImage ? (
                                                            <img 
                                                                src={otherUser.profileImage} 
                                                                alt={otherUser.username}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <span className="text-white font-bold text-sm">
                                                                {otherUser.username.charAt(0).toUpperCase()}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--message-text)' }}>
                                                            {otherUser.username}
                                                        </h3>
                                                        <p className="text-xs truncate" style={{ color: 'var(--message-text-secondary)' }}>
                                                            {chat.lastMessage || "No messages yet"}
                                                        </p>
                                                    </div>
                                                    <div className="text-xs" style={{ color: 'var(--message-text-secondary)' }}>
                                                        {formatTimestamp(chat.lastMessageTime, 'Now')}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center" style={{ color: 'var(--message-text-secondary)' }}>
                                    <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                    <p className="text-lg font-medium">No chats yet</p>
                                    <p className="text-sm">Your conversations will appear here</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Chat Area - Full width on mobile when chat is open, hidden otherwise */}
                <div className={`${
                    isMobileView 
                        ? (showMobileChat ? 'w-full' : 'hidden') 
                        : 'flex-1'
                } flex flex-col min-w-0 h-full overflow-hidden`}>
                    {selectedChat ? (
                        <>
                            {/* Chat Header - Fixed */}
                            <div className="flex-shrink-0 z-50" style={{ background: 'var(--header-bg)', color: 'var(--header-text)' }}>
                                <div className="p-3 sm:p-4">
                                    <div className="flex items-center min-w-0">
                                        {/* Mobile Back Button */}
                                        {isMobileView && (
                                            <button 
                                                onClick={handleMobileBack}
                                                className="mr-2 sm:mr-3 p-1 hover:bg-white/20 rounded flex-shrink-0"
                                            >
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                                </svg>
                                            </button>
                                        )}
                                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-3 flex-shrink-0 overflow-hidden">
                                            {getOtherParticipantFromSelected()?.profileImage ? (
                                                <img 
                                                    src={getOtherParticipantFromSelected().profileImage} 
                                                    alt={getOtherParticipantFromSelected()?.username}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        console.error('Profile image failed to load:', getOtherParticipantFromSelected()?.profileImage);
                                                        e.target.style.display = 'none';
                                                        e.target.nextSibling.style.display = 'block';
                                                    }}
                                                />
                                            ) : (
                                                <span className="font-bold text-lg">
                                                    {getOtherParticipantFromSelected()?.username?.charAt(0).toUpperCase()}
                                                </span>
                                            )}
                                            {!getOtherParticipantFromSelected()?.profileImage && (
                                                <span className="font-bold text-lg">
                                                    {getOtherParticipantFromSelected()?.username?.charAt(0).toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h1 className="text-lg font-semibold truncate">{getOtherParticipantFromSelected()?.username}</h1>
                                            <p className="text-sm opacity-80">Online</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Messages Area - Scrollable */}
                            <div 
                                ref={messagesContainerRef}
                                onScroll={handleScroll}
                                className="flex-1 overflow-y-auto overflow-x-hidden relative" 
                                style={{ background: 'var(--chat-bg)', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            >
                                {/* Scroll to bottom button */}
                                {!isAtBottom && hasNewMessages && (
                                    <button
                                        onClick={() => {
                                            scrollToBottom();
                                            setHasNewMessages(false);
                                        }}
                                        className="absolute bottom-4 right-4 z-10 bg-[#00A884] hover:bg-[#008f72] text-white p-2 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
                                        title="Scroll to latest messages"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                        </svg>
                                    </button>
                                )}

                                {/* Recording indicator */}
                                {isRecording && (
                                    <div className="absolute top-4 right-4 z-10 bg-red-500 text-white px-3 py-1 rounded-full shadow-lg flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                        <span className="text-sm font-medium">Recording {formatRecordingTime(recordingTime)}</span>
                                    </div>
                                )}
                                <div className="p-2 sm:p-4">
                                    {selectedChat.messages.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                            <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                            </svg>
                                            <p className="text-lg font-medium">No messages yet</p>
                                            <p className="text-sm">Start the conversation!</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {selectedChat.messages && selectedChat.messages.length > 0 ? (
                                                selectedChat.messages.map((msg, index) => {
                                                    const senderId = msg.sender?._id || msg.sender;
                                                    const isOwnMessage = senderId === user?.id;
                                                    
                                                    return (
                                                        <div
                                                            key={msg._id || index}
                                                            className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                                                        >
                                                            <div
                                                                className="relative group px-3 py-2 rounded-lg break-words overflow-hidden"
                                                                style={{
                                                                    background: isOwnMessage ? 'var(--own-message-bg)' : 'var(--message-bg)',
                                                                    color: isOwnMessage ? 'var(--own-message-text)' : 'var(--message-text)',
                                                                    wordWrap: 'break-word',
                                                                    overflowWrap: 'break-word',
                                                                    maxWidth: '280px',
                                                                    width: 'fit-content'
                                                                }}
                                                            >
                                                                {msg.messageType === 'text' ? (
                                                                    <p 
                                                                        className="text-sm break-words whitespace-pre-wrap"
                                                                        style={{
                                                                            maxWidth: '260px',
                                                                            lineHeight: '1.4'
                                                                        }}
                                                                    >
                                                                        {msg.content}
                                                                    </p>
                                                                ) : msg.messageType === 'image' ? (
                                                                    <div className="space-y-2">
                                                                        <div className="relative group">
                                                                            <img 
                                                                                src={msg.fileUrl} 
                                                                                alt="Shared image"
                                                                                className="max-w-full h-auto rounded cursor-pointer hover:opacity-90 transition-opacity"
                                                                style={{
                                                                    maxHeight: '250px',
                                                                    maxWidth: '250px',
                                                                    objectFit: 'contain'
                                                                }}
                                                                                onClick={() => window.open(msg.fileUrl, '_blank')}
                                                                                onError={(e) => {
                                                                                    e.target.style.display = 'none';
                                                                                    e.target.nextSibling.style.display = 'block';
                                                                                }}
                                                                            />
                                                                            <div className="hidden text-sm text-red-500">Failed to load image</div>
                                                                        </div>
                                                                        <div className="flex justify-between items-center text-xs opacity-70">
                                                                            {msg.fileName && (
                                                                                <span className="truncate flex-1 mr-2">{msg.fileName}</span>
                                                                            )}
                                                                            {msg.fileSize && (
                                                                                <span className="text-xs opacity-60">
                                                                                    {(msg.fileSize / 1024).toFixed(1)} KB
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ) : msg.messageType === 'video' ? (
                                                                    <div className="space-y-2">
                                                                        {msg.isVideoNote ? (
                                                                            <div className="relative">
                                                                                <div className="relative w-48 h-48 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                                                                                    <video 
                                                                                        controls
                                                                                        className="w-full h-full object-cover rounded-full"
                                                                                        preload="metadata"
                                                                                        style={{
                                                                                            width: '192px',
                                                                                            height: '192px',
                                                                                            objectFit: 'cover'
                                                                                        }}
                                                                                    >
                                                                                        <source src={msg.fileUrl} type={msg.mimeType} />
                                                                                        Your browser does not support the video tag.
                                                                                    </video>
                                                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                                                        <div className="w-16 h-16 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                                                                                            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                                                                <path d="M8 5v14l11-7z"/>
                                                                                            </svg>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                                                                                    📹
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <video 
                                                                                controls
                                                                                className="max-w-full h-auto rounded"
                                                                                preload="metadata"
                                                                                style={{
                                                                                    maxHeight: '250px',
                                                                                    maxWidth: '250px',
                                                                                    objectFit: 'contain'
                                                                                }}
                                                                            >
                                                                                <source src={msg.fileUrl} type={msg.mimeType} />
                                                                                Your browser does not support the video tag.
                                                                            </video>
                                                                        )}
                                                                        <div className="flex justify-between items-center text-xs opacity-70">
                                                                            {msg.fileName && (
                                                                                <span className="truncate flex-1 mr-2">{msg.fileName}</span>
                                                                            )}
                                                                            {msg.fileSize && (
                                                                                <span className="text-xs opacity-60">
                                                                                    {(msg.fileSize / (1024 * 1024)).toFixed(1)} MB
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <p 
                                                                        className="text-sm break-words whitespace-pre-wrap"
                                                                        style={{
                                                                            maxWidth: '260px',
                                                                            lineHeight: '1.4'
                                                                        }}
                                                                    >
                                                                        {msg.content || 'Unsupported message type'}
                                                                    </p>
                                                                )}
                                                                <div className="flex justify-between items-center mt-1">
                                                                    <p className={`text-xs ${
                                                                        isOwnMessage ? 'text-white/70' : 'text-gray-500'
                                                                    }`}>
                                                                        {formatTimestamp(msg.timestamp)}
                                                                    </p>
                                                                    {!isOwnMessage && (
                                                                        <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            {getOtherParticipantFromSelected()?.username}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                
                                                                {/* Delete button - show for all messages */}
                                                                <button
                                                                    onClick={() => deleteMessage(msg._id, isOwnMessage)}
                                                                    disabled={deletingMessageId === msg._id}
                                                                    className={`absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded-full hover:scale-110 ${
                                                                        deletingMessageId === msg._id ? 'opacity-100' : ''
                                                                    } ${
                                                                        isOwnMessage 
                                                                            ? 'hover:bg-red-500 hover:text-white text-gray-400' 
                                                                            : 'hover:bg-orange-500 hover:text-white text-gray-400'
                                                                    }`}
                                                                    title={isOwnMessage ? "Delete your message" : "Delete this message (moderation)"}
                                                                >
                                                                    {deletingMessageId === msg._id ? (
                                                                        <div className={`animate-spin rounded-full h-3 w-3 border-b-2 ${
                                                                            isOwnMessage ? 'border-red-500' : 'border-orange-500'
                                                                        }`}></div>
                                                                    ) : (
                                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                        </svg>
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : null}
                                            <div ref={messagesEndRef} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Bottom Section - Fixed */}
                            <div 
                                className="flex-shrink-0 z-50" 
                                style={{ 
                                    background: 'var(--message-bg)',
                                    paddingBottom: isMobileView ? '40px' : '0px'
                                }}
                            >
                                
                                {/* Emoji Picker */}
                                {showEmojiPicker && (
                                    <div 
                                        ref={emojiPickerRef}
                                        className="border-t p-2 sm:p-4 max-h-48 overflow-y-auto overflow-x-hidden"
                                        style={{ borderColor: 'var(--border-color)' }}
                                    >
                                        <div className="grid grid-cols-6 sm:grid-cols-8 gap-1 sm:gap-2">
                                            {emojis.map((emoji, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() => addEmoji(emoji)}
                                                    className="w-8 h-8 text-lg hover:bg-gray-100 rounded transition-colors flex items-center justify-center"
                                                >
                                                    {emoji}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                )}
                                

                                {/* Video Recording Overlay */}
                                {isRecording && (
                                    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                                        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                                            <div className="text-center">
                                                <div className="mb-4">
                                                    <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-2 animate-pulse">
                                                        <div className="w-12 h-12 bg-white rounded-full"></div>
                                                    </div>
                                                    <p className="text-lg font-semibold text-gray-800">Recording Video Note</p>
                                                    <p className="text-sm text-gray-600">Tap to stop recording</p>
                                                </div>
                                                
                                                <div className="mb-4">
                                                    <div className="text-2xl font-mono text-red-500">
                                                        {formatRecordingTime(recordingTime)}
                                                    </div>
                                                </div>
                                                
                                                <div className="flex justify-center space-x-4">
                                                    <button
                                                        onClick={stopVideoRecording}
                                                        className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition-colors"
                                                    >
                                                        Stop Recording
                                                    </button>
                                                    <button
                                                        onClick={cancelVideoRecording}
                                                        className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Video Preview Modal */}
                                {showVideoPreview && recordedVideo && (
                                    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                                        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                                            <div className="text-center">
                                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Preview Video Note</h3>
                                                
                                                <div className="mb-4 flex justify-center">
                                                    <div className="relative w-64 h-64 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                                                        <video
                                                            ref={videoRef}
                                                            src={recordedVideo.url}
                                                            controls
                                                            className="w-full h-full object-cover rounded-full"
                                                            style={{
                                                                width: '256px',
                                                                height: '256px',
                                                                objectFit: 'cover'
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                
                                                <div className="flex justify-center space-x-4">
                                                    <button
                                                        onClick={sendVideoNote}
                                                        disabled={isUploading}
                                                        className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg transition-colors"
                                                    >
                                                        {isUploading ? 'Sending...' : 'Send Video Note'}
                                                    </button>
                                                    <button
                                                        onClick={cancelVideoPreview}
                                                        className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Delete Confirmation Modal */}
                                {showDeleteModal && messageToDelete && (
                                    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
                                        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform transition-all duration-300 animate-scaleIn">
                                            <div className="text-center">
                                                {/* Animated Warning Icon */}
                                                <div className="mb-6">
                                                    <div className="relative w-20 h-20 bg-gradient-to-br from-red-50 to-red-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg animate-pulse">
                                                        <div className="absolute inset-0 bg-red-200 rounded-full opacity-20 animate-ping"></div>
                                                        <svg className="w-10 h-10 text-red-500 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </div>
                                                </div>

                                                {/* Title and Description */}
                                                <div className="mb-8">
                                                    <h3 className="text-2xl font-bold text-gray-800 mb-3">Delete Message</h3>
                                                    <div className="w-16 h-1 bg-gradient-to-r from-red-400 to-red-600 rounded-full mx-auto mb-4"></div>
                                                    <p className="text-gray-600 leading-relaxed text-sm">
                                                        {messageToDelete.isOwnMessage 
                                                            ? 'Are you sure you want to delete this message? This action cannot be undone and the message will be permanently removed.'
                                                            : 'Are you sure you want to delete this message? You are deleting someone else\'s message as a moderator.'
                                                        }
                                                    </p>
                                                </div>
                                                
                                                {/* Action Buttons */}
                                                <div className="flex flex-col sm:flex-row justify-center gap-3">
                                                    <button
                                                        onClick={confirmDeleteMessage}
                                                        disabled={deletingMessageId === messageToDelete.messageId}
                                                        className="group relative bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-gray-300 disabled:to-gray-400 text-white px-8 py-3 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none disabled:hover:scale-100"
                                                    >
                                                        {deletingMessageId === messageToDelete.messageId ? (
                                                            <>
                                                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                                                <span>Deleting...</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                                <span>Delete Message</span>
                                                            </>
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={cancelDeleteMessage}
                                                        disabled={deletingMessageId === messageToDelete.messageId}
                                                        className="group bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 disabled:from-gray-300 disabled:to-gray-400 text-white px-8 py-3 rounded-xl transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none disabled:hover:scale-100"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>

                                                {/* Close button */}
                                                <button
                                                    onClick={cancelDeleteMessage}
                                                    disabled={deletingMessageId === messageToDelete.messageId}
                                                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors duration-200 p-2 rounded-full hover:bg-gray-100"
                                                >
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Message Input */}
                                <div 
                                    className="border-t p-2 sm:p-4" 
                                    style={{ 
                                        borderColor: 'var(--border-color)',
                                        marginBottom: isMobileView ? '10px' : '0px'
                                    }}
                                >
                                    {/* Upload Progress */}
                                    {isUploading && (
                                        <div className="mb-2 p-2 bg-blue-50 rounded-lg">
                                            <div className="flex items-center space-x-2">
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                                <span className="text-sm text-blue-600">Checking content and uploading...</span>
                                            </div>
                                        </div>
                                    )}
                                    
                                    <form onSubmit={sendMessage} className="flex space-x-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                            className="p-2 text-gray-500 hover:text-[#00A884] hover:bg-gray-100 rounded-full transition-colors"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </button>
                                        
                                        {/* File Upload Button */}
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isUploading}
                                            className="p-2 text-gray-500 hover:text-[#00A884] hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
                                            title="Send image or video"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                            </svg>
                                        </button>
                                        
                                        {/* Video Note Button */}
                                        <button
                                            type="button"
                                            onMouseDown={() => setIsVideoButtonPressed(true)}
                                            onMouseUp={() => setIsVideoButtonPressed(false)}
                                            onMouseLeave={() => setIsVideoButtonPressed(false)}
                                            onTouchStart={() => setIsVideoButtonPressed(true)}
                                            onTouchEnd={() => setIsVideoButtonPressed(false)}
                                            onClick={startVideoRecording}
                                            disabled={isUploading || isRecording}
                                            className={`p-2 rounded-full transition-all duration-200 disabled:opacity-50 ${
                                                isVideoButtonPressed 
                                                    ? 'bg-red-500 text-white scale-110' 
                                                    : 'text-gray-500 hover:text-[#00A884] hover:bg-gray-100'
                                            }`}
                                            title="Press and hold to record video note"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        </button>
                                        
                                        {/* Hidden File Input */}
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*,video/*"
                                            onChange={handleFileSelect}
                                            className="hidden"
                                        />
                                        
                                        <input
                                            type="text"
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            placeholder="Type a message..."
                                            className="flex-1 px-3 sm:px-4 py-2 rounded-full focus:outline-none focus:ring-2 min-w-0"
                                            style={{
                                                background: 'var(--message-bg)',
                                                color: 'var(--message-text)',
                                                border: '1px solid var(--border-color)',
                                                '--tw-ring-color': 'var(--header-bg)'
                                            }}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!message.trim()}
                                            className="bg-[#00A884] hover:bg-[#008f72] disabled:bg-gray-300 text-white p-2 rounded-full transition-colors flex-shrink-0 w-10 h-10 flex items-center justify-center"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                                            </svg>
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </>
                    ) : (
                        // Welcome screen when no chat is selected (desktop only)
                        !isMobileView && (
                            <div className="flex items-center justify-center bg-gray-50 h-full">
                                <div className="text-center text-gray-500">
                                    <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-16 h-16 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <h2 className="text-xl font-semibold text-gray-700 mb-2">Welcome to Chat App</h2>
                                    <p className="text-gray-500">Select a user to start chatting</p>
                                </div>
                            </div>
                        )
                    )}
                </div>
            </div>
        </ProtectedRoute>
    );
}