import { Injectable, signal } from '@angular/core';
import { VoiceRecorder } from 'capacitor-voice-recorder';
import { Geolocation } from '@capacitor/geolocation';
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
    const micPerms = await VoiceRecorder.requestAudioRecordingPermission();
    if (!micPerms.value) {
      console.warn("Microphone permission denied");
    }

    try {
      await Geolocation.requestPermissions();
    } catch (e) {
      console.warn("Geolocation permission error", e);
    }
  }

  async startRecording() {
    try {
      const canRecord = await VoiceRecorder.hasAudioRecordingPermission();
      if (!canRecord.value) {
        await VoiceRecorder.requestAudioRecordingPermission();
      }

      await VoiceRecorder.startRecording();
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
      this.isRecording.set(false);
    }
  }

  async stopRecording(): Promise<VoiceRecord | null> {
    try {
      const result = await VoiceRecorder.stopRecording();
      this.isRecording.set(false);

      if (result && result.value && result.value.recordDataBase64) {
        const newRecord: VoiceRecord = {
          id: Date.now().toString(),
          timestamp: new Date(),
          location: this.currentRecordLoc,
          base64Audio: result.value.recordDataBase64
        };

        // Save to signal array
        this.records.update(records => [newRecord, ...records]);
        return newRecord;
      }
      return null;
    } catch (error) {
      console.error('Error stopping recording', error);
      this.isRecording.set(false);
      return null;
    }
  }

  updateTranscription(id: string, text: string) {
    this.records.update(records =>
      records.map(r => r.id === id ? { ...r, transcription: text } : r)
    );
  }
}
