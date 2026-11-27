#!/usr/bin/env bash
# 포케로그 원본 에셋/로케일(서브모듈)을 내려받는 스크립트
set -e
rm -rf assets locales
git clone --depth 1 -b beta https://github.com/pagefaultgames/pokerogue-assets.git assets
git clone --depth 1 -b main https://github.com/pagefaultgames/pokerogue-locales.git locales
rm -rf assets/.git locales/.git
