# AURA — Advanced Under-eye Response Assessment

**AURA detects post-operative cognitive decline in a matter of minutes using just your phone camera. No specialist. No wearable. Just your eyes...**

AURA measures six clinically validated eye-movement biomarkers — saccadic velocity, fixation stability, pupil variability, smooth pursuit gain, saccade accuracy, and prosaccade latency — and compares them against a patient's own pre-operative baseline. Google Gemini 2.5 Flash analyzes the longitudinal trend, grounded strictly in peer-reviewed clinical research, and returns a risk stratification for post-operative delirium and subclinical stroke.

---

## Requirements

| Tool | Version |
|------|---------|
| Python | 3.11+ |
| Node.js | 18+ |
| npm | 9+ |

**API keys required:**

| Key | Purpose |
|-----|---------|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `GEMINI_API_KEY` | Google Gemini 2.5 Flash |
| `ELEVENLABS_API_KEY` | ElevenLabs TTS voice guidance |

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-org/UNCP-Hackathon.git
cd UNCP-Hackathon
```

### 2. Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/
GEMINI_API_KEY=your_gemini_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

Start the backend:

```bash
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. Visit `http://localhost:8000/docs` for the interactive API reference.

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

> **Note:** The frontend is configured to point to `http://localhost:8000` by default. To change the API target, edit `src/app/config/api.ts` and set `LOCALHOST = false` to use the deployed backend URL.

---

## Project Structure

```
UNCP-Hackathon/
├── backend/
│   ├── main.py                        # FastAPI app entrypoint, CORS, router mounting
│   ├── requirements.txt
│   ├── .env                           # API keys (not committed)
│   ├── research/                      # Peer-reviewed papers loaded as Gemini context
│   └── services/
│       ├── auth_service.py            # Registration, login, /whoami
│       ├── mongodb_atlas_service.py   # Patient/session CRUD, baseline locking, longitudinal summary
│       ├── gemini_service.py          # Evidence-grounded AI risk analysis
│       └── eleven_labs_service.py     # TTS voice guidance
└── frontend/
    └── src/app/
        ├── config/api.ts              # API base URL toggle (localhost ↔ deployed)
        ├── context/auth-context.tsx   # Auth state, login/register/logout
        └── screens/
            ├── auth-screen.tsx        # Sign in / create account
            ├── baseline-screen.tsx    # Pre-op baseline + reset flow
            ├── instructions-screen.tsx
            ├── eye-test-screen.tsx    # MediaPipe 30Hz eye tracking engine
            ├── voice-test-screen.tsx  # Voice assessment
            ├── results-screen.tsx     # Post-session result summary
            └── dashboard-screen.tsx   # Longitudinal risk dashboard
```

---

## How It Works

### Eye tracking (in-browser, no server)

The exam runs entirely in the browser using **MediaPipe Face Mesh** via WASM. Iris landmarks 468 and 473 provide normalized gaze coordinates at 30Hz. Six metrics are computed:

- **Fixation stability** — standard deviation of gaze position during a static hold
- **Saccadic peak velocity** — maximum iris displacement speed during a target jump
- **Prosaccade latency** — time from stimulus onset to first detectable eye movement, measured using a position-shift method against a pre-jump iris baseline with an 80ms physiological gate
- **Saccade accuracy** — whether the eye lands on the correct side of the target
- **Smooth pursuit gain** — ratio of gaze velocity to target velocity during sinusoidal tracking
- **Pupil variability** — normalized variance of iris width across frames

### Baseline locking

The first completed session becomes the patient's permanent pre-operative baseline. All subsequent sessions compute deltas against it. The baseline can only be cleared via the **Reset Baseline** button on the baseline screen, which deletes all session data and unlocks re-recording for a new surgery or treatment cycle.

### AI analysis (Gemini)

Session metrics are sent to `POST /analyze`. Gemini 2.5 Flash receives the patient's full longitudinal data alongside the contents of `backend/research/` — peer-reviewed papers on ocular biomarkers for post-operative delirium and subclinical stroke. The system prompt strictly prohibits reasoning beyond the research corpus. The response is validated field-by-field and falls back to `inconclusive` if the evidence doesn't support a determination.

### Auth

Email/password registration and login backed by MongoDB (`bcrypt` hashed). Solana wallet sign-in is also supported via `@solana/wallet-adapter-react`. On registration, a linked patient document is auto-created.

---

## API Reference (key endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/register` | Create account + patient document |
| `POST` | `/auth/login` | Login, returns `user_id` + `patient_id` |
| `GET` | `/auth/whoami?user_id=` | Resolve current patient ID |
| `POST` | `/session` | Save a completed session with metrics |
| `GET` | `/session/{patient_id}` | All sessions for a patient |
| `GET` | `/patients/{patient_id}/baseline-status` | Has baseline, session count, reset date |
| `DELETE` | `/patients/{patient_id}/reset` | Clear baseline + all session data |
| `GET` | `/longitudinal/{patient_id}` | Trend summary for Gemini/dashboard |
| `POST` | `/analyze` | Gemini risk analysis (evidence-grounded) |
| `POST` | `/chat` | Research-grounded chat assistant |
