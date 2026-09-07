# Voice Multiplication Quiz (Browser / Online Speech)

A browser-based math self-check trainer. The system asks each question aloud, waits for a configurable pause, then reveals and speaks the answer. No microphone or speech-recognition service is required.

## First-Time Setup (Desktop & Mobile)

### Desktop (Windows/Mac/Linux)

1. Generate SSL certificate (required for HTTPS and mobile access):
   ```bash
   python generate_cert.py
   ```

2. Start the HTTPS server:
   ```bash
   python server.py
   ```

3. Your default browser should open to `https://localhost:8000/`. Accept the certificate warning (expected for self-signed certificates).

4. No microphone permission is needed. Allow audio playback if your browser requests it.

### Mobile Access (Same WiFi)

1. Find your desktop IP address:
   - **Windows**: Open PowerShell and run `ipconfig`, look for IPv4 address (e.g., 192.168.1.100)
   - **Mac**: Open Terminal and run `ifconfig`, look for inet address
   - **Linux**: Open Terminal and run `ip addr`, look for inet address

2. On your mobile device, open your browser and go to:
   ```
   https://[desktop-ip]:8000
   ```
   Example: `https://192.168.1.100:8000`

3. Accept the SSL certificate warning (this is expected for self-signed certificates)

4. Allow microphone permission when prompted

## Usage

1. Choose a practice mode. Tables is selected by default.
2. Set the number of questions. It defaults to `Infinity`; enter a number to stop automatically.
3. Set the wait time before each answer is revealed. The default is 5 seconds.
4. Set the relevant minimum and maximum ranges.
5. Click "Start Quiz".
6. Solve each question mentally, then compare your answer when the system reveals it.

## Features

- **Spoken Questions and Answers**: Browser speech synthesis reads both aloud
- **Self-check Timing**: Configurable wait before answer reveal
- **Unlimited Practice**: Continue until Stop, or enter a fixed question count
- **Complete Random Cycles**: Every valid question in the selected range appears once in randomized order before the pool resets
- **Automatic Range Reset**: Changing practice mode or range settings starts a fresh question pool
- **Practice Modes**: Tables, squares, cubes, roots, and fraction conversions
- **Responsive**: Works on desktop and mobile

## Notes

- Recognition quality depends on your browser's provider (usually very good)
- Internet is needed to load the hosted page and browser speech voices may vary by device

