from fastapi import FastAPI, Header, HTTPException, status, Depends, File, UploadFile
from pydantic import BaseModel
import os
import pickle
import torch
from PIL import Image, ImageFilter, ImageEnhance
import io
import base64
from torchvision import transforms
import numpy as np
import cv2

app = FastAPI()

AI_API_KEY = os.getenv("AI_API_KEY", "")
AI_API_SECRET = os.getenv("AI_API_SECRET", "")
IMAGE_API_KEY = os.getenv("IMAGE_API_KEY", "")
IMAGE_API_SECRET = os.getenv("IMAGE_API_SECRET", "")

# Global variables for model
model = None
model_loaded = False

# Image preprocessing transform
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

def load_model():
    global model, model_loaded
    try:
        with open('vit.pkl', 'rb') as f:
            model = pickle.load(f)
        model.eval()  # Set to evaluation mode
        model_loaded = True
        print("ViT model loaded successfully")
    except Exception as e:
        print(f"Error loading model: {e}")
        model_loaded = False

# Load model on startup
load_model()

def check_auth(x_api_key: str = Header(...), x_api_secret: str = Header(...)):
    if x_api_key != AI_API_KEY or x_api_secret != AI_API_SECRET:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API credentials")

def check_image_auth(x_api_key: str = Header(...), x_api_secret: str = Header(...)):
    if x_api_key != IMAGE_API_KEY or x_api_secret != IMAGE_API_SECRET:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API credentials")

class PredictRequest(BaseModel):
    image_data: str  # Base64 encoded image

class ImageUploadRequest(BaseModel):
    image: str  # Base64 encoded image

class ImageProcessRequest(BaseModel):
    image_data: str  # Base64 encoded image
    operation: str  # resize, grayscale, blur, sharpen, enhance, denoise, etc.
    params: dict = {}  # Additional parameters for the operation

class ImageProcessResponse(BaseModel):
    processed_image: str  # Base64 encoded processed image
    metadata: dict = {}

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
        "model_status": "loaded" if model_loaded else "not loaded",
        "model_type": "Vision Transformer (ViT)"
    }

@app.get("/ping")
def ping():
    return {"message": "pong"}

@app.post("/predict", response_model=PredictResponse, dependencies=[Depends(check_auth)])
def predict(req: PredictRequest):
    if not model_loaded:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    try:
        # Decode base64 image
        image_data = base64.b64decode(req.image_data)
        image = Image.open(io.BytesIO(image_data)).convert('RGB')
        
        # Preprocess image
        input_tensor = transform(image).unsqueeze(0)  # Add batch dimension
        
        # Make prediction
        with torch.no_grad():
            outputs = model(input_tensor)
            probabilities = torch.nn.functional.softmax(outputs[0], dim=0)
            confidence, predicted_class = torch.max(probabilities, 0)
            
        return {
            "result": f"Predicted class: {predicted_class.item()}, Confidence: {confidence.item():.4f}"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing image: {str(e)}")

@app.post("/predict_file", response_model=PredictResponse, dependencies=[Depends(check_auth)])
async def predict_file(file: UploadFile = File(...)):
    if not model_loaded:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    try:
        # Read image file
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert('RGB')
        
        # Preprocess image
        input_tensor = transform(image).unsqueeze(0)  # Add batch dimension
        
        # Make prediction
        with torch.no_grad():
            outputs = model(input_tensor)
            probabilities = torch.nn.functional.softmax(outputs[0], dim=0)
            confidence, predicted_class = torch.max(probabilities, 0)
            
        return {
            "result": f"Predicted class: {predicted_class.item()}, Confidence: {confidence.item():.4f}"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing image: {str(e)}")

@app.post("/reload_model", dependencies=[Depends(check_auth)])
def reload_model():
    load_model()
    return {"status": "Model reloaded", "loaded": model_loaded}

# ========== IMAGE PROCESSING ENDPOINTS ==========

@app.post("/process_image", response_model=ImageProcessResponse, dependencies=[Depends(check_image_auth)])
async def process_image(req: ImageProcessRequest):
    """
    Process image with various operations
    Supported operations: resize, grayscale, blur, sharpen, enhance, denoise, rotate, flip, crop
    """
    try:
        # Decode base64 image
        image_data = base64.b64decode(req.image_data)
        image = Image.open(io.BytesIO(image_data))
        
        operation = req.operation.lower()
        params = req.params
        
        # Process image based on operation
        if operation == "resize":
            width = params.get("width", 800)
            height = params.get("height", 600)
            image = image.resize((width, height), Image.Resampling.LANCZOS)
            
        elif operation == "grayscale":
            image = image.convert('L')
            
        elif operation == "blur":
            radius = params.get("radius", 2)
            image = image.filter(ImageFilter.GaussianBlur(radius))
            
        elif operation == "sharpen":
            image = image.filter(ImageFilter.SHARPEN)
            
        elif operation == "enhance":
            factor = params.get("factor", 1.5)
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(factor)
            
        elif operation == "brightness":
            factor = params.get("factor", 1.2)
            enhancer = ImageEnhance.Brightness(image)
            image = enhancer.enhance(factor)
            
        elif operation == "denoise":
            # Convert to numpy array for OpenCV processing
            img_array = np.array(image)
            if len(img_array.shape) == 3:
                img_array = cv2.fastNlMeansDenoisingColored(img_array, None, 10, 10, 7, 21)
            else:
                img_array = cv2.fastNlMeansDenoising(img_array, None, 10, 7, 21)
            image = Image.fromarray(img_array)
            
        elif operation == "rotate":
            angle = params.get("angle", 90)
            image = image.rotate(angle, expand=True)
            
        elif operation == "flip":
            direction = params.get("direction", "horizontal")
            if direction == "horizontal":
                image = image.transpose(Image.FLIP_LEFT_RIGHT)
            else:
                image = image.transpose(Image.FLIP_TOP_BOTTOM)
                
        elif operation == "crop":
            left = params.get("left", 0)
            top = params.get("top", 0)
            right = params.get("right", image.width)
            bottom = params.get("bottom", image.height)
            image = image.crop((left, top, right, bottom))
            
        elif operation == "edge_detect":
            image = image.convert('L')
            image = image.filter(ImageFilter.FIND_EDGES)
            
        elif operation == "normalize":
            # Normalize image using OpenCV
            img_array = np.array(image)
            img_array = cv2.normalize(img_array, None, 0, 255, cv2.NORM_MINMAX)
            image = Image.fromarray(img_array)
            
        else:
            raise HTTPException(status_code=400, detail=f"Unknown operation: {operation}")
        
        # Convert processed image to base64
        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        processed_image_base64 = base64.b64encode(buffer.getvalue()).decode()
        
        metadata = {
            "operation": operation,
            "width": image.width,
            "height": image.height,
            "mode": image.mode
        }
        
        return {
            "processed_image": processed_image_base64,
            "metadata": metadata
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing image: {str(e)}")

@app.post("/process_image_file", dependencies=[Depends(check_image_auth)])
async def process_image_file(file: UploadFile = File(...), operation: str = "resize", 
                            width: int = 800, height: int = 600, 
                            factor: float = 1.5, radius: int = 2):
    """
    Process uploaded image file
    """
    try:
        # Read image file
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        # Process based on operation
        if operation == "resize":
            image = image.resize((width, height), Image.Resampling.LANCZOS)
        elif operation == "grayscale":
            image = image.convert('L')
        elif operation == "blur":
            image = image.filter(ImageFilter.GaussianBlur(radius))
        elif operation == "sharpen":
            image = image.filter(ImageFilter.SHARPEN)
        elif operation == "enhance":
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(factor)
        
        # Convert to base64
        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        processed_image_base64 = base64.b64encode(buffer.getvalue()).decode()
        
        return {
            "processed_image": processed_image_base64,
            "metadata": {
                "operation": operation,
                "width": image.width,
                "height": image.height,
                "original_filename": file.filename
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing image: {str(e)}")

@app.get("/image/info")
def image_info():
    return {
        "service": "Image Processing Service",
        "version": "1.0.0",
        "supported_operations": [
            "resize", "grayscale", "blur", "sharpen", "enhance", 
            "brightness", "denoise", "rotate", "flip", "crop",
            "edge_detect", "normalize"
        ]
    }

