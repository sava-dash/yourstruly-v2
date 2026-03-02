import { GoogleGenerativeAI } from '@google/generative-ai'

interface ExtractedDeathCertificateData {
  deceased_name?: string
  deceased_full_name?: string
  date_of_birth?: string
  date_of_death?: string
  place_of_death?: string
  cause_of_death?: string
  certificate_number?: string
  filing_date?: string
  issuing_authority?: string
  raw_text?: string
  extraction_confidence?: number
  error?: string
  manual_review_required?: boolean
}

/**
 * Extract structured data from a death certificate using Gemini Vision
 */
export async function extractDeathCertificateData(
  fileBuffer: Buffer,
  mimeType: string
): Promise<ExtractedDeathCertificateData> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
  
  if (!apiKey) {
    console.warn('Gemini API key not configured')
    return {
      error: 'AI processing not configured',
      manual_review_required: true,
    }
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    // Convert buffer to base64
    const base64Data = fileBuffer.toString('base64')

    const prompt = `You are analyzing a death certificate document. Extract the following information if present:

1. Deceased's full name
2. Date of birth (format as YYYY-MM-DD if possible)
3. Date of death (format as YYYY-MM-DD if possible)
4. Place of death (city, state, country)
5. Cause of death (if visible)
6. Certificate number
7. Filing/registration date
8. Issuing authority/jurisdiction

Respond ONLY in this exact JSON format, using null for any fields you cannot find:
{
  "deceased_name": "First Middle Last",
  "deceased_full_name": "Full name with any suffixes",
  "date_of_birth": "YYYY-MM-DD",
  "date_of_death": "YYYY-MM-DD",
  "place_of_death": "City, State, Country",
  "cause_of_death": "Primary cause if visible",
  "certificate_number": "Certificate ID if present",
  "filing_date": "YYYY-MM-DD",
  "issuing_authority": "County/State/Country",
  "extraction_confidence": 85
}

The extraction_confidence should be a number 0-100 indicating how confident you are in the accuracy of the extracted data.

If this does not appear to be a death certificate or you cannot extract meaningful data, respond with:
{
  "error": "Brief explanation",
  "manual_review_required": true
}

IMPORTANT: Return ONLY valid JSON, no markdown, no explanation.`

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Data,
        },
      },
      { text: prompt },
    ])

    const response = result.response
    const text = response.text()

    // Parse the JSON response
    try {
      // Clean up the response - remove any markdown code blocks
      let cleanedText = text.trim()
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.slice(7)
      }
      if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.slice(3)
      }
      if (cleanedText.endsWith('```')) {
        cleanedText = cleanedText.slice(0, -3)
      }
      cleanedText = cleanedText.trim()

      const extractedData = JSON.parse(cleanedText) as ExtractedDeathCertificateData
      
      // Add raw text for debugging
      extractedData.raw_text = text.substring(0, 500)
      
      return extractedData
    } catch (parseError) {
      console.error('Failed to parse AI response:', text)
      return {
        error: 'Failed to parse AI response',
        raw_text: text.substring(0, 500),
        manual_review_required: true,
      }
    }
  } catch (error) {
    console.error('Gemini API error:', error)
    return {
      error: error instanceof Error ? error.message : 'AI processing failed',
      manual_review_required: true,
    }
  }
}

/**
 * Validate extracted data has minimum required fields
 */
export function hasMinimumExtractedData(data: ExtractedDeathCertificateData): boolean {
  return !!(
    (data.deceased_name || data.deceased_full_name) &&
    (data.date_of_death)
  )
}
