import { NextRequest, NextResponse } from 'next/server'

export async function POST(request) {
    try {
        const { transcript, formFields } = await request.json()

        const prompt = `
      Extract form field information from this voice input and return as JSON:
      "${transcript}"
      
      Expected fields: ${formFields.join(', ')}
      Return only valid JSON with English values, use empty strings for missing fields.
      
      Example response format:
      {
        "name": "extracted name or empty string",
        "email": "extracted email or empty string",
        "phone": "extracted phone or empty string"
      }
    `

        // Replace with your actual Gemini API call
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`, // Add this to your .env
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        })

        const data = await response.json()

        // Parse Gemini response and extract JSON
        const generatedText = data.candidates[0].content.parts[0].text
        const jsonMatch = generatedText.match(/\{[\s\S]*\}/)

        if (jsonMatch) {
            const extractedData = JSON.parse(jsonMatch[0])
            return NextResponse.json({ success: true, data: extractedData })
        }

        return NextResponse.json({ success: false, error: 'No valid JSON found' })

    } catch (error) {
        console.error('Gemini API error:', error)
        return NextResponse.json({ success: false, error: error.message })
    }
}