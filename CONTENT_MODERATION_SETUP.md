# Content Moderation Setup

This application uses Groq API for content moderation to check uploaded images and videos for inappropriate content.

## Setup Instructions

### 1. Get Groq API Key
1. Visit [Groq Console](https://console.groq.com/)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Create a new API key

### 2. Configure Environment Variable
Create a `.env.local` file in the root directory of your project and add:

```env
GROQ_API_KEY=your_actual_groq_api_key_here
```

Replace `your_actual_groq_api_key_here` with the API key you obtained from Groq.

### 3. Restart Your Development Server
After adding the environment variable, restart your Next.js development server:

```bash
npm run dev
```

## How It Works

The content moderation system:

1. **Checks uploaded files** - Only images and videos are moderated
2. **Uses AI analysis** - Groq's AI model analyzes content for:
   - Adult content, nudity, or sexual material
   - Violence, gore, or bloody content
   - Abusive, hateful, or offensive material
   - Illegal activities or dangerous content
   - Graphic or disturbing imagery

3. **Blocks inappropriate content** - If AI detects inappropriate content, the upload is rejected with a clear message

4. **Graceful fallback** - If the moderation service is unavailable, content is blocked for safety

## API Endpoints

- **POST /api/upload** - File upload with content moderation
  - Returns `403` status with reason if content is inappropriate
  - Returns `503` status if moderation service is unavailable

## Security Notes

- The API key is stored in environment variables and not exposed to the client
- Content is analyzed server-side before being stored
- Base64 encoding is used to send file data to Groq API
- Failed moderation attempts block content by default for safety

## Troubleshooting

- **"Content moderation service unavailable"** - Check your API key and internet connection
- **"Content not allowed"** - The AI detected inappropriate content in your upload
- **Upload timeouts** - The moderation service may be slow; try again later 