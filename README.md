# Incept

Curriculum mapping and visualization project for educational content.

This repository contains tools for:
- Mapping standards to lessons
- Visualizing curriculum relationships
- Organizing educational content

## Requirements

- Python 3.8 or higher
- pip (Python package installer)
- OpenAI API key
- CCC (Common Core Crawl) API key

## Project Overview
This service provides three main functionalities for both questions and articles:
- Tagging: Identify content attributes
- Grading: Quality control with detailed feedback
- Generation: Create new content meeting specifications

## Setup

### 1. Environment Setup

```bash
# Clone the repository
git clone [repository-url]
cd incept

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configuration

Create a `.env` file in the root directory with the following variables:

```ini
# API Keys
OPENAI_API_KEY=your_openai_key_here
CCC_API_KEY=your_ccc_key_here

# Environment
ENVIRONMENT=development  # or production

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
LOG_LEVEL=INFO

# OpenAI Configuration
OPENAI_MODEL=gpt-4  # or gpt-3.5-turbo
MAX_TOKENS=2000
TEMPERATURE=0.7

# Content Generation Settings
GRADE_LEVEL=8
SUBJECT=science
```

### 3. Code Style Setup

```bash
# Install pre-commit hooks
pre-commit install

# Format code
black .
isort .
flake8
```

### 4. Running the Server

Development mode:
```bash
uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000
```

Production mode:
```bash
uvicorn src.api.main:app --host 0.0.0.0 --port 8000
```

API documentation will be available at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Project Structure

```
incept/
├── .env                 # Environment variables (git-ignored)
├── .gitignore          # Git ignore file
├── requirements.txt    # Python dependencies
├── README.md          # This file
├── src/
│   ├── api/           # FastAPI application
│   ├── models/        # Data models
│   ├── services/      # Business logic
│   └── utils/         # Helper functions
└── tests/             # Test suite
```

## Git-ignored Files

The following files are not tracked in git and need to be set up locally:
- `.env` - Environment variables (template provided above)
- `venv/` - Virtual environment
- `.pytest_cache/` - Pytest cache
- `__pycache__/` - Python cache
- `.coverage` - Coverage reports
- `*.pyc` - Python compiled files

## API Endpoints

### Questions
- POST /api/v1/questions/tag
- POST /api/v1/questions/grade
- POST /api/v1/questions/generate

### Articles
- POST /api/v1/articles/tag
- POST /api/v1/articles/grade
- POST /api/v1/articles/generate

## Development Process
1. Question Generation System
   - Build test harness
   - Implement quality control
   - Develop generation system

2. Article Generation System
   - Align with question requirements
   - Ensure comprehensive coverage
   - Maintain consistency

## Testing
```bash
# Run all tests
pytest

# Run with coverage report
pytest --cov=src

# Run specific test file
pytest tests/test_specific.py
```

## Troubleshooting

Common issues and solutions:

1. **OpenAI API Error**
   - Verify API key in `.env`
   - Check API usage limits
   - Ensure correct model name in configuration

2. **CCC API Issues**
   - Verify API key in `.env`
   - Check API endpoint status
   - Validate request format

3. **Dependencies Issues**
   - Clear pip cache: `pip cache purge`
   - Reinstall dependencies: `pip install -r requirements.txt --no-cache-dir`
   - Verify Python version: `python --version` 