# Voice Table Quiz: Codex Handoff

## Project

Repository: https://github.com/jayendra435/voice-table-quiz

Local folder:

```text
C:\Users\Jay\Desktop\voice_table_quiz_web
```

This is a browser-based competitive-exam practice trainer. It is deployed as a static site through Netlify, connected to the GitHub `main` branch.

## Current Product Direction

The project has two learning styles:

1. **Audio self-check questions**
   - The browser displays the question.
   - Browser speech synthesis reads the question aloud.
   - The app waits for a configurable number of seconds.
   - The answer is displayed and spoken aloud.
   - The learner checks the answer mentally.
   - There is intentionally no microphone listening or right/wrong submission.

2. **Display-only content questions**
   - The question is displayed silently.
   - The learner solves it on paper or mentally.
   - The answer is revealed by timer or by clicking `Show Answer`.
   - The app waits for the learner to click `Next Question` before advancing.

The app should eventually become a general content engine for mathematics, aptitude, reasoning, GK, science, polity, formulas, and solution methods.

## Current Features

### Generated math modes

- Tables / multiplication
- Addition
- Squares
- Cubes
- Square roots
- Cube roots
- Fraction to percentage
- Percentage to fraction
- Fraction to decimal
- Decimal to fraction

### Math controls

- Tables support minimum and maximum table values.
- Tables support minimum and maximum multiplier values.
- Addition supports digit length per addend:
  - 1 digit + 1 digit
  - 2 digits + 2 digits
  - 3 digits + 3 digits
  - 4 digits + 4 digits
- Question count defaults to `Infinity`.
- A finite question count can be entered.
- Wait time defaults to 5 seconds and can be customized.

### Question pools

Questions are generated into a shuffled pool. A question is removed from the pool after being used. The pool resets only after all valid questions in the selected range have been used.

Changing the practice mode or any range setting resets the pool and starts a fresh cycle. This prevents random repetition before the full selected range is covered.

### JSON content library

Current files:

```text
content/aptitude/profit_loss.json
content/aptitude/percentage.json
content/gk/polity.json
content/gk/culture.json
```

Each sample file currently has at least two related questions. The content mode supports:

- Category selection
- Subject
- Category
- Subcategory
- Title
- Question
- Answer
- Explanation
- Stage
- Difficulty
- Tags
- Source metadata
- `setId` for related questions
- `parentId` for model/practice relationships

The content library is currently sample data for testing the architecture. Accuracy should be reviewed before using the questions for serious exam preparation.

## Important Files

- `index.html`: UI and styling
- `app.js`: quiz engine, generated math, timers, question pools, content loading
- `content/`: JSON-backed question data
- `README.md`: setup and usage notes
- `server.py`: local HTTPS server
- `generate_cert.py`: creates local self-signed certificates
- `.gitignore`: excludes `server.key`, `server.crt`, Python cache, environments, and editor files

## Speech Decision

Do not reintroduce microphone recognition without explicit approval.

The previous implementation used browser `SpeechRecognition`, but Chrome frequently stops and restarts recognition during silence. This caused microphone indicator flicker, notification sounds, and missed answers. The current product intentionally uses speech synthesis only.

The browser's speech synthesis is acceptable for the current audio self-check mode. The learner answers mentally and compares with the spoken/displayed answer.

## Local-First Development Rule

Netlify credits are limited. Do not push every small change.

Use this workflow:

1. Edit locally.
2. Run local validation.
3. Run the local HTTPS server.
4. Test in a desktop browser and, when needed, on the phone using the laptop IP.
5. Make several related changes and test them together.
6. Commit locally as checkpoints.
7. Push to GitHub only when a complete batch is stable and ready for Netlify deployment.

Do not use `git push` during ordinary experimentation.

Local server:

```powershell
cd C:\Users\Jay\Desktop\voice_table_quiz_web
python server.py
```

Open:

```text
https://localhost:8000
```

The local HTTPS server is important because JSON loading with `fetch()` may fail when opening `index.html` directly with a `file://` URL.

For mobile testing on the same Wi-Fi, use:

```text
https://<laptop-ip>:8000
```

The self-signed certificate warning is expected locally.

## Local Validation Checklist

Before considering a change complete:

```powershell
cd C:\Users\Jay\Desktop\voice_table_quiz_web
python -c "import json, pathlib; [json.loads(p.read_text()) for p in pathlib.Path('content').rglob('*.json')]; print('JSON valid')"
git diff --check
```

Then run:

```powershell
python server.py
```

Manually test:

- Tables mode uses every table/multiplier combination once per cycle.
- Addition mode respects selected digit length.
- Squares, cubes, and roots respect their ranges.
- Infinity mode continues until Stop.
- Finite question count stops correctly.
- Changing mode resets the pool.
- Changing a range resets the pool.
- Audio modes speak the question and answer.
- Content mode remains silent.
- Content mode can reveal by timer.
- `Show Answer` reveals the answer.
- `Next Question` is required after content answer reveal.
- Each content JSON category loads successfully.
- Mobile layout remains usable.

If Node.js is installed later, also run:

```powershell
node --check app.js
```

Currently Python and browser checks are the reliable local checks in this workspace.

## Recommended Architecture

Keep generated questions and authored content separate internally, but make them produce the same question shape:

```js
{
  id: "...",
  contentType: "recall | problem | process",
  subject: "aptitude",
  category: "percentage",
  subcategory: "successive_change",
  question: "...",
  answer: "...",
  explanation: "...",
  setId: "...",
  parentId: null,
  stage: "learning | practice | revision",
  difficulty: "easy | medium | hard",
  tags: [],
  source: { type: "", url: "" },
  presentation: {
    audio: false,
    display: true,
    answerReveal: "timer_or_click"
  }
}
```

Use separate JSON files by subject/category instead of one giant JSON file:

```text
content/
  aptitude/
  reasoning/
  gk/
  science/
  polity/
  geography/
  history/
```

Load only the selected JSON file so the site remains fast and Netlify bandwidth stays low.

## Good Future Additions

Prioritize these after the current content flow is stable:

1. Add more accurate GK and aptitude question files.
2. Add a subject dropdown before category selection.
3. Add subcategory filtering.
4. Add `contentType` filters for recall, problem, and process.
5. Add display-only custom timer versus click-only reveal settings.
6. Add a visible explanation section after answer reveal.
7. Add a review queue for questions the learner marks as difficult.
8. Add localStorage progress for content IDs completed.
9. Add import/export of personal JSON question files.
10. Add a local content authoring form that exports valid JSON.

## Content Quality Rules

For real exam preparation:

- Do not rely on sample facts without checking them.
- Store a source URL where practical.
- Keep one fact or method per question.
- Use stable IDs.
- Use consistent lowercase slugs for subject/category/subcategory.
- Keep explanations short but useful.
- Do not duplicate the same question under unrelated categories.
- Use `setId` for a model plus related practice questions.
- Use `parentId` when one question is derived from a model.

## Deployment Rule

Netlify is connected to GitHub and deploys from `main`. A push can consume deployment credits. Batch changes and deploy intentionally.

Before the next push:

```powershell
git status --short --branch
git diff --check
git log -3 --oneline
```

Never commit:

- `server.key`
- `server.crt`
- passwords
- tokens
- personal secrets
- large generated artifacts unless intentionally reviewed

## Current Repository State

The last known published commit is:

```text
c4d133d Expand content categories and manual progression
```

The local app includes the content-library changes described above. Always inspect `git log` and `git status` before starting new work because local changes may exist.

## Working Style for Codex

Before editing:

1. Read the relevant files.
2. State the local hypothesis about the behavior.
3. Identify one focused validation check.
4. Make the smallest coherent change.
5. Run local checks immediately.
6. Do not push automatically.
7. Tell the user what was changed and whether it is only local or published.

Ask for confirmation before pushing a completed batch to GitHub if the user is trying to conserve Netlify deployment credits.
