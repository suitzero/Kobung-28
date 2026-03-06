import { Component, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { AuthService } from './services/auth.service';
import { RecordingService } from './services/recording.service';
import { GeminiService } from './services/gemini.service';
import { VoiceRecord } from './models/record.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class AppComponent {
  isRecording = computed(() => this.recordingService.isRecording());
  records = computed(() => this.recordingService.records());

  constructor(
    private authService: AuthService,
    private recordingService: RecordingService,
    private geminiService: GeminiService,
    private sanitizer: DomSanitizer
  ) {}

  async toggleRecording() {
    if (this.isRecording()) {
      const record = await this.recordingService.stopRecording();
      if (record) {
        this.transcribe(record);
      }
    } else {
      await this.recordingService.startRecording();
    }
  }

  async transcribe(record: VoiceRecord) {
    if (!this.authService.hasApiKey()) return;

    try {
      this.recordingService.updateTranscription(record.id, 'Transcribing...');
      // Capacitor Voice Recorder usually returns audio/wav or audio/m4a base64 data.
      // Often it's M4A on iOS and WAV/M4A on Android. We'll use audio/wav as a fallback.
      const text = await this.geminiService.transcribeAudio(record.base64Audio, 'audio/mp4');
      this.recordingService.updateTranscription(record.id, text);
    } catch (e) {
      this.recordingService.updateTranscription(record.id, 'Transcription Failed.');
    }
  }

  getAudioUrl(base64: string): SafeUrl {
    // Generate a data URL for the audio element
    const prefix = 'data:audio/mp4;base64,';
    return this.sanitizer.bypassSecurityTrustUrl(prefix + base64);
  }
}