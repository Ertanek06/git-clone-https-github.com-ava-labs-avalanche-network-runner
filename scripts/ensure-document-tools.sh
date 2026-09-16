#!/usr/bin/env bash
set -Eeuo pipefail
missing=()
command -v pdftotext >/dev/null 2>&1 || missing+=(poppler-utils)
command -v pdftoppm >/dev/null 2>&1 || missing+=(poppler-utils)
command -v tesseract >/dev/null 2>&1 || missing+=(tesseract-ocr tesseract-ocr-tur)
if [ "${#missing[@]}" -eq 0 ]; then
  echo "BASARILI: PDF metin çıkarma ve OCR araçları hazır."
  exit 0
fi
if ! command -v apt-get >/dev/null 2>&1; then
  echo "UYARI: Eksik PDF/OCR araçları otomatik kurulamadı: ${missing[*]}"
  exit 0
fi
SUDO=()
if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; then SUDO=(sudo); fi
# Aynı paket birden fazla kez eklenmiş olabilir.
mapfile -t packages < <(printf '%s\n' "${missing[@]}" | tr ' ' '\n' | sed '/^$/d' | sort -u)
"${SUDO[@]}" apt-get update -y
DEBIAN_FRONTEND=noninteractive "${SUDO[@]}" apt-get install -y --no-install-recommends "${packages[@]}"
command -v pdftotext >/dev/null 2>&1 || { echo "UYARI: pdftotext kurulamadı."; exit 0; }
command -v tesseract >/dev/null 2>&1 || { echo "UYARI: tesseract kurulamadı; metin tabanlı PDF okuyucu çalışmaya devam eder."; exit 0; }
echo "BASARILI: PDF metin çıkarma ve OCR araçları kuruldu."
