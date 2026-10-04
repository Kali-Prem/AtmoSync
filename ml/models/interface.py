"""
Machine Learning Model Interface Specification for ATMOSYNC (SIH-26082)
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
import numpy as np

class ForecastRefinementModel(ABC):
    """
    Abstract contract for all empirical and physics-informed post-processing models.
    Enforces unified feature ingestion, training, evaluation, and inference.
    """

    def __init__(self, model_version: str = "v1.0.0-placeholder"):
        self.model_version = model_version
        self.is_trained = False

    @abstractmethod
    def prepare_features(self, raw_data_manifest: Dict[str, Any]) -> Any:
        """Assembles normalized tabular feature matrix conforming to 52-feature taxonomy."""
        pass

    @abstractmethod
    def train(self, training_data: Any, validation_data: Optional[Any] = None) -> Dict[str, Any]:
        """Executes model training with early stopping and hyperparameter convergence."""
        pass

    @abstractmethod
    def predict(self, feature_matrix: Any, lead_hours: List[int]) -> Dict[str, Any]:
        """
        Generates multi-horizon forecasts with quantile intervals (P10, P50, P90).
        Returns predicted concentrations for PM2.5, PM10, O3, NO2.
        """
        pass

    @abstractmethod
    def evaluate(self, test_features: Any, ground_truth: Any) -> Dict[str, float]:
        """Computes statistical metrics (RMSE, MAE, R2, CSI for severe episodes)."""
        pass

    @abstractmethod
    def save(self, destination_path: str) -> str:
        """Serializes model weights and configuration to disk."""
        pass

    @abstractmethod
    def load(self, source_path: str) -> None:
        """Loads serialized model artifact into memory."""
        pass
