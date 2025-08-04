from fastapi import FastAPI, Header, HTTPException, status, Depends
from pydantic import BaseModel
import os

app = FastAPI()

AI_API_KEY = os.getenv("AI_API_KEY", "")
AI_API_SECRET = os.getenv("AI_API_SECRET", "")

def check_auth(x_api_key: str = Header(...), x_api_secret: str = Header(...)):
    if x_api_key != AI_API_KEY or x_api_secret != AI_API_SECRET:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API credentials")

class PredictRequest(BaseModel):
    data: list

class PredictResponse(BaseModel):
    result: str

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/info")
def info():
    return {
        "service": "AI FastAPI",
        "version": "1.0.0",
        "model_status": "not loaded"
    }

@app.get("/ping")
def ping():
    return {"message": "pong"}

@app.post("/predict", response_model=PredictResponse, dependencies=[Depends(check_auth)])
def predict(req: PredictRequest):
    # TODO: Load and run your AI model here
    # For now, just echo input
    return {"result": f"Received {len(req.data)} items"}
