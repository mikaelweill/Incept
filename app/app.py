from flask import Flask, render_template, jsonify, request, current_app
import json
import os
import ijson
import requests
from functools import lru_cache

app = Flask(__name__)

# Configuration
app.config['JSON_FILES'] = {
    'curriculum': '../curriculum_structure.json',
    'ccc': '../ccc_structure.json',
}

# Path resolution helper
def get_json_path(file_key):
    """Get absolute path for a JSON file"""
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), 
                       app.config['JSON_FILES'][file_key])

# Cache for expensive operations
@lru_cache(maxsize=32)
def load_curriculum_structure():
    """Load the curriculum structure JSON file with caching"""
    try:
        with open(get_json_path('curriculum'), 'r') as f:
            return json.load(f)
    except Exception as e:
        current_app.logger.error(f"Error loading curriculum file: {str(e)}")
        return {"curriculum": {}}

# Routes for UI pages
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/standards')
def standards():
    return render_template('standards.html')

@app.route('/lessons')
def lessons():
    return render_template('lessons.html')

@app.route('/visualization')
def visualization():
    return render_template('visualization.html')

# API Routes
@app.route('/api/standards')
def api_standards():
    """Get all standards from curriculum structure"""
    try:
        data = load_curriculum_structure()
        curriculum = data.get('curriculum', {})
        
        # Extract all standards from all grade levels
        all_standards = []
        standard_codes_seen = set()
        
        for grade, grade_data in curriculum.items():
            lessons = grade_data.get('lessons', [])
            
            for lesson in lessons:
                standard_code = lesson.get('standard_code')
                standard_desc = lesson.get('standard_description')
                
                if standard_code and standard_code not in standard_codes_seen:
                    standard_codes_seen.add(standard_code)
                    all_standards.append({
                        'code': standard_code,
                        'description': standard_desc,
                        'name': standard_code,
                        'grade': grade
                    })
        
        return jsonify(all_standards)
    except Exception as e:
        current_app.logger.error(f"Error in standards API: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/lessons')
def api_lessons():
    """Get all lessons from curriculum structure"""
    try:
        data = load_curriculum_structure()
        curriculum = data.get('curriculum', {})
        
        # Extract all lessons from all grade levels
        all_lessons = []
        
        for grade, grade_data in curriculum.items():
            lessons = grade_data.get('lessons', [])
            
            for lesson in lessons:
                # Add grade information to each lesson
                lesson['grade'] = grade
                all_lessons.append(lesson)
        
        return jsonify(all_lessons)
    except Exception as e:
        current_app.logger.error(f"Error in lessons API: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/standards/<standard_code>/lessons')
def api_standard_lessons(standard_code):
    """Get lessons for a specific standard"""
    try:
        data = load_curriculum_structure()
        curriculum = data.get('curriculum', {})
        
        # Find all lessons matching this standard code
        standard_lessons = []
        
        for grade, grade_data in curriculum.items():
            lessons = grade_data.get('lessons', [])
            
            for lesson in lessons:
                if lesson.get('standard_code') == standard_code:
                    # Add grade information
                    lesson_copy = lesson.copy()
                    lesson_copy['grade'] = grade
                    standard_lessons.append(lesson_copy)
        
        return jsonify(standard_lessons)
    except Exception as e:
        current_app.logger.error(f"Error in standard lessons API: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/ccc-content')
def api_ccc_content():
    """Get CCC content based on filter parameters"""
    try:
        # Get filter parameters
        standard_code = request.args.get('standard')
        lesson_id = request.args.get('lesson')
        
        # Stream-parse the large CCC file to avoid loading it all into memory
        content_items = []
        
        # Different filtering strategies based on parameters
        if standard_code:
            # Filter by standard code
            with open(get_json_path('ccc'), 'r') as f:
                for item in ijson.items(f, 'item'):
                    if item.get('standard') == standard_code:
                        content_items.append(item)
                        
                        # Limit to prevent overwhelming response
                        if len(content_items) >= 50:
                            break
                            
        elif lesson_id:
            # Try to convert lesson_id to int if it's a string
            try:
                lesson_id = int(lesson_id)
            except (ValueError, TypeError):
                pass
                
            # Filter by lesson ID
            with open(get_json_path('ccc'), 'r') as f:
                for item in ijson.items(f, 'item'):
                    if item.get('lesson') == lesson_id:
                        content_items.append(item)
                        
                        # Limit to prevent overwhelming response
                        if len(content_items) >= 50:
                            break
        else:
            # No filter, return a sample of items
            with open(get_json_path('ccc'), 'r') as f:
                count = 0
                for item in ijson.items(f, 'item'):
                    content_items.append(item)
                    count += 1
                    
                    # Return a limited sample
                    if count >= 20:
                        break
        
        return jsonify(content_items)
    except Exception as e:
        current_app.logger.error(f"Error in CCC content API: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/ccc-item/<item_id>')
def api_ccc_item(item_id):
    """Fetch detailed information about a specific CCC item, possibly from the CCC API"""
    try:
        # First check our local cache/file
        with open(get_json_path('ccc'), 'r') as f:
            for item in ijson.items(f, 'item'):
                if str(item.get('id')) == str(item_id):
                    # Found the item in our local data
                    
                    # If item has CCC API details, try to enrich with API data
                    if 'cfItemId' in item:
                        try:
                            # Query the CCC API for more details using the cfItemId
                            api_url = f"https://commoncrawl.alpha1edtech.com/sources/content?CFItemId={item['cfItemId']}"
                            response = requests.get(api_url, timeout=5)
                            
                            if response.status_code == 200:
                                api_data = response.json()
                                # Merge API data with our item
                                item['api_data'] = api_data
                        except Exception as api_err:
                            current_app.logger.error(f"Error fetching from CCC API: {str(api_err)}")
                    
                    return jsonify(item)
        
        # If we get here, item wasn't found
        return jsonify({"error": "Item not found"}), 404
    except Exception as e:
        current_app.logger.error(f"Error in CCC item API: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/structure')
def api_structure():
    """Get a structure for visualization that connects standards to lessons to content"""
    try:
        # Get the structure from both file sources
        curriculum_data = load_curriculum_structure()
        curriculum = curriculum_data.get('curriculum', {})
        
        # Build nodes and links for visualization
        nodes = []
        links = []
        node_ids = set()
        
        # First add all standards
        for grade, grade_data in curriculum.items():
            lessons = grade_data.get('lessons', [])
            
            for lesson in lessons:
                standard_code = lesson.get('standard_code')
                if standard_code and f"standard-{standard_code}" not in node_ids:
                    nodes.append({
                        "id": f"standard-{standard_code}",
                        "label": standard_code,
                        "type": "standard",
                        "data": {
                            "description": lesson.get('standard_description', ''),
                            "grade": grade
                        }
                    })
                    node_ids.add(f"standard-{standard_code}")
        
        # Add lessons and connect to standards
        for grade, grade_data in curriculum.items():
            lessons = grade_data.get('lessons', [])
            
            for i, lesson in enumerate(lessons):
                lesson_id = lesson.get('id', i)
                lesson_title = lesson.get('title', f"Lesson {lesson_id}")
                standard_code = lesson.get('standard_code')
                
                # Add lesson node
                if f"lesson-{lesson_id}" not in node_ids:
                    nodes.append({
                        "id": f"lesson-{lesson_id}",
                        "label": lesson_title,
                        "type": "lesson",
                        "data": {
                            "title": lesson_title,
                            "standard_code": standard_code,
                            "description": lesson.get('description', ''),
                            "grade": grade
                        }
                    })
                    node_ids.add(f"lesson-{lesson_id}")
                
                # Connect lesson to standard
                if standard_code:
                    links.append({
                        "source": f"standard-{standard_code}",
                        "target": f"lesson-{lesson_id}",
                        "value": 1
                    })
        
        # Create the structure object
        structure = {
            "nodes": nodes,
            "links": links
        }
        
        return jsonify(structure)
    except Exception as e:
        current_app.logger.error(f"Error in structure API: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001) 