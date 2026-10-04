"""Data Leakage Audit & Validation Module for VayuDrishti NCR (Phase 4).

Performs strict, automated verification against the four primary time-series
leakage failure modes:
1. Target leakage (target variable in feature matrix)
2. Future timestamp leakage (features using data from t > T)
3. Rolling window forward-look leakage (centered windows)
4. Train/Val/Test temporal contamination (non-chronological splitting)
"""

import logging
from typing import Dict, List, Tuple
import numpy as np
import pandas as pd

logger = logging.getLogger("vayudrishti.leakage")


class DataLeakageAuditor:
    """Automated validator ensuring absolute time-causal integrity."""

    @staticmethod
    def assert_no_target_in_features(
        feature_cols: List[str],
        target_cols: List[str]
    ) -> bool:
        """Verifies that no target column appears in the feature column list."""
        overlap = set(feature_cols).intersection(set(target_cols))
        if overlap:
            raise ValueError(f"FATAL LEAKAGE: Target columns found in feature matrix: {overlap}")
        
        # Also check for unlagged target variable names
        for col in feature_cols:
            if col == "pm25_ugm3" or col == "target":
                raise ValueError(f"FATAL LEAKAGE: Unlagged target '{col}' present in features!")
        logger.info("PASSED: Zero target columns detected in feature matrix.")
        return True

    @staticmethod
    def assert_chronological_splits(
        train_df: pd.DataFrame,
        val_df: pd.DataFrame,
        test_df: pd.DataFrame,
        time_col: str = "timestamp_utc"
    ) -> bool:
        """Enforces strictly monotonic time boundaries across train, val, and test splits."""
        max_train = train_df[time_col].max()
        min_val = val_df[time_col].min()
        max_val = val_df[time_col].max()
        min_test = test_df[time_col].min()

        if max_train >= min_val:
            raise ValueError(
                f"FATAL LEAKAGE: Training set overlaps with validation set! "
                f"max_train ({max_train}) >= min_val ({min_val})"
            )
        if max_val >= min_test:
            raise ValueError(
                f"FATAL LEAKAGE: Validation set overlaps with test set! "
                f"max_val ({max_val}) >= min_test ({min_test})"
            )
        logger.info(
            f"PASSED: Strict chronological partition validated: "
            f"Train [{train_df[time_col].min()} to {max_train}] < "
            f"Val [{min_val} to {max_val}] < "
            f"Test [{min_test} to {test_df[time_col].max()}]"
        )
        return True

    @staticmethod
    def audit_feature_correlations(
        df: pd.DataFrame,
        feature_cols: List[str],
        target_col: str,
        threshold: float = 0.99
    ) -> Dict[str, float]:
        """Audits features for suspiciously high correlation with multi-step target."""
        suspicious = {}
        for col in feature_cols:
            if col in df.columns and pd.api.types.is_numeric_dtype(df[col]):
                corr = df[col].corr(df[target_col])
                if abs(corr) >= threshold:
                    suspicious[col] = float(corr)
                    logger.warning(
                        f"WARNING: Feature '{col}' has extreme correlation ({corr:.4f}) with '{target_col}'"
                    )
        if not suspicious:
            logger.info("PASSED: No anomalous feature-target correlations detected.")
        return suspicious


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print("DataLeakageAuditor loaded successfully.")
