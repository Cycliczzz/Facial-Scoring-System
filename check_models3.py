import torch
import sys

print("Starting full model inspection...")
sys.stdout.flush()

# Load AlexNet
alexnet_data = torch.load('pytorch-models/alexnet.pth', map_location='cpu', weights_only=False, encoding='latin1')
alexnet_sd = alexnet_data['state_dict']
print(f"AlexNet best_prec1: {alexnet_data['best_prec1']}")
print(f"AlexNet epoch: {alexnet_data['epoch']}")
print("=== AlexNet ALL keys ===")
for k, v in alexnet_sd.items():
    print(f"  {k}: {v.shape}")
sys.stdout.flush()

print()

# Load ResNet18
resnet_data = torch.load('pytorch-models/resnet18.pth', map_location='cpu', weights_only=False, encoding='latin1')
resnet_sd = resnet_data['state_dict']
print(f"ResNet18 best_prec1: {resnet_data['best_prec1']}")
print(f"ResNet18 epoch: {resnet_data['epoch']}")
print("=== ResNet18 ALL keys ===")
for k, v in resnet_sd.items():
    print(f"  {k}: {v.shape}")
sys.stdout.flush()
