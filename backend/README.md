# FraudShield Backend Reference

This folder contains a lightweight backend reference implementation for the
FraudShield financial fraud detection project report.

## Run

```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

## Endpoints

- `GET /api/health`
- `POST /api/predict`

The current main UI is a Next.js app. These backend files document how the fraud
prediction module can be served through a Python API.
