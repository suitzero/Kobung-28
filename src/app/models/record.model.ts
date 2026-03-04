export interface VoiceRecord {
  id: string;
  timestamp: Date;
  location: {
    latitude: number;
    longitude: number;
  } | null;
  base64Audio: string;
  transcription?: string;
}