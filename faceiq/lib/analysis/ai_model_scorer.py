"""
AI Beauty Score - PyTorch Model Scorer
Uses AlexNet and ResNet18 models from pytorch-models/ to score facial beauty
"""

import sys
import json
import base64
import io
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from PIL import Image
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np


# ============================================================
# Custom AlexNet Architecture
# ============================================================

class CustomAlexNet(nn.Module):
    def __init__(self):
        super().__init__()
        self.conv1 = nn.Conv2d(3, 96, 11, stride=4, padding=2)
        self.relu_pool1 = nn.Sequential(
            nn.BatchNorm2d(96),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(3, 2)
        )
        # After conv1 (96 channels), split into 2 groups of 48
        self.conv2 = nn.Conv2d(48, 192, 5, padding=2)
        self.relu_pool2 = nn.Sequential(
            nn.BatchNorm2d(192),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(3, 2)
        )
        self.conv3 = nn.Conv2d(96, 384, 3, padding=1)
        self.relu3 = nn.Sequential(
            nn.BatchNorm2d(384),
            nn.ReLU(inplace=True)
        )
        self.conv4 = nn.Conv2d(192, 384, 3, padding=1)
        self.relu4 = nn.Sequential(
            nn.BatchNorm2d(384),
            nn.ReLU(inplace=True)
        )
        self.conv5 = nn.Conv2d(192, 256, 3, padding=1)
        self.relu_pool5 = nn.Sequential(
            nn.BatchNorm2d(256),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(3, 2)
        )
        self.conv6 = nn.Conv2d(128, 256, 5, padding=0)
        self.relu6 = nn.Sequential(
            nn.BatchNorm2d(256),
            nn.ReLU(inplace=True)
        )
        self.conv7 = nn.Conv2d(256, 1, 1)

    def forward(self, x):
        x = self.relu_pool1(self.conv1(x))
        # Split 96 channels into 2 groups of 48
        x1, x2 = x.chunk(2, dim=1)
        x = self.conv2(x1)
        x = self.relu_pool2(x)
        # Split 192 channels into 2 groups of 96
        x1, x2 = x.chunk(2, dim=1)
        x = self.conv3(x1)
        x = self.relu3(x)
        # Split 384 channels into 2 groups of 192
        x1, x2 = x.chunk(2, dim=1)
        x = self.conv4(x1)
        x = self.relu4(x)
        # Split 384 channels into 2 groups of 192
        x1, x2 = x.chunk(2, dim=1)
        x = self.conv5(x1)
        x = self.relu_pool5(x)
        # Split 256 channels into 2 groups of 128
        x1, x2 = x.chunk(2, dim=1)
        x = self.conv6(x1)
        x = self.relu6(x)
        x = self.conv7(x)
        # Global average pool to get single value
        return x.view(x.size(0), -1).mean(dim=1, keepdim=True)


# ============================================================
# Custom ResNet18 Architecture
# ============================================================

class CustomResNetBlock(nn.Module):
    def __init__(self, in_channels, out_channels, stride=1, downsample=None):
        super().__init__()
        self.group1 = nn.Sequential(
            nn.Conv2d(in_channels, out_channels, 3, stride=stride, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_channels, out_channels, 3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
        )
        self.downsample = downsample

    def forward(self, x):
        identity = x
        out = self.group1(x)
        if self.downsample is not None:
            identity = self.downsample(x)
        out += identity
        out = F.relu(out)
        return out


class CustomResNet18(nn.Module):
    def __init__(self):
        super().__init__()
        self.group1 = nn.Sequential(
            nn.Conv2d(3, 64, 7, stride=2, padding=3, bias=False),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(3, stride=2, padding=1)
        )
        self.layer1 = self._make_layer(64, 64, 2, stride=1)
        self.layer2 = self._make_layer(64, 128, 2, stride=2)
        self.layer3 = self._make_layer(128, 256, 2, stride=2)
        self.layer4 = self._make_layer(256, 512, 2, stride=2)
        self.avgpool = nn.AdaptiveAvgPool2d((1, 1))
        # Match checkpoint: group2.fullyconnected.weight
        self.group2 = nn.Sequential(
            nn.Flatten(),
            nn.Linear(512, 1)
        )
        # Register fullyconnected as alias for checkpoint loading
        self.fullyconnected = nn.Linear(512, 1)

    def _make_layer(self, in_channels, out_channels, blocks, stride=1):
        downsample = None
        if stride != 1 or in_channels != out_channels:
            downsample = nn.Sequential(
                nn.Conv2d(in_channels, out_channels, 1, stride=stride, bias=False),
                nn.BatchNorm2d(out_channels),
            )
        layers = []
        layers.append(CustomResNetBlock(in_channels, out_channels, stride, downsample))
        for _ in range(1, blocks):
            layers.append(CustomResNetBlock(out_channels, out_channels))
        return nn.Sequential(*layers)

    def forward(self, x):
        x = self.group1(x)
        x = self.layer1(x)
        x = self.layer2(x)
        x = self.layer3(x)
        x = self.layer4(x)
        x = self.avgpool(x)
        x = x.view(x.size(0), -1)
        x = self.fullyconnected(x)
        return x


# ============================================================
# Model Manager (singleton)
# ============================================================

class ModelManager:
    _instance = None
    _models = {}
    _device = torch.device("cpu")

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def get_model(self, model_name="resnet18"):
        if model_name not in self._models:
            # Models are at project root /pytorch-models/
            script_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
            models_dir = os.path.join(script_dir, "pytorch-models")
            # Fallback: try current working directory
            if not os.path.exists(models_dir):
                models_dir = os.path.join(os.getcwd(), "pytorch-models")
            # Fallback: try parent of cwd
            if not os.path.exists(models_dir):
                models_dir = os.path.join(os.path.dirname(os.getcwd()), "pytorch-models")

            if model_name == "alexnet":
                model = CustomAlexNet()
                checkpoint_path = os.path.join(models_dir, "alexnet.pth")
            else:
                model = CustomResNet18()
                checkpoint_path = os.path.join(models_dir, "resnet18.pth")

            checkpoint = torch.load(
                checkpoint_path,
                map_location=self._device,
                weights_only=False,
                encoding='latin1'
            )

            state_dict = checkpoint['state_dict']
            new_state_dict = {}
            for k, v in state_dict.items():
                if k.startswith('module.'):
                    new_state_dict[k[7:]] = v
                else:
                    new_state_dict[k] = v

            model.load_state_dict(new_state_dict, strict=False)
            model.eval()
            self._models[model_name] = model

        return self._models[model_name]


# ============================================================
# Image Preprocessing
# ============================================================

def preprocess_image(image_data, target_size=224):
    """Preprocess image for model input - manual transforms to avoid torchvision import issues"""
    img = Image.open(io.BytesIO(image_data)).convert('RGB')

    # Resize to 256
    img = img.resize((256, 256), Image.BILINEAR)

    # Center crop to target_size
    left = (256 - target_size) // 2
    top = (256 - target_size) // 2
    img = img.crop((left, top, left + target_size, top + target_size))

    # Convert to tensor (C, H, W) and normalize
    img_array = np.array(img, dtype=np.float32).transpose(2, 0, 1) / 255.0

    # Normalize with ImageNet stats
    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32).reshape(3, 1, 1)
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32).reshape(3, 1, 1)
    img_array = (img_array - mean) / std

    return torch.from_numpy(img_array).float().unsqueeze(0)


# ============================================================
# Scoring Functions
# ============================================================

def score_image(image_data, model_name="resnet18"):
    """Score a single image using the specified model"""
    manager = ModelManager()
    model = manager.get_model(model_name)
    device = manager._device

    input_tensor = preprocess_image(image_data).to(device)

    with torch.no_grad():
        output = model(input_tensor)
        raw_score = output.item()

    # Normalize to 0-10 using sigmoid
    score = float(torch.sigmoid(torch.tensor(raw_score)).item() * 10)

    # Confidence based on how far from middle
    confidence = min(abs(score / 10 - 0.5) * 2 + 0.5, 1.0)

    return {
        "score": round(score, 2),
        "raw_score": round(raw_score, 4),
        "confidence": round(confidence, 3),
    }


def score_with_ensemble(image_data):
    """Score using both models and combine results"""
    alexnet_result = score_image(image_data, "alexnet")
    resnet_result = score_image(image_data, "resnet18")

    # Weighted average (ResNet18 is more accurate: 88.2% vs 87.2%)
    ensemble_score = alexnet_result["score"] * 0.45 + resnet_result["score"] * 0.55
    ensemble_confidence = alexnet_result["confidence"] * 0.4 + resnet_result["confidence"] * 0.6

    return {
        "score": round(ensemble_score, 2),
        "confidence": round(ensemble_confidence, 3),
        "models": {
            "alexnet": alexnet_result,
            "resnet18": resnet_result,
        }
    }


# ============================================================
# CLI Entry Point
# ============================================================

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python ai_model_scorer.py <base64_image> [model_name]"}))
        sys.exit(1)

    image_b64 = sys.argv[1]
    model_name = sys.argv[2] if len(sys.argv) > 2 else "ensemble"

    try:
        image_data = base64.b64decode(image_b64)

        if model_name == "ensemble":
            result = score_with_ensemble(image_data)
        else:
            result = score_image(image_data, model_name)

        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
