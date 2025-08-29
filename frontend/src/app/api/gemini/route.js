import { NextResponse } from 'next/server'

export async function POST(request) {
    try {
        const { transcript, formFields, currentFormData } = await request.json()

        // Create context-aware prompt
        const contextInfo = Object.entries(currentFormData)
            .filter(([key, value]) => value)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ')

        const prompt = `
      You are a form filling assistant. Extract information from this voice input and update the form fields.
      
      Voice input: "${transcript}"
      Expected form fields: ${formFields.join(', ')}
      Current form data: ${contextInfo || 'Empty form'}
      
      Rules:
      1. Return ONLY valid JSON
      2. Include only fields that can be extracted from the voice input
      3. Use empty strings for missing information
      4. For dates, use YYYY-MM-DD format
      5. For machine types, use exact matches: "Excavator", "Bulldozer", "Loader", "Crane", etc.
      6. For request types, use: "Support", "Extension", "Cancellation"
      7. For priorities, use: "High", "Medium", "Low"
      
      Example response:
      {
        "machineType": "Excavator",
        "quantity": "2",
        "checkInDate": "2025-09-01",
        "comments": "Need excavators for construction site"
      }
    `

        console.log('Sending request to Gemini API...')

        // Call Gemini API with proper error handling
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        })

        console.log('Gemini API response status:', response.status)

        if (!response.ok) {
            const errorText = await response.text()
            console.error('Gemini API error response:', errorText)
            throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
        }

        const data = await response.json()
        console.log('Gemini API response data:', JSON.stringify(data, null, 2))

        // Check if response has the expected structure
        if (!data || !data.candidates || !Array.isArray(data.candidates) || data.candidates.length === 0) {
            console.error('Unexpected Gemini API response structure:', data)
            throw new Error('Invalid response structure from Gemini API')
        }

        // Check if candidate has content
        const candidate = data.candidates[0]
        if (!candidate || !candidate.content || !candidate.content.parts || !Array.isArray(candidate.content.parts) || candidate.content.parts.length === 0) {
            console.error('No content in Gemini API response:', candidate)
            throw new Error('No content in Gemini API response')
        }

        const generatedText = candidate.content.parts[0].text
        console.log('Generated text:', generatedText)

        // Extract JSON from response
        const jsonMatch = generatedText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
            try {
                const extractedData = JSON.parse(jsonMatch[0])
                console.log('Extracted data:', extractedData)
                return NextResponse.json({ success: true, data: extractedData })
            } catch (parseError) {
                console.error('JSON parse error:', parseError)
                console.error('Failed to parse:', jsonMatch[0])
                return NextResponse.json({ success: false, error: 'Failed to parse extracted JSON' })
            }
        }

        // If no JSON found, try to create a simple response based on keywords
        const fallbackData = createFallbackResponse(transcript, formFields)
        return NextResponse.json({ success: true, data: fallbackData })

    } catch (error) {
        console.error('Gemini API error:', error)
        return NextResponse.json({
            success: false,
            error: error.message || 'Unknown error occurred',
            details: error.stack
        })
    }
}

// Fallback function to extract basic information if Gemini fails
function createFallbackResponse(transcript, formFields) {
    const fallbackData = {}
    const lowerTranscript = transcript.toLowerCase()

    // Basic keyword matching for common form fields
    if (formFields.includes('machineType')) {
        if (lowerTranscript.includes('excavator')) fallbackData.machineType = 'Excavator'
        else if (lowerTranscript.includes('bulldozer')) fallbackData.machineType = 'Bulldozer'
        else if (lowerTranscript.includes('loader')) fallbackData.machineType = 'Loader'
        else if (lowerTranscript.includes('crane')) fallbackData.machineType = 'Crane'
    }

    if (formFields.includes('priority')) {
        if (lowerTranscript.includes('urgent') || lowerTranscript.includes('high')) fallbackData.priority = 'High'
        else if (lowerTranscript.includes('low')) fallbackData.priority = 'Low'
        else fallbackData.priority = 'Medium'
    }

    if (formFields.includes('requestType')) {
        if (lowerTranscript.includes('support') || lowerTranscript.includes('help') || lowerTranscript.includes('maintenance')) {
            fallbackData.requestType = 'Support'
        } else if (lowerTranscript.includes('extend') || lowerTranscript.includes('extension')) {
            fallbackData.requestType = 'Extension'
        } else if (lowerTranscript.includes('cancel') || lowerTranscript.includes('return')) {
            fallbackData.requestType = 'Cancellation'
        }
    }

    // Always include the full transcript as comments
    if (formFields.includes('comments') || formFields.includes('description')) {
        fallbackData.comments = transcript
    }

    console.log('Using fallback response:', fallbackData)
    return fallbackData
}