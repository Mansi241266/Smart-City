import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import joblib
import os

def train_models():
    """Train category and priority prediction models"""
    
    # Load dataset
    try:
        df = pd.read_csv('dataset.csv')
        print(f"✓ Dataset loaded: {len(df)} records")
    except FileNotFoundError:
        print("✗ dataset.csv not found. Create dataset first.")
        return
    
    # Ensure required columns exist
    required_columns = ['complaint', 'category', 'priority']
    if not all(col in df.columns for col in required_columns):
        print(f"✗ Dataset must contain columns: {required_columns}")
        return
    
    print(f"✓ Dataset columns: {df.columns.tolist()}")
    print(f"✓ Categories: {df['category'].unique().tolist()}")
    print(f"✓ Priorities: {df['priority'].unique().tolist()}\n")
    
    # --- Train Category Model ---
    print("Training Category Model...")
    X = df['complaint']
    y_category = df['category']
    
    # Vectorization
    vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
    X_vectorized = vectorizer.fit_transform(X)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X_vectorized, y_category, test_size=0.2, random_state=42
    )
    
    # Train model
    category_model = RandomForestClassifier(n_estimators=100, random_state=42)
    category_model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = category_model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"✓ Category Model Accuracy: {accuracy:.2f}")
    print(f"\nClassification Report:\n{classification_report(y_test, y_pred)}")
    
    # Save models
    joblib.dump(category_model, 'complaint_model.pkl')
    joblib.dump(vectorizer, 'vectorizer.pkl')
    print("✓ Category model saved\n")
    
    # --- Train Priority Model ---
    print("Training Priority Model...")
    y_priority = df['priority']
    
    # Vectorization
    priority_vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
    X_priority_vectorized = priority_vectorizer.fit_transform(X)
    
    # Split data
    X_train_p, X_test_p, y_train_p, y_test_p = train_test_split(
        X_priority_vectorized, y_priority, test_size=0.2, random_state=42
    )
    
    # Train model
    priority_model = RandomForestClassifier(n_estimators=100, random_state=42)
    priority_model.fit(X_train_p, y_train_p)
    
    # Evaluate
    y_pred_p = priority_model.predict(X_test_p)
    accuracy_p = accuracy_score(y_test_p, y_pred_p)
    print(f"✓ Priority Model Accuracy: {accuracy_p:.2f}")
    print(f"\nClassification Report:\n{classification_report(y_test_p, y_pred_p)}")
    
    # Save models
    joblib.dump(priority_model, 'priority_model.pkl')
    joblib.dump(priority_vectorizer, 'priority_vectorizer.pkl')
    print("✓ Priority model saved\n")
    
    print("=" * 50)
    print("✓ All models trained and saved successfully!")
    print("=" * 50)

if __name__ == '__main__':
    train_models()
