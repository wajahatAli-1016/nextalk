/**
 * Content moderation using Groq API directly
 * @param {Buffer} fileBuffer - The file buffer to check
 * @param {string} mimeType - The MIME type of the file
 * @param {string} fileName - The original filename
 * @returns {Promise<{isAppropriate: boolean, reason?: string}>}
 */
export async function moderateContent(fileBuffer, mimeType, fileName) {
  try {
    // Convert file buffer to base64
    const base64Data = fileBuffer.toString('base64');
    
    // Determine file type for the prompt
    const isImage = mimeType.startsWith('image/');
    const isVideo = mimeType.startsWith('video/');
    
    if (!isImage && !isVideo) {
      return { isAppropriate: true }; // Only moderate images and videos
    }

    const fileType = isImage ? 'image' : 'video';
    
    // Create the moderation prompt
    const prompt = `You are a content moderation system. Analyze this ${fileType} and determine if it contains any of the following inappropriate content:

1. Adult content, nudity, or sexual material
2. Violence, gore, or bloody content
3. Abusive, hateful, or offensive material
4. Illegal activities or dangerous content
5. Graphic or disturbing imagery

Please respond with ONLY a JSON object in this exact format:
{
  "isAppropriate": true/false,
  "reason": "brief explanation if inappropriate, or null if appropriate"
}

The ${fileType} data is provided in base64 format. Be thorough in your analysis and err on the side of caution for user safety.`;

    // Call Groq API directly
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: "You are a content moderation AI that analyzes images and videos for inappropriate content. Always respond with valid JSON."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Data}`
                }
              }
            ]
          }
        ],
        max_tokens: 200,
        temperature: 0.1, // Low temperature for consistent results
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const responseContent = data.choices?.[0]?.message?.content;
    
    if (!responseContent) {
      throw new Error('No response from content moderation service');
    }

    // Parse the JSON response
    let moderationResult;
    try {
      moderationResult = JSON.parse(responseContent);
    } catch (parseError) {
      console.error('Failed to parse moderation response:', responseContent);
      throw new Error('Invalid response from content moderation service');
    }

    return {
      isAppropriate: moderationResult.isAppropriate,
      reason: moderationResult.reason || null
    };

  } catch (error) {
    console.error('Content moderation error:', error);
    
    // If there's an error with the API, we can either:
    // 1. Block the content (safer approach)
    // 2. Allow the content (less restrictive)
    // For safety, we'll block content if moderation fails
    return {
      isAppropriate: false,
      reason: "Content moderation service unavailable. Please try again later."
    };
  }
}

/**
 * Check if content moderation is enabled
 * @returns {boolean}
 */
export function isContentModerationEnabled() {
  // Moderation disabled by default
  return false;
} 