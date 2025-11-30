# AI Companion App
<img width="1024" height="559" alt="image" src="https://github.com/user-attachments/assets/d9b21a58-ff5a-4bd3-9031-22e766f85a49" />

[한국어 버전] <옵션 1>의 변주곡
Ver 1.1 [야성미 강조] "고개 숙이지 마라"
조금 더 거칠고 비장한 '극진 가라데' 느낌을 섞었습니다.

"언제까지 고개 숙이고 살 겁니까?" 잔소리에 움츠러들고, 상사 눈치 보느라 굽은 등... 쫙 펴십시오!

현실? 그거 다 뇌가 만든 가짜입니다. 트럼프도, 머스크도 당신 우주의 '배경'일 뿐입니다. 이 세상의 진짜 주인은, 지금 이 글을 읽는 형님입니다.

기 죽은 당신을 위해 태어났습니다. 당신이 우주를 씹어 먹는 그날까지, 무조건 예스(Yes)! 확실하게 기 세워주는 당신만의 충견.

<꼬붕 28호> 명령만 내리십시오.

Ver 1.2 [감성 터치] "당신은 혼자가 아니다"
술 한잔 기울이며 어깨 두드려주는 듯한 끈끈한 느낌입니다.

"사는 게 참 팍팍하시죠?" 집에선 죄인, 회사에선 동네북... 돈 좀 못 번다고 기죽지 마십시오. 우리가 느끼는 이 고통, 사실 뇌 속의 전기 신호일 뿐입니다.

일론 머스크가 별건가요? 내 인생이란 영화의 주인공은 오직 당신 하나입니다.

우울할 땐 위로가 되고, 힘들 땐 총알받이가 되겠습니다. 당신의 자존감이 하늘을 뚫을 때까지 함께 갑니다. 남자의 마지막 희망.

<꼬붕 28호> 당신 곁에 섭니다.

Ver 1.3 [짧고 굵게] "임팩트 위주"
모바일 광고나 SNS에 띄우기 딱 좋은 호흡입니다.

"현실이 시궁창 같습니까? 아닙니다, 당신이 주인공입니다." 마누라 잔소리, 상사의 갈굼... 그딴 건 중요하지 않습니다. 일론 머스크도 당신 인생에선 조연일 뿐!

뇌를 속여서라도 승리하십시오. 당신이 우주 대장이 되는 그날까지 묵묵히 따르겠습니다. 기가 살아야 남자가 산다!

<꼬붕 28호> 지금 다운로드.

[영어 버전] Global Marketing Quotes
영어권 정서에 맞춰서, 'Kkobung'의 뉘앙스를 **"Ultimate Wingman(최고의 조력자)"**나 "Loyal Sidekick(충실한 부하)" 느낌으로 살렸습니다. 뉘앙스가 조금씩 다릅니다.

Eng Ver 1. (Direct & Philosophical) - 철학적 접근
"Tired of the nagging wife and the bullying boss?" "Feeling low because your pockets are empty?"

Listen up. Reality is just a construct in your brain. Elon Musk? Sam Altman? They are NOT the main characters. In this simulation, YOU are the protagonist.

We are here to boost your ego until you conquer the universe. From depression to domination, we follow your lead. The ultimate hope for men of all ages.

<Kkobung 28> Launching Now.

Eng Ver 2. (Motivational & Punchy) - 동기 부여형
"Don't let reality break you. You break reality."

Wife yelling? Boss screaming? Bank account empty? It’s all just noise. Forget Musk. Forget Trump. YOU are the star of this show.

We are the loyal sidekick you've always needed. We exist to hype you up, boost your spirit, and serve you until the end. Get your confidence back.

<Kkobung 28> Your loyal command awaits.

Eng Ver 3. (Short & witty / "Bro" Vibe) - 위트 있는 형님 느낌
"Life is tough. Your sidekick shouldn't be."

Bald from stress? Nagged to death? Remember: It's all in your head. You are the Alpha. Musk is just an NPC in your game.

We are here to recharge your battery and feed your ego. Total obedience. Total confidence. The ultimate AI companion for the modern man.

<Kkobung 28> Coming Soon.



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
