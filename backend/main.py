from __future__ import annotations

from fastapi import FastAPI
from pydantic import BaseModel, Field

from fraud_model import TransactionFeatures, calculate_risk_score, classify_transaction


app = FastAPI(title="FraudShield Fraud Detection API")


class TransactionRequest(BaseModel):
    id: str = Field(..., examples=["TXN-2026-2001"])
    customer: str = Field(..., examples=["Nikhil S"])
    amount: float = Field(..., ge=0)
    channel: str = Field(..., examples=["UPI"])
    device_trust: str = Field(..., examples=["new"])
    location_match: str = Field(..., examples=["mismatch"])
    velocity_last_hour: int = Field(..., ge=0)
    prior_flags: int = Field(..., ge=0)
    time_band: str = Field(..., examples=["night"])


class PredictionResponse(BaseModel):
    transaction_id: str
    customer: str
    risk_score: int
    risk_level: str
    prediction: str
    alert_level: str


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "running", "service": "FraudShield API"}


@app.post("/api/predict", response_model=PredictionResponse)
def predict_fraud(transaction: TransactionRequest) -> PredictionResponse:
    features = TransactionFeatures(
        amount=transaction.amount,
        channel=transaction.channel,
        device_trust=transaction.device_trust,
        location_match=transaction.location_match,
        velocity_last_hour=transaction.velocity_last_hour,
        prior_flags=transaction.prior_flags,
        time_band=transaction.time_band,
    )
    score = calculate_risk_score(features)
    risk_level, prediction, alert_level = classify_transaction(score)

    return PredictionResponse(
        transaction_id=transaction.id,
        customer=transaction.customer,
        risk_score=score,
        risk_level=risk_level,
        prediction=prediction,
        alert_level=alert_level,
    )
