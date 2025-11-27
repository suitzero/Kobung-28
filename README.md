# AI Companion App

A multiplatform AI companion app built with React Native (Expo) and Node.js, featuring a 3D avatar powered by Google Gemini and Retrieval-Augmented Generation (RAG).

## Features

*   **Multiplatform**: Runs on Android, iOS, and Web (Windows via browser or Electron).
*   **3D Companion**: Interactive 3D avatar using `react-three-fiber`.
*   **AI Powered**: Uses Google Gemini for natural language processing.
*   **Context Aware**: Implements basic RAG to provide context-aware responses.

## Prerequisites

*   Node.js (v18+)
*   npm or yarn
*   Expo Go app (for testing on mobile) or Android/iOS Simulator.
*   Google Gemini API Key (Get it from [Google AI Studio](https://aistudio.google.com/))

## Setup & Running

### Backend

1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file based on `.env.example`:
    ```bash
    cp .env.example .env
    ```
4.  Add your Google Gemini API key to the `.env` file:
    ```
    GEMINI_API_KEY=your_api_key_here
    ```
5.  Start the server:
    ```bash
    npm start
    # Server runs on http://localhost:3000
    ```

### Frontend

1.  Navigate to the `frontend` directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the Expo development server:
    ```bash
    npx expo start
    ```
4.  **Testing**:
    *   **Mobile**: Scan the QR code with Expo Go.
    *   **Web**: Press `w` in the terminal to open in browser.
    *   **Simulator**: Press `i` for iOS or `a` for Android (requires setup).

## Configuration

*   **Backend URL**: If testing on a real device or Android Emulator, update the `backendUrl` in `frontend/App.js`.
    *   Android Emulator: `http://10.0.2.2:3000/chat`
    *   iOS Simulator / Web: `http://localhost:3000/chat`
    *   Physical Device: Use your computer's local IP (e.g., `http://192.168.1.5:3000/chat`).

## Project Structure

*   `frontend/`: React Native Expo app.
    *   `components/CompanionScene.js`: 3D Scene configuration.
    *   `App.js`: Main application logic and UI.
*   `backend/`: Node.js Express server.
    *   `server.js`: API endpoints and RAG/Gemini logic.
