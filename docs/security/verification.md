# Release Security & Verification

Learn how to verify Plantify release artifacts for authenticity and integrity.

---

## Overview

Every Plantify release includes multiple layers of security verification:

1. **SHA256 Checksums** — Detect accidental corruption or tampering
2. **GPG Digital Signatures** — Cryptographically prove authenticity
3. **Docker Image Signatures** — Verify container image provenance
4. **Reproducible Builds** — Anyone can rebuild and verify

---

## Quick Start: Verify a Release

### Method 1: Simple Checksum Verification (Fastest)

```bash
# Download release artifacts from Github

# Download checksums
curl -L -O https://github.com/naghdiefallah/plantify/releases/download/v1.2.0/checksums.txt

# Verify all files at once
sha256sum --check checksums.txt

# Output:
# plantify-v1.2.0-windows-x86_64.msi: OK
# plantify-v1.2.0-macos-universal.dmg: OK
# ... etc
```

### Method 2: Cryptographic Verification (Recommended)

```bash
# Download keys and signatures
curl -L -O https://github.com/naghdiefallah/plantify/releases/download/v1.2.0/checksums.txt
curl -L -O https://github.com/naghdiefallah/plantify/releases/download/v1.2.0/checksums.txt.asc

# Import signing key
curl -s https://raw.githubusercontent.com/naghdiefallah/plantify/main/config/plantify-release.asc | gpg --import

# Verify signature
gpg --verify checksums.txt.asc checksums.txt

# Output should include:
# gpg: Good signature from "Plantify Release <release@plantify.example.com>"
# gpg: Signature made Mon Jan 15 12:00:00 2024 UTC
```

---

## Understanding Release Signatures

### Why Verify?

Signatures protect against:
- **Man-in-the-middle attacks** — Attacker intercepting download
- **Supply chain tampering** — Compromised CI/CD or repository
- **Counterfeit releases** — Fake release uploaded to wrong location
- **Accidental corruption** — Bad download or storage media

### What Gets Signed?

| Artifact | Signed | Method |
|----------|--------|--------|
| **checksums.txt** | ✅ Yes | GPG signature (detached) |
| **Individual binaries** | ✅ Yes | Listed in checksums |
| **Docker images** | ✅ Yes | Cosign signature |
| **Git tags** | ✅ Yes | Git signed tags |

### How It Works

```
Release Binary (e.g., app.msi)
        ↓
    SHA256 Hash
        ↓
    checksums.txt (contains hash)
        ↓
    GPG Signature (private key)
        ↓
    checksums.txt.asc (signature file)
        ↓
    [Upload to GitHub Release]
```

To verify:
```
checksums.txt.asc + GPG Public Key → Verify Signature → ✅ Authentic
     ↓
checksums.txt → Extract hash
     ↓
SHA256(app.msi) → Compare hashes → ✅ Integrity
```

---

## Detailed Verification Guide

### 1. Install Required Tools

**macOS:**
```bash
brew install gnupg
# Cosign (optional)
brew install cosign
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install gnupg
# Cosign (optional)
wget https://github.com/sigstore/cosign/releases/download/v2.0.0/cosign-linux-amd64
sudo install cosign-linux-amd64 /usr/local/bin/cosign
```

**Windows:**
```powershell
# Install GPG
choco install gnupg4win
# Or download from: https://www.gnupg.org/download/

# Install Cosign
choco install cosign
```

### 2. Import Signing Key

**Option A: From Repository**
```bash
curl -s https://raw.githubusercontent.com/naghdiefallah/plantify/main/config/plantify-release.asc | gpg --import
```

**Option B: From Keyserver**
```bash
gpg --keyserver keyserver.ubuntu.com --recv-keys 0xABCD1234
# or
gpg --keyserver keys.openpgp.org --recv-keys 0xABCD1234
```

**Option C: Manual Import**
```bash
# Download the key file
wget https://raw.githubusercontent.com/naghdiefallah/plantify/main/config/plantify-release.asc

# Import it
gpg --import plantify-release.asc
```

### 3. Verify Release Signature

```bash
# Download checksums and signature
wget https://github.com/naghdiefallah/plantify/releases/download/v1.2.0/checksums.txt
wget https://github.com/naghdiefallah/plantify/releases/download/v1.2.0/checksums.txt.asc

# Verify
gpg --verify checksums.txt.asc checksums.txt
```

**Success output:**
```
gpg: Signature made Mon Jan 15 12:00:00 2024 UTC
gpg: Good signature from "Plantify Release <release@plantify.example.com>" [unknown]
gpg: WARNING: This key is not certified with a trusted signature!
gpg:          There is no indication that the signature belongs to the owner.
Primary key fingerprint: ABCD 1234 ... (first 4 and last 4 chars)
```

The warning is normal for new keys. To trust permanently:
```bash
# List keys
gpg --list-keys

# Edit key (replace KEY_ID)
gpg --edit-key KEY_ID
# Type: trust
# Select: 5 (I trust this key absolutely)
# Type: quit
```

### 4. Verify Binary Checksums

```bash
# Download all release files into a directory
mkdir plantify-v1.2.0
cd plantify-v1.2.0
# Download checksums and signature
wget https://github.com/naghdiefallah/plantify/releases/download/v1.2.0/checksums.txt

# Download binaries you want to verify
wget https://github.com/naghdiefallah/plantify/releases/download/v1.2.0/plantify-v1.2.0-windows-x86_64.msi

# Verify checksums (must be in same directory)
sha256sum --check checksums.txt

# Output:
# plantify-v1.2.0-windows-x86_64.msi: OK
```

### 5. Verify Docker Image (Optional)

```bash
# Install cosign (if not already installed)
# See step 1 above

# Import cosign key
curl -s https://raw.githubusercontent.com/naghdiefallah/plantify/main/config/cosign.pub > cosign.pub

# Verify image signature
cosign verify --key cosign.pub ghcr.io/naghdiefallah/plantify:v1.2.0

# View image provenance
cosign tree ghcr.io/naghdiefallah/plantify:v1.2.0

# View software bill of materials (SBOM)
cosign sbom ghcr.io/naghdiefallah/plantify:v1.2.0
```

---

## Advanced Verification

### Verify with Full Fingerprint

For maximum security, verify the full key fingerprint:

```bash
# List key details
gpg --list-keys --with-colons release@plantify.example.com | grep '^fpr'

# Then contact us through a separate channel to confirm the fingerprint
# matches what we publish
```

**Know fingerprint:**
```
ABCD 1234 5678 9ABC DEF0  1234 5678 9ABC DEF0 1234
```

### Reproduce Build (Advanced)

For paranoid users, builds are reproducible:

```bash
# Clone source at release tag
git clone https://github.com/naghdiefallah/plantify
cd plantify
git checkout v1.2.0

# Rebuild (requires build tools)
docker build -t plantify-rebuild:v1.2.0 .

# Compare checksums
docker save plantify-rebuild:v1.2.0 | sha256sum
# Should match official image checksum
```

---

## Troubleshooting Verification

### "Unknown key" Warning

**Symptom:**
```
gpg: Good signature from "..." [unknown]
```

**Solution:** Trust the key
```bash
gpg --edit-key release@plantify.example.com
# Type: trust
# Select: 5 (I trust automatically)
# Type: quit
```

### "Bad signature" Error

**Causes:**
1. Key not imported or wrong key
2. Files corrupted during download
3. Signature file is wrong

**Solution:**
```bash
# Re-import key
curl -s https://raw.githubusercontent.com/naghdiefallah/plantify/main/config/plantify-release.asc | gpg --import --yes

# Re-download files
rm checksums.txt checksums.txt.asc
curl -L -O https://github.com/naghdiefallah/plantify/releases/download/v1.2.0/checksums.txt
curl -L -O https://github.com/naghdiefallah/plantify/releases/download/v1.2.0/checksums.txt.asc

# Try again
gpg --verify checksums.txt.asc checksums.txt
```

### Key Expired

**Symptom:**
```
gpg: Note: THIS KEY IS EXPIRED
```

**Solution:**
```bash
# Get updated key
curl -s https://raw.githubusercontent.com/naghdiefallah/plantify/main/config/plantify-release.asc | gpg --import --yes

# Or from keyserver
gpg --keyserver keyserver.ubuntu.com --refresh-keys release@plantify.example.com
```

---

## Checksum File Format

The `checksums.txt` file contains one line per binary:

```
sha256hash1  filename1
sha256hash2  filename2
sha256hash3  filename3
```

Example:
```
abc123def456...  plantify-v1.2.0-windows-x86_64.msi
def789ghi012...  plantify-v1.2.0-macos-universal.dmg
ghi345jkl678...  plantify-v1.2.0-linux-x86_64.AppImage
```

---

## Security Practices by User Type

### Regular Users

✅ **Do:**
- Download from official GitHub Releases
- Verify SHA256 checksums before running
- Keep Plantify updated

⚠️ **Consider:**
- Setting up GPG key trust (optional but recommended)
- Reviewing release notes for security updates

### System Administrators

✅ **Must:**
- Verify GPG signatures on checksums
- Trust the GPG key through separate channel
- Audit binary fingerprints in SBOM
- Keep audit logs of deployment

⚠️ **Should:**
- Set up automated signature verification in CI/CD
- Monitor for security advisories
- Test security updates before production

### Developers

✅ **Must:**
- Verify GPG signatures before integration
- Scan Docker images with Trivy or similar
- Review release notes and CHANGELOG
- Keep dependencies updated

⚠️ **Should:**
- Reproduce builds locally for verification
- Report any signature verification issues
- Participate in security audits

---

## Additional Resources

- [GPG Tutorial](https://www.madboa.com/tutorials/gpg/)
- [Cosign Documentation](https://docs.sigstore.dev/cosign/overview/)
- [Sigstore Project](https://www.sigstore.dev/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

---

## Questions?

- 📖 See [SECURITY.md](../SECURITY.md)
- 🐛 Report issues: https://github.com/naghdiefallah/plantify/issues
- 🔐 Security concerns: security@plantify.example.com

---

**Last Updated**: April 8, 2026  
**Next Review**: April 8, 2027
