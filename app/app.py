from flask import Flask, render_template, jsonify, request, current_app
import json
import os
import ijson
import requests
from functools import lru_cache
import logging

app = Flask(__name__)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure file paths - use the correct paths
CONFIG = {
    'curriculum': os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'curriculum_structure.json'),
    'ccc': os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'ccc_structure.json')
}

# CCC API Configuration
CCC_API_BASE_URL = "https://commoncrawl.alpha1edtech.com"

def get_json_path(file_key):
    """Get the absolute path for a JSON file"""
    path = CONFIG.get(file_key, '')
    logger.info(f"Resolved path for {file_key}: {path}")
    
    # Try alternate locations if file doesn't exist
    if not os.path.exists(path):
        # Try directly in the project root
        alt_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), f"{file_key}_structure.json")
        logger.info(f"File not found at {path}, trying alternate path: {alt_path}")
        if os.path.exists(alt_path):
            return alt_path
    
    return path

@lru_cache(maxsize=1)
def load_curriculum_structure():
    """Load the curriculum structure from JSON file with caching"""
    try:
        file_path = get_json_path('curriculum')
        logger.info(f"Loading curriculum structure from: {file_path}")
        
        if not os.path.exists(file_path):
            # Search for curriculum_structure.json
            root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            for root, dirs, files in os.walk(root_dir):
                if "curriculum_structure.json" in files:
                    file_path = os.path.join(root, "curriculum_structure.json")
                    logger.info(f"Found curriculum file at: {file_path}")
                    break
        
        if not os.path.exists(file_path):
            logger.error(f"Could not find curriculum_structure.json file")
            return {}
            
        with open(file_path, 'r') as f:
            data = json.load(f)
            logger.info(f"Successfully loaded curriculum data")
            
            # Extract standards from the file
            standards = []
            
            # Curriculum may be directly at the top level or nested under 'curriculum'
            curriculum_data = data.get('curriculum', data)
            
            # Extract standards from lessons since they might not be separately listed
            standard_map = {}
            
            # Process by grade level
            if isinstance(curriculum_data, dict):
                lessons = []
                
                for grade, grade_data in curriculum_data.items():
                    logger.info(f"Processing grade: {grade}")
                    
                    # Grade data may contain lessons directly
                    if isinstance(grade_data, dict) and 'lessons' in grade_data:
                        grade_lessons = grade_data['lessons']
                        logger.info(f"Found {len(grade_lessons)} lessons in grade {grade}")
                        
                        # Go through lessons to collect standards
                        for i, lesson in enumerate(grade_lessons):
                            # Add grade info to lesson
                            lesson['grade'] = grade
                            
                            # Give the lesson an ID if it doesn't have one
                            if 'id' not in lesson:
                                lesson['id'] = f"{grade}-lesson-{i}"
                                
                            # Add to lessons collection
                            lessons.append(lesson)
                            
                            # Extract standard info
                            standard_code = lesson.get('standard_code')
                            standard_description = lesson.get('standard_description')
                            
                            if standard_code and standard_code not in standard_map:
                                standard_map[standard_code] = {
                                    'code': standard_code,
                                    'description': standard_description,
                                    'grade': grade
                                }
                
                # Convert standards map to list
                for std_code, std_data in standard_map.items():
                    standards.append(std_data)
                
                logger.info(f"Extracted {len(standards)} unique standards from lessons")
                logger.info(f"Total lessons: {len(lessons)}")
                
                # Enhance lessons with sample questions if available
                for lesson in lessons:
                    # Make sure sample questions are easily accessible 
                    if 'sample_questions' in lesson:
                        lesson['question_count'] = len(lesson['sample_questions'])
                    else:
                        lesson['question_count'] = 0
                
                # Build the restructured data
                restructured_data = {
                    'standards': standards,
                    'lessons': lessons
                }
                
                return restructured_data
            
            else:
                logger.warning(f"Unexpected curriculum data structure: {type(curriculum_data)}")
                return {
                    'standards': [],
                    'lessons': []
                }
            
    except Exception as e:
        logger.error(f"Error loading curriculum structure: {str(e)}", exc_info=True)
        print(f"ERROR loading curriculum structure: {str(e)}")
        return {
            'standards': [],
            'lessons': []
        }

@lru_cache(maxsize=1)
def load_ccc_structure():
    """Load the CCC structure from JSON file with caching"""
    try:
        file_path = get_json_path('ccc')
        logger.info(f"Loading CCC structure from: {file_path}")
        
        if not os.path.exists(file_path):
            # Search for ccc_structure.json
            root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            for root, dirs, files in os.walk(root_dir):
                if "ccc_structure.json" in files:
                    file_path = os.path.join(root, "ccc_structure.json")
                    logger.info(f"Found CCC file at: {file_path}")
                    break
        
        if not os.path.exists(file_path):
            logger.error(f"Could not find ccc_structure.json file")
            return {
                'items': []
            }
            
        with open(file_path, 'r') as f:
            data = json.load(f)
            logger.info(f"Successfully loaded CCC data")
            
            # Handle different possible structures
            if isinstance(data, dict):
                if 'items' in data:
                    logger.info(f"Found {len(data['items'])} items in CCC data")
                    return data
                elif 'content' in data:
                    # Content structure from the file
                    content_items = data['content']
                    logger.info(f"Found {len(content_items)} content items in CCC data")
                    
                    # Process items to have consistent keys
                    processed_items = []
                    for item in content_items:
                        # Map item fields to expected structure
                        processed_item = {
                            'id': item.get('id', ''),
                            'title': item.get('source', 'Unnamed Item'),
                            'type': item.get('content_type', 'article'),
                            'standard_code': item.get('standard', ''),
                            'lesson_id': item.get('lesson', ''),
                            'content': item,  # Include original content
                            'source': 'local'
                        }
                        processed_items.append(processed_item)
                    
                    return {'items': processed_items}
                else:
                    logger.warning(f"Unexpected CCC data structure with keys: {list(data.keys())}")
            else:
                logger.warning(f"Unexpected CCC data type: {type(data)}")
            
            # Return empty data structure if no valid data found
            return {
                'items': []
            }
            
    except Exception as e:
        logger.error(f"Error loading CCC structure: {str(e)}", exc_info=True)
        print(f"ERROR loading CCC structure: {str(e)}")
        return {
            'items': []
        }

# Routes for UI pages
@app.route('/')
def index():
    """Main dashboard page"""
    return render_template('index.html')

@app.route('/standards')
def standards_view():
    """Standards view page"""
    return render_template('standards.html')

@app.route('/lessons')
def lessons_view():
    """Lessons view page"""
    return render_template('lessons.html')

@app.route('/visualization')
def visualization_view():
    """Visualization view page"""
    return render_template('visualization.html')

# API Routes
@app.route('/api/standards', methods=['GET'])
def get_standards():
    """Returns a list of all standards"""
    try:
        curriculum_data = load_curriculum_structure()
        standards = curriculum_data.get('standards', [])
        return jsonify(standards)
    except Exception as e:
        logger.error(f"Error fetching standards: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/lessons', methods=['GET'])
def get_lessons():
    """Returns a list of all lessons, or lessons for a specific standard if standard_code is provided"""
    try:
        standard_code = request.args.get('standard_code')
        
        curriculum_data = load_curriculum_structure()
        all_lessons = curriculum_data.get('lessons', [])
        
        if standard_code:
            filtered_lessons = [lesson for lesson in all_lessons if lesson.get('standard_code') == standard_code]
            return jsonify(filtered_lessons)
        else:
            return jsonify(all_lessons)
    except Exception as e:
        logger.error(f"Error fetching lessons: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/standards/<standard_code>/lessons', methods=['GET'])
def get_standard_lessons(standard_code):
    """Returns lessons for a specific standard"""
    try:
        curriculum_data = load_curriculum_structure()
        all_lessons = curriculum_data.get('lessons', [])
        
        # Filter lessons by standard code
        standard_lessons = [lesson for lesson in all_lessons if lesson.get('standard_code') == standard_code]
        
        return jsonify(standard_lessons)
    except Exception as e:
        logger.error(f"Error fetching lessons for standard {standard_code}: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/ccc-content', methods=['GET'])
def get_ccc_content():
    try:
        standard_code = request.args.get('standard_code')
        lesson_id = request.args.get('lesson_id')
        
        logger.info(f"Fetching CCC content for standard_code={standard_code}, lesson_id={lesson_id}")
        
        # Try to use local data first
        ccc_data = load_ccc_structure()
        filtered_items = []
        
        # Log the size of the CCC data
        logger.info(f"Loaded CCC data with {len(ccc_data.get('items', []))} items")
        
        if ccc_data and 'items' in ccc_data:
            # Log a sample item to see its structure
            if ccc_data.get('items') and len(ccc_data.get('items')) > 0:
                sample_item = ccc_data.get('items')[0]
                logger.info(f"Sample CCC item keys: {list(sample_item.keys())}")
            
            # Filter by standard code or lesson ID if provided
            for item in ccc_data.get('items', []):
                # Check various possible field names for standard code
                item_standard = item.get('standard') or item.get('standard_code') or item.get('CFItemId') or item.get('humanCodingScheme')
                
                if standard_code and (item_standard == standard_code):
                    logger.info(f"Found matching item for standard {standard_code}: {item.get('id')} - {item.get('title')}")
                    filtered_items.append(item)
                elif lesson_id and str(item.get('lesson')) == str(lesson_id):
                    filtered_items.append(item)
            
            if not standard_code and not lesson_id:
                # If no filters provided, return all items (limited to avoid large responses)
                filtered_items = ccc_data.get('items', [])[:100]
        
        logger.info(f"Found {len(filtered_items)} items in local CCC data")
        
        # If we don't have enough local data, try the CCC API
        if not filtered_items and standard_code:
            logger.info(f"No local data found, trying CCC API for standard {standard_code}")
            try:
                # Use the CCC API to get content for this standard
                api_url = f"{CCC_API_BASE_URL}/standards/items?keyword={standard_code}"
                logger.info(f"Calling CCC API: {api_url}")
                
                response = requests.get(api_url, timeout=10)
                logger.info(f"CCC API response status: {response.status_code}")
                
                if response.status_code == 200:
                    standards_data = response.json()
                    logger.info(f"Found {len(standards_data)} standards from CCC API")
                    
                    # If we got standards data, log a sample
                    if standards_data and len(standards_data) > 0:
                        sample_standard = standards_data[0]
                        logger.info(f"Sample standard from API: {sample_standard.get('id')} - {sample_standard.get('humanCodingScheme')}")
                    
                    # For each standard found, get associated content
                    for standard in standards_data:
                        if 'id' in standard:
                            content_url = f"{CCC_API_BASE_URL}/sources/content?CFItemId={standard['id']}"
                            logger.info(f"Fetching content for standard ID {standard['id']}")
                            
                            content_response = requests.get(content_url, timeout=10)
                            logger.info(f"Content API response status: {content_response.status_code}")
                            
                            if content_response.status_code == 200:
                                content_items = content_response.json()
                                logger.info(f"Found {len(content_items)} content items for standard")
                                
                                # If we got content items, log a sample
                                if content_items and len(content_items) > 0:
                                    sample_content = content_items[0]
                                    logger.info(f"Sample content from API: {sample_content.get('id')} - {sample_content.get('name')} - Type: {sample_content.get('type')}")
                                
                                # Transform items to our expected format
                                for item in content_items:
                                    filtered_items.append({
                                        'id': item.get('id', ''),
                                        'title': item.get('name', ''),
                                        'type': item.get('type', ''),
                                        'standard_code': standard_code,
                                        'content': item.get('content', {}),
                                        'source': 'CCC API'
                                    })
            except Exception as api_err:
                logger.error(f"Error fetching from CCC API: {str(api_err)}")
                # Log the full exception for debugging
                logger.exception("CCC API exception details:")
        
        logger.info(f"Returning {len(filtered_items)} CCC content items")
        return jsonify(filtered_items)
    except Exception as e:
        logger.error(f"Error fetching CCC content: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/ccc-item/<item_id>')
def api_ccc_item(item_id):
    """Fetch detailed information about a specific CCC item, possibly from the CCC API"""
    try:
        logger.info(f"Fetching CCC item {item_id}")
        
        # First check our local cache/file
        ccc_data = load_ccc_structure()
        if ccc_data and 'items' in ccc_data:
            for item in ccc_data['items']:
                if str(item.get('id')) == str(item_id):
                    logger.info(f"Found item {item_id} in local data")
                    # Found the item in our local data
                    return jsonify(item)
        
        # If not found locally, try using the CCC API
        # First we need to find which standard this item might be associated with
        # This would require additional metadata we may not have...
        
        # Instead, make a direct attempt if we have a cfItemId
        if item_id.startswith("CFItem-"):
            cf_item_id = item_id.replace("CFItem-", "")
            api_url = f"{CCC_API_BASE_URL}/sources/content?CFItemId={cf_item_id}"
            logger.info(f"Trying direct CCC API lookup: {api_url}")
            
            response = requests.get(api_url, timeout=10)
            if response.status_code == 200:
                api_data = response.json()
                if api_data:
                    logger.info(f"Found item in CCC API")
                    return jsonify(api_data[0] if len(api_data) > 0 else {})
        
        # If we get here, item wasn't found
        logger.warning(f"Item {item_id} not found in local data or CCC API")
        return jsonify({"error": "Item not found"}), 404
    except Exception as e:
        logger.error(f"Error in CCC item API: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/structure')
def get_structure():
    try:
        print("Fetching curriculum and CCC data for structure...")
        curriculum_data = load_curriculum_structure()
        ccc_data = load_ccc_structure()
        
        print("Building structure data...")
        
        # Validate curriculum data structure
        if not curriculum_data or 'standards' not in curriculum_data or 'lessons' not in curriculum_data:
            return jsonify({'error': 'Invalid curriculum data structure'}), 400
        
        # Extract standards and lessons
        standards = curriculum_data.get('standards', [])
        lessons = curriculum_data.get('lessons', [])
        print(f"Found {len(standards)} standards and {len(lessons)} lessons")
        
        # Prepare data structures
        nodes = []
        links = []
        added_node_ids = set()
        
        # Process standards
        for standard in standards:
            # Use the standard code directly as the ID to ensure consistency
            standard_id = standard.get('code', '').replace('.', '_')
            
            if not standard_id:
                continue
                
            # Add standard node if not already added
            if standard_id not in added_node_ids:
                nodes.append({
                    'id': standard_id,
                    'type': 'standard',
                    'data': standard
                })
                added_node_ids.add(standard_id)
        
        # Process lessons
        for lesson in lessons:
            lesson_id = lesson.get('id') or f"lesson-{len(added_node_ids)}"
            
            # Add lesson node
            if lesson_id not in added_node_ids:
                nodes.append({
                    'id': lesson_id,
                    'type': 'lesson',
                    'data': lesson
                })
                added_node_ids.add(lesson_id)
            
            # Link lesson to its standard
            standard_code = lesson.get('standard_code', '')
            if standard_code:
                # Convert the standard code to match the format used for node IDs
                standard_id = standard_code.replace('.', '_')
                
                # Add link from standard to lesson
                links.append({
                    'source': standard_id,
                    'target': lesson_id,
                    'type': 'standard-lesson'
                })
        
        # Add content items from CCC data (limit to 100 to avoid overwhelming visualization)
        if ccc_data and 'content_items' in ccc_data:
            content_items = ccc_data.get('content_items', [])[:100]
            
            for item in content_items:
                item_id = item.get('id') or f"content-{len(added_node_ids)}"
                
                # Add content item node
                if item_id not in added_node_ids:
                    item_type = item.get('type', 'article')
                    nodes.append({
                        'id': item_id,
                        'type': item_type,
                        'data': item
                    })
                    added_node_ids.add(item_id)
                
                # Link content to lessons or standards
                related_lessons = item.get('related_lessons', [])
                for lesson_id in related_lessons:
                    if lesson_id in added_node_ids:
                        links.append({
                            'source': item_id,
                            'target': lesson_id,
                            'type': 'content-lesson'
                        })
        
        result = {
            'nodes': nodes,
            'links': links
        }
        
        print(f"Returning structure with {len(nodes)} nodes and {len(links)} links")
        return jsonify(result)
        
    except Exception as e:
        print(f"Error in get_structure: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001) 