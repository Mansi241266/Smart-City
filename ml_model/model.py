import pickle
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier
import joblib
import os

class ComplaintClassifier:
    def __init__(self):
        # Get the directory where this script is located
        script_dir = os.path.dirname(os.path.abspath(__file__))
        
        self.model_path = os.path.join(script_dir, 'complaint_model.pkl')
        self.vectorizer_path = os.path.join(script_dir, 'vectorizer.pkl')
        self.priority_model_path = os.path.join(script_dir, 'priority_model.pkl')
        self.priority_vectorizer_path = os.path.join(script_dir, 'priority_vectorizer.pkl')
        
        self.load_models()
    
    def load_models(self):
        """Load pre-trained models if they exist"""
        try:
            if os.path.exists(self.model_path):
                self.model = joblib.load(self.model_path)
                self.vectorizer = joblib.load(self.vectorizer_path)
                self.priority_model = joblib.load(self.priority_model_path)
                self.priority_vectorizer = joblib.load(self.priority_vectorizer_path)
                print("✓ Models loaded successfully")
            else:
                print("⚠ Models not found. Train models using train_model.py")
                self.model = None
                self.vectorizer = None
                self.priority_model = None
                self.priority_vectorizer = None
        except Exception as e:
            print(f"Error loading models: {e}")
    
    def predict_category(self, text):
        """Predict complaint category"""
        if self.model is None or self.vectorizer is None:
            return 'Other'
        
        try:
            text_vectorized = self.vectorizer.transform([text])
            category = self.model.predict(text_vectorized)[0]
            return category
        except Exception as e:
            print(f"Error predicting category: {e}")
            return 'Other'
    
    def predict_priority(self, text):
        """Predict complaint priority"""
        if self.priority_model is None or self.priority_vectorizer is None:
            return 'Medium'
        
        try:
            text_vectorized = self.priority_vectorizer.transform([text])
            priority = self.priority_model.predict(text_vectorized)[0]
            return priority
        except Exception as e:
            print(f"Error predicting priority: {e}")
            return 'Medium'
    
    def predict(self, text):
        """Predict both category and priority"""
        category = self.predict_category(text)
        priority = self.predict_priority(text)
        
        return {
            'category': category,
            'priority': priority
        }

# Initialize classifier
classifier = ComplaintClassifier()

def predict_complaint(complaint_text):
    """Main prediction function"""
    result = classifier.predict(complaint_text)
    return result
