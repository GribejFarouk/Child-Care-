import cv2
import numpy as np
from PIL import Image

def deskew_image(image: np.ndarray) -> np.ndarray:
    """
    Deskew image if tilted.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray = cv2.bitwise_not(gray)
    thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)[1]
    coords = np.column_stack(np.where(thresh > 0))
    angle = cv2.minAreaRect(coords)[-1]
    
    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle
        
    (h, w) = image.shape[:2]
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, angle, 1.0)
    rotated = cv2.warpAffine(image, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    
    return rotated

def generate_preprocessing_variants(image_path: str):
    """
    Generate multiple variants of the image for robust OCR extraction.
    Returns a dict mapping variant names to PIL Image objects, and metadata.
    """
    metadata = {}
    
    # Load image using OpenCV
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError("Impossible de charger l'image pour le prétraitement.")
    
    metadata['original_size'] = img.shape[:2]
    
    # Upscale if small
    h, w = img.shape[:2]
    if w < 1000:
        new_w = 1000
        new_h = int(h * (new_w / w))
        img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_CUBIC)
        metadata['upscaled'] = True
    
    # Deskew
    img = deskew_image(img)
    metadata['deskewed'] = True
    
    variants = {}
    
    # Variant 1: Grayscale + Contrast
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    alpha = 1.5 # Contrast control
    beta = 0    # Brightness control
    contrast = cv2.convertScaleAbs(gray, alpha=alpha, beta=beta)
    variants['grayscale_contrast'] = Image.fromarray(contrast)
    
    # Variant 2: Adaptive Gaussian Thresholding
    # Good for varying illumination
    adaptive = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
    variants['adaptive_threshold'] = Image.fromarray(adaptive)
    
    # Variant 3: Otsu Thresholding
    _, otsu = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    variants['otsu_threshold'] = Image.fromarray(otsu)
    
    return variants, metadata
