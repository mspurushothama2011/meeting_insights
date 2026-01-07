# Intelligent Meeting Insights Platform (IMIP)

A powerful AI-driven platform for processing meeting recordings, generating summaries, and extracting actionable insights using Google's Gemini models.

## 🚀 Features

- **Audio Processing**: Upload and process meeting recordings (supports various formats).
- **AI-Powered Summarization**: Uses Google Gemini 1.5/2.0 Flash for accurate and fast meeting summaries.
- **Action Items**: Automatically extracts tasks and action items from conversations.
- **Searchable Transcripts**: Full-text search across meeting archives.
- **Secure Authentication**: User management with JWT-based authentication.

## 🛠 Tech Stack

### Frontend
- **Framework**: React (Vite)
- **Styling**: TailwindCSS
- **State Management**: React Hooks
- **Language**: JavaScript

### Backend
- **Framework**: FastAPI (Python)
- **Database**: MongoDB (with Beanie ODM)
- **AI Model**: Google Gemini 1.5 Flash / 2.0 Flash
- **Audio Processing**: Faster-Whisper, PyDub
- **Deployment**: Render (Backend) + Vercel (Frontend)

## 📂 Project Structure

```
.
├── frontend/           # React application source code
├── backend/            # FastAPI backend source code
│   ├── app/            # API logic, models, and routes
│   └── tools/          # Utility scripts
├── archive/            # Archived legacy files
└── render.yaml         # Render deployment configuration
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Python (3.10+)
- MongoDB Atlas Account
- Google Gemini API Key

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd imip_cln
   ```

2. **Setup Backend**
   ```bash
   cd backend
   python -m venv venv
   # Activate venv:
   # Windows: ..\venv\Scripts\activate
   # Linux/Mac: source ../venv/bin/activate
   pip install -r requirements.txt
   
   # Create .env file with your API keys (see .env.example)
   python main.py
   ```

3. **Setup Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## 📦 Deployment

### Backend (Render)
This project is configured for Render.
1. Connect your repo to Render.
2. Select `backend` as the Root Directory.
3. Build Command: `pip install -r requirements.txt`
4. Start Command: `uvicorn main:app --host 0.0.0.0 --port 10000`

### Frontend (Vercel)
1. Provide the `frontend` directory as the project root.
2. Set `VITE_API_URL` to your Render backend URL.
3. Deploy!

## 📄 License
MIT
