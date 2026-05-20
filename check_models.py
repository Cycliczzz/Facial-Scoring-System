import torch
import sys

print("PyTorch version:", torch.__version__)

# Try loading AlexNet
try:
    data = torch.load('pytorch-models/alexnet.pth', map_location='cpu', weights_only=False, encoding='latin1')
    print("AlexNet loaded successfully!")
    print("Type:", type(data))
    if isinstance(data, dict):
        keys = list(data.keys())
        print("Keys:", keys[:10])
        for k in keys[:5]:
            v = data[k]
            if hasattr(v, 'shape'):
                print(f"  {k}: shape={v.shape}")
            else:
                print(f"  {k}: type={type(v)}")
except Exception as e:
    print("AlexNet error:", str(e))
    sys.stdout.flush()

print()

# Try loading ResNet18
try:
    data = torch.load('pytorch-models/resnet18.pth', map_location='cpu', weights_only=False, encoding='latin1')
    print("ResNet18 loaded successfully!")
    print("Type:", type(data))
    if isinstance(data, dict):
        keys = list(data.keys())
        print("Keys:", keys[:10])
        for k in keys[:5]:
            v = data[k]
            if hasattr(v, 'shape'):
                print(f"  {k}: shape={v.shape}")
            else:
                print(f"  {k}: type={type(v)}")
except Exception as e:
    print("ResNet18 error:", str(e))

sys.stdout.flush()
