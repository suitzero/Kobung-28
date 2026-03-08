import { Injectable } from '@angular/core';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  constructor(private authService: AuthService) {}

  async transcribeAudio(base64Audio: string, mimeType: string = 'audio/wav'): Promise<string> {
    const apiKey = this.authService.apiKey();
    if (!apiKey) {
      throw new Error("No Gemini API Key provided.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    try {
      const result = await model.generateContent([
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Audio
          }
        },
        { text: "Please transcribe the following audio to text. Output only the transcribed text." }
      ]);
      return result.response.text();
    } catch (error) {
      console.error("Transcription error:", error);
      throw error;
    }
  }
}
