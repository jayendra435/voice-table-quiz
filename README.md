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
- **Practice Modes**: Addition, tables, squares, cubes, roots, and fraction conversions
- **Alphabet Recall**: Randomly asks alphabet-to-position, position-to-alphabet, mirror-pair, and letter-position difference questions
- **Addition Ranges**: Choose the number of digits in each addend, such as 2-digit + 2-digit or 3-digit + 3-digit
- **Content Library**: JSON-backed display-only questions with subject, category, subcategory, related set, explanation, and source metadata
- **Responsive**: Works on desktop and mobile

## Notes

- Recognition quality depends on your browser's provider (usually very good)
- Internet is needed to load the hosted page and browser speech voices may vary by device

## Content Library

Content questions live in separate files under `content/`. The sample category is:

```text
content/aptitude/profit_loss.json
```

Choose **Content library (display only)** to load a category. Current sample categories include aptitude/profit and loss, aptitude/percentage, GK/polity, and GK/culture. Content questions do not use speech; solve them on paper or mentally, then let the timer reveal the answer or click **Show Answer**. After the answer appears, click **Next Question** to continue. Each sample includes related questions sharing the same `setId`.

