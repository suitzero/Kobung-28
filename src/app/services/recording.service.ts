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
    try {
      const micPerms = await VoiceRecorder.requestAudioRecordingPermission();
      if (!micPerms.value) {
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
        const deviceCanRecord = await VoiceRecorder.canDeviceVoiceRecord();
        if (!deviceCanRecord.value) {
          console.warn("Device cannot voice record");
          alert("Your device or browser does not support voice recording.");
          return;
        }
      } catch (e) {
        console.warn("canDeviceVoiceRecord check failed", e);
      }

      try {
        const canRecord = await VoiceRecorder.hasAudioRecordingPermission();
        if (!canRecord.value) {
          const requested = await VoiceRecorder.requestAudioRecordingPermission();
          if (!requested.value) {
            alert("Microphone permission is required to record audio.");
            return;
          }
        }
      } catch (e) {
        console.warn("Permission check failed", e);
      }

      await VoiceRecorder.startRecording();
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
      const result = await VoiceRecorder.stopRecording();
      this.isRecording.set(false);

      if (result && result.value && result.value.recordDataBase64) {
        const newRecord: VoiceRecord = {
          id: Date.now().toString(),
          timestamp: new Date(),
          location: this.currentRecordLoc,
          base64Audio: result.value.recordDataBase64,
          mimeType: result.value.mimeType || 'audio/mp4' // save mimeType returned by capacitor
        };

        // Save to signal array
        this.records.update(records => [newRecord, ...records]);
        return newRecord;
      }
      return null;
    } catch (error) {
      console.error('Error stopping recording', error);
      alert("Error stopping recording: " + (error as any).message);
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
