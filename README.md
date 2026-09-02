# Voice Multiplication Quiz (Browser / Online Speech)

A web-based multiplication table quiz using the browser's Web Speech API for online speech recognition (no API keys). Uses Web Speech Synthesis API for voice output. Available in modern browsers (Chrome, Edge, Firefox has partial support).

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

4. Allow microphone access when prompted.

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
2. Set the number of questions. It defaults to `Infinity`; enter a number to stop automatically, or change it while playing.
3. For tables, set minimum/maximum table and multiplier values. The labels and ranges change for squares, cubes, and roots.
4. Click "Start Quiz"
5. Answer questions by speaking:
   - "323" (numeric)
   - "three two three" (spaced digits)
   - "three hundred twenty-three" (spelled out)
   - "323 answer" (filler words are filtered)
6. View statistics anytime by clicking "Stats"

## Features

- **Voice Recognition**: Browser's native Web Speech API (no API keys needed)
- **Analytics**: localStorage-based statistics (accuracy, streaks, response time, last played)
- **Revision Queue**: Automatically revisits wrong answers every 5 questions
- **Commute Mode**: 5-second pause with audio beep before listening
- **Modern UI**: Gradient backgrounds, progress bar, live statistics panel
- **Responsive**: Desktop and mobile (with HTTPS)
- **Input Fallback**: Type answers if speech recognition fails
- **Fraction Speech**: Fractions such as `3/4` are spoken as "3 by 4"; spoken "by" and "over" are accepted as fraction separators

## Notes

- Recognition quality depends on your browser's provider (usually very good)
- Mobile requires HTTPS connection (use IP address on same WiFi)
- Browsers may request microphone permission on first use
- Statistics and revision queue stored locally (never sent to server)

