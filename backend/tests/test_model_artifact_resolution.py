from pathlib import Path

import pytest

from app.services import model_artifacts


def test_resolve_checkpoint_prefers_explicit_path(tmp_path: Path) -> None:
    explicit = tmp_path / "explicit.pth"
    explicit.write_bytes(b"weights")

    resolved = model_artifacts.resolve_checkpoint_path(explicit)

    assert resolved == explicit


def test_resolve_checkpoint_falls_back_to_backend_model(monkeypatch, tmp_path: Path) -> None:
    backend_dir = tmp_path / "backend"
    model_dir = backend_dir / "model"
    model_dir.mkdir(parents=True, exist_ok=True)
    backend_checkpoint = model_dir / "plantify_model.pth"
    backend_checkpoint.write_bytes(b"weights")

    monkeypatch.setattr(model_artifacts, "BACKEND_DIR", backend_dir)
    monkeypatch.setattr(model_artifacts, "REPO_ROOT", tmp_path)

    resolved = model_artifacts.resolve_checkpoint_path(tmp_path / "missing.pth")

    assert resolved == backend_checkpoint


def test_resolve_checkpoint_falls_back_to_repo_root(monkeypatch, tmp_path: Path) -> None:
    backend_dir = tmp_path / "backend"
    repo_checkpoint = tmp_path / "plantify_model.pth"
    repo_checkpoint.write_bytes(b"weights")

    monkeypatch.setattr(model_artifacts, "BACKEND_DIR", backend_dir)
    monkeypatch.setattr(model_artifacts, "REPO_ROOT", tmp_path)

    resolved = model_artifacts.resolve_checkpoint_path(tmp_path / "missing.pth")

    assert resolved == repo_checkpoint


def test_resolve_checkpoint_raises_when_all_missing(monkeypatch, tmp_path: Path) -> None:
    backend_dir = tmp_path / "backend"

    monkeypatch.setattr(model_artifacts, "BACKEND_DIR", backend_dir)
    monkeypatch.setattr(model_artifacts, "REPO_ROOT", tmp_path)

    with pytest.raises(FileNotFoundError, match="Checkpoint not found"):
        model_artifacts.resolve_checkpoint_path(tmp_path / "missing.pth")
