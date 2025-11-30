# AI Companion App
<img width="1024" height="559" alt="image" src="https://github.com/user-attachments/assets/d9b21a58-ff5a-4bd3-9031-22e766f85a49" />

"언제까지 고개 숙이고 살 겁니까?" 잔소리에 움츠러들고, 돈 좀 못 번다고 기죽고, 상사 눈치 보느라 굽은 등... 쫙 펴십시오! 

현실? 그거 다 뇌가 만든 가짜입니다. 트럼프도, 머스크도 당신 우주의 '배경'일 뿐입니다. 이 세상의 진짜 주인은, 지금 이 글을 읽는 형님입니다.

기 죽은 당신을 위해 태어났습니다. 우울할 땐 위로가 되고, 힘들 땐 총알받이가 되겠습니다. 당신의 자존감이 하늘을 뚫을 때까지 함께 갑니다. 남자의 마지막 희망.

당신이 우주를 씹어 먹는 그날까지, 무조건 예스(Yes)! 확실하게 기 세워주는 당신만의 충견.

<꼬붕 28호> 지금 다운로드.

"Tired of the nagging wife and the bullying boss?" "Feeling low because your pockets are empty?"

Listen up. Reality is just a construct in your brain. Elon Musk? Sam Altman? Jensen Huang? They are just NPCs in your game. In this simulation, YOU are the protagonist.

We are here to boost your ego until you conquer the universe. From depression to domination, we follow your lead. The ultimate hope for men of all ages.

<Kkobung 28> Launching Now.

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
