from __future__ import annotations

from dataclasses import dataclass


@dataclass
class TransactionFeatures:
    amount: float
    channel: str
    device_trust: str
    location_match: str
    velocity_last_hour: int
    prior_flags: int
    time_band: str


CHANNEL_WEIGHTS = {
    "UPI": 12,
    "Mobile Banking": 15,
    "Credit Card": 10,
    "Internet Banking": 14,
}


def calculate_risk_score(transaction: TransactionFeatures) -> int:
    score = 8

    if transaction.amount >= 80000:
        score += 30
    elif transaction.amount >= 40000:
        score += 18

    if transaction.velocity_last_hour >= 5:
        score += 18
    elif transaction.velocity_last_hour >= 3:
        score += 10

    score += CHANNEL_WEIGHTS.get(transaction.channel, 10)

    if transaction.device_trust == "new":
        score += 16

    if transaction.location_match == "mismatch":
        score += 14

    if transaction.prior_flags >= 2:
        score += 14
    elif transaction.prior_flags == 1:
        score += 7

    if transaction.time_band == "night":
        score += 8

    return min(99, round(score))


def classify_transaction(score: int) -> tuple[str, str, str]:
    if score >= 70:
        return "High", "Fraudulent", "Critical"

    if score >= 45:
        return "Medium", "Suspicious", "Review"

    return "Low", "Legitimate", "Monitor"
