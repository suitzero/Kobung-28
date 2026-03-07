import { Injectable, signal } from '@angular/core';
import { CapacitorAudioRecorder } from '@capgo/capacitor-audio-recorder';
import { Geolocation } from '@capacitor/geolocation';
import { Filesystem } from '@capacitor/filesystem';
import { VoiceRecord } from '../models/record.model';

@Injectable({
  providedIn: 'root'
})
export class RecordingService {
  isRecording = signal(false);
  records = signal<VoiceRecord[]>([]);

  private currentRecordLoc: VoiceRecord['location'] = null;

  constructor() {
    this.requestPermissions();
  }

  async requestPermissions() {
    try {
      const perms = await CapacitorAudioRecorder.requestPermissions();
      if (perms.recordAudio !== 'granted') {
        console.warn("Microphone permission denied");
      }
    } catch (e) {
      console.warn("Microphone permission error", e);
    }

    try {
      await Geolocation.requestPermissions();
    } catch (e) {
      console.warn("Geolocation permission error", e);
    }
  }

  async startRecording() {
    try {
      try {
        const perms = await CapacitorAudioRecorder.checkPermissions();
        if (perms.recordAudio !== 'granted') {
          const requested = await CapacitorAudioRecorder.requestPermissions();
          if (requested.recordAudio !== 'granted') {
            alert("Microphone permission is required to record audio.");
            return;
          }
        }
      } catch (e) {
        console.warn("Permission check failed", e);
      }

      await CapacitorAudioRecorder.startRecording();
      // Set to true after ensuring startRecording didn't throw
      this.isRecording.set(true);

      // Try to get location without blocking the recording start
      Geolocation.getCurrentPosition({ timeout: 10000 })
        .then(position => {
          this.currentRecordLoc = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
        })
        .catch(err => {
          console.warn('Could not get location', err);
          this.currentRecordLoc = null;
        });

    } catch (error) {
      console.error('Error starting recording', error);
      alert("Error starting recording: " + (error as any).message);
      this.isRecording.set(false);
    }
  }

  async stopRecording(): Promise<VoiceRecord | null> {
    try {
      const result = await CapacitorAudioRecorder.stopRecording();
      this.isRecording.set(false);

      if (result) {
        let base64Audio = '';
        let mimeType = 'audio/aac';

        if (result.blob) {
          // Web platform
          mimeType = result.blob.type || mimeType;
          base64Audio = await this.blobToBase64(result.blob);
        } else if (result.uri) {
          // Native platforms
          try {
            const fileResult = await Filesystem.readFile({
              path: result.uri
            });
            base64Audio = fileResult.data as string;
            if (result.uri.endsWith('.m4a') || result.uri.endsWith('.mp4')) {
              mimeType = 'audio/mp4';
            } else if (result.uri.endsWith('.wav')) {
              mimeType = 'audio/wav';
            } else if (result.uri.endsWith('.webm')) {
              mimeType = 'audio/webm';
            } else if (result.uri.endsWith('.aac')) {
              mimeType = 'audio/aac';
            } else {
              mimeType = 'audio/aac';
            }
          } catch (readErr) {
             console.error('Error reading native audio file', readErr);
          }
        }

        if (base64Audio) {
           const newRecord: VoiceRecord = {
            id: Date.now().toString(),
            timestamp: new Date(),
            location: this.currentRecordLoc,
            base64Audio: base64Audio,
            mimeType: mimeType
          };

          // Save to signal array
          this.records.update(records => [newRecord, ...records]);
          return newRecord;
        }
      }
      return null;
    } catch (error) {
      console.error('Error stopping recording', error);
      alert("Error stopping recording: " + (error as any).message);
      this.isRecording.set(false);
      return null;
    }
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // The result from readAsDataURL includes the data prefix (e.g., data:audio/webm;base64,....)
          // We need to strip it to get just the base64 part.
          const base64Part = reader.result.split(',')[1];
          resolve(base64Part || '');
        } else {
          resolve('');
        }
      };
      reader.readAsDataURL(blob);
    });
  }

  updateTranscription(id: string, text: string) {
    this.records.update(records =>
      records.map(r => r.id === id ? { ...r, transcription: text } : r)
    );
  }
}