---
title: Antigravity Translation Checker
emoji: 
colorFrom: indigo
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# SAMSUNG Translation Checker AI (Antigravity)

Gemini API를 활용하여 다국어 번역 파일(.xlsx)의 일관성과 품질을 자동으로 검수하는 웹 어플리케이션입니다.

## 주요 기능
- **다국어 시트 동시 검수**: 여러 국가의 번역 시트를 한 번에 분석
- **용어집(Glossary) 준수 체크**: 업로드한 용어집과의 일치 여부 확인
- **AI 기반 맥락 분석**: Gemini Pro를 통한 자연스러운 번역 오류 탐지
- **실시간 모니터링**: 검수 진행 상황을 실시간 터미널 로그로 확인
- **리포트 생성**: 검수 결과를 `.txt` 파일로 다운로드

## 사전 설정 (Hugging Face Spaces)
이 앱을 실행하려면 **Settings > Variables and Secrets** 메뉴에서 아래 환경 변수를 설정해야 합니다.
- `GOOGLE_API_KEY`: Google AI Studio에서 발급받은 Gemini API 키

## 로컬 실행 방법 (Local Development)

### 방법 A: 스크립트 사용 (권장)
- **Mac**: `bash run_mac.command`
- **Windows**: `go-webui.bat` 실행

### 방법 B: 수동 실행
1. `python -m venv venv`
2. `source venv/bin/activate`  # Windows: venv\Scripts\activate
3. `pip install -r requirements.txt`
4. `python main.py`

## Docker 실행 (Optional)
```bash
docker build -t translation-checker .
docker run -p 7860:7860 -e GOOGLE_API_KEY="your_key_here" translation-checker
```