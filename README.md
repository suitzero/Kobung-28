# Kobung-28

A lightweight mobile-friendly web application for the Supreme Leader ("형님") to submit tasks (voice/photo) to the queue.

## Features

-   **Clean & Simple UI**: Optimized for mobile use.
-   **Voice & Photo Capture**: Record audio or take photos directly from the browser.
-   **Queue System**: Submits tasks to a local SQLite database for processing.
-   **Real-time Status**: Polls for task completion and displays the final report.

## Prerequisites

-   Python 3.8+
-   OpenAI API Key (for Whisper STT)

## Setup

1.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```

2.  Configure environment variables:
    -   Copy `.env.example` to `.env` (if provided, otherwise create `.env`).
    -   Add your OpenAI API key:
        ```
        OPENAI_API_KEY=your_api_key_here
        ```

3.  Run the application:
    ```bash
    uvicorn app.main:app --host 0.0.0.0 --port 8000
    ```

4.  Access the app:
    -   Open `http://localhost:8000` in your browser.
    -   On mobile, access via your computer's IP address (e.g., `http://192.168.1.x:8000`).
    -   **Note**: For camera/microphone access on mobile devices not on localhost, you may need HTTPS. Use a tunneling service like `ngrok` or set up SSL.

## Usage

1.  **Take Photo**: Click "Take Photo" to activate the camera. Click "Capture" to take a picture.
2.  **Record Audio**: Click "Record Audio" to start recording. Click "Stop Recording" to finish.
3.  **Send**: Click "Send to Hyung-nim" to submit your inputs.
4.  **Wait**: The app will poll for the result. Once processed, the "Final Report" will be displayed.

## Database

The application uses a local SQLite database `db.sqlite3` with a table `inputs`.
-   `id`: Task ID.
-   `text_payload`: Transcribed text from audio.
-   `image_path`: Path to the uploaded image.
-   `status`: 'pending' or 'completed'.
-   `response_text`: The final answer/report.
-   `created_at`: Timestamp.

External agents/processes should monitor this table, process 'pending' tasks, update `response_text`, and set `status` to 'completed'.
