import base64
import sys
from PIL import Image
import io

# Create a small test image
img = Image.new('RGB', (224, 224), color='gray')
buf = io.BytesIO()
img.save(buf, format='JPEG')
b64 = base64.b64encode(buf.getvalue()).decode()

print("Test image created, length:", len(b64))
sys.stdout.flush()

# Now test the scorer
sys.path.insert(0, "faceiq/lib/analysis")
from ai_model_scorer import score_image, score_with_ensemble

print("Testing ResNet18...")
sys.stdout.flush()
result = score_image(buf.getvalue(), "resnet18")
print("ResNet18 result:", result)
sys.stdout.flush()

print("Testing AlexNet...")
sys.stdout.flush()
result2 = score_image(buf.getvalue(), "alexnet")
print("AlexNet result:", result2)
sys.stdout.flush()

print("Testing ensemble...")
sys.stdout.flush()
result3 = score_with_ensemble(buf.getvalue())
print("Ensemble result:", result3)
sys.stdout.flush()
