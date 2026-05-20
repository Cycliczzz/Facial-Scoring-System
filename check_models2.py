import torch
import sys

print("Starting model inspection...")
sys.stdout.flush()

# Load AlexNet
alexnet_data = torch.load('pytorch-models/alexnet.pth', map_location='cpu', weights_only=False, encoding='latin1')
print("AlexNet loaded")
sys.stdout.flush()

alexnet_sd = alexnet_data['state_dict']
print("=== AlexNet state_dict keys ===")
for k, v in list(alexnet_sd.items())[:20]:
    print(f"  {k}: {v.shape}")
sys.stdout.flush()

# Load ResNet18
resnet_data = torch.load('pytorch-models/resnet18.pth', map_location='cpu', weights_only=False, encoding='latin1')
print("\nResNet18 loaded")
sys.stdout.flush()

resnet_sd = resnet_data['state_dict']
print("=== ResNet18 state_dict keys ===")
for k, v in list(resnet_sd.items())[:30]:
    print(f"  {k}: {v.shape}")
sys.stdout.flush()

# Check classifier layers
print("\n=== AlexNet classifier keys ===")
for k, v in alexnet_sd.items():
    if 'classifier' in k:
        print(f"  {k}: {v.shape}")
sys.stdout.flush()

print("\n=== ResNet18 fc layer ===")
for k, v in resnet_sd.items():
    if 'fc' in k:
        print(f"  {k}: {v.shape}")
sys.stdout.flush()
