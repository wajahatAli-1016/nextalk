import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import sharp from "sharp";
import { moderateContent, isContentModerationEnabled } from "../../../lib/contentModeration";

// Configure upload settings
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB (reduced from 50MB)
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];

// Image processing settings (like WhatsApp - smaller size)
const MAX_IMAGE_WIDTH = 800;
const MAX_IMAGE_HEIGHT = 800;
const IMAGE_QUALITY = 70; // JPEG quality
const WEBP_QUALITY = 70; // WebP quality

export async function POST(request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');
        const chatId = formData.get('chatId');
        const senderId = formData.get('senderId');

        if (!file || !chatId || !senderId) {
            return NextResponse.json(
                { message: "File, chatId, and senderId are required" },
                { status: 400 }
            );
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { message: "File size too large. Maximum size is 50MB" },
                { status: 400 }
            );
        }

        // Validate file type
        const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
        const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

        if (!isImage && !isVideo) {
            return NextResponse.json(
                { message: "Invalid file type. Only images and videos are allowed" },
                { status: 400 }
            );
        }

        // Create upload directory if it doesn't exist
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        console.log('Upload directory:', uploadDir);
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        // Generate unique filename
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const fileExtension = path.extname(file.name);
        const fileName = `${timestamp}_${randomString}${fileExtension}`;
        const filePath = path.join(uploadDir, fileName);
        console.log('File path:', filePath);

        let processedBuffer;
        let finalFileName = fileName;
        let finalFileSize = file.size;
        let finalMimeType = file.type;

        // Perform content moderation if enabled
        if (isContentModerationEnabled()) {
            console.log('Content moderation enabled - checking content...');
            
            // Get the file buffer for moderation
            const fileBuffer = Buffer.from(await file.arrayBuffer());
            
            // Perform content moderation
            const moderationResult = await moderateContent(fileBuffer, file.type, file.name);
            
            if (!moderationResult.isAppropriate) {
                return NextResponse.json(
                    { 
                        message: "Content not allowed", 
                        reason: moderationResult.reason || "This type of content is not permitted on our platform." 
                    },
                    { status: 403 }
                );
            }
            
            console.log('Content moderation passed - proceeding with upload');
        } else {
            console.log('Content moderation disabled - proceeding with upload');
        }

        if (isImage) {
            // Process image: resize and compress
            const imageBuffer = Buffer.from(await file.arrayBuffer());
            
            // Get image metadata
            const metadata = await sharp(imageBuffer).metadata();
            
            // Calculate new dimensions while maintaining aspect ratio
            let { width, height } = metadata;
            
            // For very large images, make them even smaller
            const originalWidth = width;
            const originalHeight = height;
            
            if (width > MAX_IMAGE_WIDTH || height > MAX_IMAGE_HEIGHT) {
                const aspectRatio = width / height;
                if (width > height) {
                    width = MAX_IMAGE_WIDTH;
                    height = Math.round(width / aspectRatio);
                } else {
                    height = MAX_IMAGE_HEIGHT;
                    width = Math.round(height * aspectRatio);
                }
            }
            
            // For extremely large images, reduce quality further
            let finalQuality = WEBP_QUALITY;
            if (originalWidth > 2000 || originalHeight > 2000) {
                finalQuality = 60; // Lower quality for very large images
            }

            // Process image based on type
            let sharpInstance = sharp(imageBuffer)
                .resize(width, height, {
                    fit: 'inside',
                    withoutEnlargement: true
                });

            // Convert to WebP for better compression (except for GIFs)
            if (file.type !== 'image/gif') {
                sharpInstance = sharpInstance.webp({ 
                    quality: finalQuality,
                    effort: 6, // Maximum compression effort
                    nearLossless: false // Allow some loss for smaller size
                });
                finalFileName = fileName.replace(/\.[^/.]+$/, '.webp');
                finalMimeType = 'image/webp';
            } else {
                // For GIFs, keep original format but resize
                sharpInstance = sharpInstance.gif();
            }

            processedBuffer = await sharpInstance.toBuffer();
            finalFileSize = processedBuffer.length;
            
            console.log(`Image processed: ${metadata.width}x${metadata.height} -> ${width}x${height}, Quality: ${finalQuality}%, Size: ${file.size} -> ${finalFileSize}`);
        } else {
            // For videos, keep as is
            processedBuffer = Buffer.from(await file.arrayBuffer());
        }

        // Save the processed file
        const finalFilePath = path.join(uploadDir, finalFileName);
        await writeFile(finalFilePath, processedBuffer);

        // Determine message type
        const messageType = isImage ? 'image' : 'video';

        // Create file URL
        const fileUrl = `/uploads/${finalFileName}`;

        // For now, we'll use the same URL for thumbnail (in a real app, you'd generate thumbnails)
        const thumbnailUrl = isImage ? fileUrl : null;

        return NextResponse.json({
            success: true,
            fileUrl,
            thumbnailUrl,
            fileName: file.name,
            fileSize: finalFileSize,
            mimeType: finalMimeType,
            messageType
        });

    } catch (error) {
        console.error("Error uploading file:", error);
        
        // Handle content moderation errors
        if (error.message.includes('Content moderation')) {
            return NextResponse.json(
                { message: "Content moderation service error. Please try again." },
                { status: 503 }
            );
        }
        
        // Handle content moderation timeout
        if (error.message === 'Content moderation timeout') {
            return NextResponse.json(
                { message: "Content moderation service is taking too long. Please try again." },
                { status: 408 }
            );
        }
        
        return NextResponse.json(
            { message: "Failed to upload file", error: error.message },
            { status: 500 }
        );
    }
} 