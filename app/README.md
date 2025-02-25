# Curriculum Visualization UI

This is a simple web-based visualization tool for exploring the curriculum structure, including standards, lessons, and sample questions.

## Features

- **Dashboard**: Overview with key statistics and summary visualizations
- **Standards Explorer**: Browse through standards and see connected lessons
- **Lessons Explorer**: Explore lessons and their sample questions
- **Relationship Visualization**: Interactive graph showing connections between standards and lessons

## Setup

### Prerequisites

- Python 3.8+ (Tested with Python 3.13)
- Virtual environment (recommended)
- Flask
- Your curriculum data files (`curriculum_structure.json` and `ccc_structure.json`)

### Installation

1. Create and activate a virtual environment (recommended):
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install the required packages:
   ```bash
   pip install flask ijson python-dotenv openai
   # OR use the requirements file
   pip install -r requirements.txt
   ```

3. Make sure your JSON data files are in the root directory:
   - `curriculum_structure.json` (standard-lesson mapping)
   - `ccc_structure.json` (lesson-question mapping)

### Running the App

Always activate the virtual environment before running the app:
```bash
source venv/bin/activate  # On Windows: venv\Scripts\activate
python3 run_visualizer.py
```

Access the application at: http://localhost:5001

## Usage

- **Dashboard**: View overall statistics and summary
- **Standards View**: Select a standard to see related lessons
- **Lessons View**: Browse lessons and their details
- **Visualization View**: Interact with the graph to explore relationships

## Data Format

The application expects two main JSON files:

1. **curriculum_structure.json** - Standard-to-lesson mapping:
   ```json
   {
     "eighth_grade_science": {
       "standards": {
         "MS-ESS1-4": {
           "description": "...",
           "lessons": [1, 2, 3]
         }
       },
       "lessons": [
         {
           "id": 1,
           "title": "Lesson Title",
           "standard_code": "MS-ESS1-4",
           "sample_questions": ["..."]
         }
       ]
     }
   }
   ```

2. **ccc_structure.json** - Additional content structure

## Development

- **Templates**: `/app/templates/`
- **Static assets**: `/app/static/`
- **API routes**: `/app/app.py`

### Customization

- Modify the CSS styles in `/app/static/css/style.css`
- Update visualizations in the JavaScript files
- Add new views by creating templates and routes 