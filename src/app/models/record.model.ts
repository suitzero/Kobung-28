export interface VoiceRecord {
  id: string;
  timestamp: Date;
  location: {
    latitude: number;
    longitude: number;
  } | null;
  base64Audio: string;
  mimeType?: string;
  transcription?: string;
}