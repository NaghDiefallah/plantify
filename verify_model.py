import torch
import torch.nn as nn
from torchvision import models
from collections import OrderedDict
import os
import traceback


def _is_state_dict(obj):
    """Return True if obj looks like a state_dict (mapping of tensors)."""
    if not isinstance(obj, dict):
        return False
    # Heuristic: keys are strings and values are tensors or similar
    for k, v in list(obj.items())[:10]:
        if not isinstance(k, str):
            return False
        # allow nested dicts in checkpoints; assume tensors or lists
        # we won't strict-check types here to support different torch versions
    return True


def _strip_prefix(state_dict, prefix):
    new = OrderedDict()
    for k, v in state_dict.items():
        if k.startswith(prefix):
            new[k[len(prefix):]] = v
        else:
            new[k] = v
    return new


def _remove_module_prefix(state_dict):
    return _strip_prefix(state_dict, 'module.')


class WrappedModel(nn.Module):
    def __init__(self, base_model):
        super().__init__()
        self.base = base_model

    def forward(self, x):
        return self.base(x)


def try_loading(model, state_dict):
    """Try to load state_dict into model (strict=False).
    Returns (matched_count, total_model_keys, missing, unexpected)
    """
    model_keys = set(model.state_dict().keys())
    state_keys = set(state_dict.keys())
    common = model_keys & state_keys
    try:
        res = model.load_state_dict(state_dict, strict=False)
        missing = getattr(res, 'missing_keys', [])
        unexpected = getattr(res, 'unexpected_keys', [])
    except Exception as e:
        return 0, len(model_keys), None, None, e
    return len(common), len(model_keys), missing, unexpected, None


def verify_model_compatibility(model_path=None, verbose=True):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = model_path or os.path.join(base_dir, 'plantify_model.pth')

    if not os.path.exists(model_path):
        if verbose:
            print("❌ Model file not found!")
            print(f"Expected path: {model_path}")
            print("\nRun train.py or train_lite.py to create the model.")
        return False

    try:
        if verbose:
            print("Loading checkpoint...")
        checkpoint = torch.load(model_path, map_location='cpu')

        if not isinstance(checkpoint, dict):
            # Some older checkpoints may be raw state_dicts
            raw_state_dict = checkpoint
            labels = []
            arch = 'unknown'
        else:
            raw_state_dict = checkpoint.get('model_state_dict', None) or checkpoint.get('state_dict', None) or checkpoint
            labels = checkpoint.get('classes', []) if isinstance(checkpoint, dict) else []
            arch = checkpoint.get('arch', 'unknown') if isinstance(checkpoint, dict) else 'unknown'

        if verbose:
            print('\n✓ Checkpoint loaded successfully!')
            print(f"  Architecture: {arch}")
            print(f"  Classes: {len(labels)} classes")
            print(f"  Epoch: {checkpoint.get('epoch', 'N/A') if isinstance(checkpoint, dict) else 'N/A'}")
            print(f"  Loss: {checkpoint.get('loss', 'N/A')}")
            print(f"  Accuracy: {checkpoint.get('accuracy', 'N/A')}")

        if not _is_state_dict(raw_state_dict):
            if verbose:
                print('\n❌ No valid state_dict found in checkpoint!')
            return False

        if not labels:
            if verbose:
                print('\n⚠️  No class labels found in checkpoint ("classes" key).')
                print('You can still test weight loading, but final output size check will be skipped.')

        # Create model according to arch hints
        if 'mobilenet' in arch.lower():
            if verbose:
                print('\nInitializing MobileNetV3-Large (lite) architecture...')
            model = models.mobilenet_v3_large(weights=None)
            in_features = model.classifier[0].in_features
            model.classifier = nn.Sequential(
                nn.Linear(in_features, 1280),
                nn.Hardswish(inplace=True),
                nn.Dropout(p=0.2, inplace=True),
                nn.Linear(1280, max(1, len(labels) if labels else 1000))
            )
        else:
            # default to EfficientNet-B2 (production)
            if verbose:
                print('\nInitializing EfficientNet-B2 (production) architecture...')
            model = models.efficientnet_b2(weights=None)
            in_features = model.classifier[1].in_features
            model.classifier[1] = nn.Sequential(
                nn.Dropout(p=0.3, inplace=True),
                nn.Linear(in_features, max(1, len(labels) if labels else 1000))
            )

        # Prepare candidate state_dict variants
        candidates = []
        sd0 = raw_state_dict
        # If the checkpoint is a mapping with top-level keys that are not tensor keys (i.e., full checkpoint), we already extracted model_state_dict above
        # Common fixes: remove 'module.' prefix (DataParallel), remove/add 'base.' prefix
        sd1 = _remove_module_prefix(sd0)
        sd2 = _strip_prefix(sd1, 'base.')
        sd3 = OrderedDict((f'base.{k}', v) for k, v in sd1.items())

        # Add them to candidates with a label
        candidates.append(('raw', sd0))
        candidates.append(('no_module', sd1))
        candidates.append(('no_base', sd2))
        candidates.append(('add_base', sd3))

        best = None
        best_info = None

        # Try loading into plain model first
        for name, sd in candidates:
            common, total, missing, unexpected, err = try_loading(model, sd)
            if err is None and common > 0:
                best = (model, sd)
                best_info = (name, common, total, missing, unexpected)
                break

        wrapped = None
        if best is None:
            # Try wrapping model (app.py may expect wrapper with attribute 'base')
            wrapped_model = WrappedModel(model)
            for name, sd in candidates:
                common, total, missing, unexpected, err = try_loading(wrapped_model, sd)
                if err is None and common > 0:
                    best = (wrapped_model, sd)
                    best_info = (f'wrapped:{name}', common, total, missing, unexpected)
                    wrapped = True
                    break

        if best is None:
            if verbose:
                print('\n❌ Failed to match any state_dict keys with model parameters.')
                print('Model keys sample:')
                for i, k in enumerate(list(model.state_dict().keys())[:10]):
                    print(f'  - {k}')
                print('\nState dict keys sample:')
                for i, k in enumerate(list(sd0.keys())[:10]):
                    print(f'  - {k}')
                print('\nTip: If this checkpoint was saved from a wrapped model, or under DataParallel, try re-saving with a plain model.state_dict().')
            return False

        final_model, final_sd = best
        # Perform actual load (again) to get missing/unexpected
        res = final_model.load_state_dict(final_sd, strict=False)
        missing = getattr(res, 'missing_keys', [])
        unexpected = getattr(res, 'unexpected_keys', [])

        if verbose:
            print(f"\n✓ Loaded weights using strategy: {best_info[0]}")
            print(f"  Matched keys: {best_info[1]}/{best_info[2]}")
            if missing:
                print(f"  Missing keys (sample): {missing[:6]}")
            if unexpected:
                print(f"  Unexpected keys (sample): {unexpected[:6]}")

        final_model.eval()

        # Run a forward pass test with app.py's expected input size
        test_input = torch.randn(1, 3, 240, 240)
        with torch.no_grad():
            output = final_model(test_input)

        if verbose:
            print('\n✓ Forward pass successful!')
            print(f'  Input shape: {test_input.shape}')
            print(f'  Output shape: {output.shape}')
            if labels:
                print(f'  Expected classes: {len(labels)}')

        if labels:
            if output.shape[1] == len(labels):
                if verbose:
                    print('\n✅ SUCCESS! Model is compatible with app.py')
                return True
            else:
                if verbose:
                    print(f"\n❌ Output mismatch! Got {output.shape[1]} outputs but expected {len(labels)} classes.")
                return False

        # If no labels to check against, we already loaded weights and did a forward pass
        return True

    except Exception as exc:
        print('\n❌ Error during verification:')
        traceback.print_exc()
        return False


if __name__ == '__main__':
    print('=' * 80)
    print('PLANTIFY MODEL COMPATIBILITY VERIFICATION')
    print('=' * 80)
    print()

    success = verify_model_compatibility()

    print('\n' + '=' * 80)
    if success:
        print('✅ Model ready to use with app.py!')
        print('Run: streamlit run app.py')
    else:
        print('❌ Model verification failed!')
        print('Please check the error messages above. If needed, run train.py or train_lite.py to regenerate the model.')
    print('=' * 80)
