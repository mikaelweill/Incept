import csv
import json
import re

# Define input and output files
input_csv = 'IXL.csv'
output_json = 'curriculum_structure.json'

# Function to handle extracting markdown content from triple backtick blocks
def extract_markdown_blocks(text):
    if not text:
        return []
    
    # Pattern to match markdown blocks inside triple backticks
    pattern = r'```markdown(.*?)```'
    # re.DOTALL allows the dot to match newlines
    matches = re.findall(pattern, text, re.DOTALL)
    
    # Clean up the matches
    cleaned_matches = [match.strip() for match in matches]
    return cleaned_matches

# Initialize our data structures
curriculum_data = {}

try:
    # First try using Python's CSV reader, which can handle properly quoted multiline fields
    with open(input_csv, 'r', encoding='utf-8') as csvfile:
        # Use csv.reader with a custom dialect to handle the complex format
        reader = csv.DictReader(csvfile)
        
        for row in reader:
            grade = row.get('Grade', '')
            lesson = row.get('Lesson', '')
            
            # Skip empty rows
            if not grade or not lesson:
                continue
            
            # Initialize grade if not exists
            if grade not in curriculum_data:
                curriculum_data[grade] = {
                    'lessons': []
                }
            
            # Extract sample questions as markdown blocks
            sample_questions = []
            for i in range(1, 5):  # Assuming up to 4 sample questions
                field_name = f'Sample Question {i}'
                if field_name in row and row[field_name]:
                    markdown_blocks = extract_markdown_blocks(row[field_name])
                    if markdown_blocks:
                        sample_questions.extend(markdown_blocks)
            
            # Create lesson object
            lesson_data = {
                'title': lesson,
                'third_party_code': row.get('Third party code', ''),
                'ixl_skill_code': row.get('IXL skill code', ''),
                'order': row.get('Order', ''),
                'video_url': row.get('Instructional Video URL', ''),
                'standard_code': row.get('Standard Code', ''),
                'standard_description': row.get('Standard Description', ''),
                'sample_questions': sample_questions
            }
            
            # Add lesson to the grade
            curriculum_data[grade]['lessons'].append(lesson_data)
    
    # If no entries were found using the standard approach, try a more custom approach
    if not curriculum_data:
        raise Exception("No data was extracted using standard CSV reader, trying custom approach")

except Exception as e:
    print(f"Error with standard CSV parsing: {e}")
    print("Trying custom parsing approach...")
    
    # Custom parsing for problematic CSV with embedded markdown
    with open(input_csv, 'r', encoding='utf-8') as file:
        content = file.read()
        
        # Split the content into rows, preserving the markdown blocks
        rows = []
        current_row = []
        in_markdown = False
        
        for line in content.split('\n'):
            if '```markdown' in line:
                in_markdown = True
                if current_row:
                    current_row[-1] = current_row[-1] + line
                else:
                    current_row = [line]
            elif '```' in line and in_markdown:
                in_markdown = False
                if current_row:
                    current_row[-1] = current_row[-1] + '\n' + line
            elif in_markdown:
                if current_row:
                    current_row[-1] = current_row[-1] + '\n' + line
            else:
                # Not in markdown block, treat as a normal CSV line
                if line.count(',') >= 3:  # Minimum number of commas for a valid row
                    if current_row:
                        rows.append(current_row)
                    current_row = line.split(',')
                else:
                    # This might be a continuation of a previous field
                    if current_row:
                        current_row[-1] = current_row[-1] + '\n' + line
        
        # Add the last row
        if current_row:
            rows.append(current_row)
        
        # Get headers from the first row
        if rows:
            headers = rows[0]
            data_rows = rows[1:]
            
            for row_data in data_rows:
                if len(row_data) >= 3:  # Minimum fields to be valid
                    row = {headers[i]: row_data[i] if i < len(row_data) else '' for i in range(len(headers))}
                    
                    grade = row.get('Grade', '')
                    lesson = row.get('Lesson', '')
                    
                    # Skip empty rows
                    if not grade or not lesson:
                        continue
                    
                    # Initialize grade if not exists
                    if grade not in curriculum_data:
                        curriculum_data[grade] = {
                            'lessons': []
                        }
                    
                    # Extract sample questions as markdown blocks
                    sample_questions = []
                    for i in range(1, 5):  # Assuming up to 4 sample questions
                        field_name = f'Sample Question {i}'
                        if field_name in row and row[field_name]:
                            markdown_blocks = extract_markdown_blocks(row[field_name])
                            if markdown_blocks:
                                sample_questions.extend(markdown_blocks)
                    
                    # Create lesson object
                    lesson_data = {
                        'title': lesson,
                        'third_party_code': row.get('Third party code', ''),
                        'ixl_skill_code': row.get('IXL skill code', ''),
                        'order': row.get('Order', ''),
                        'video_url': row.get('Instructional Video URL', ''),
                        'standard_code': row.get('Standard Code', ''),
                        'standard_description': row.get('Standard Description', ''),
                        'sample_questions': sample_questions
                    }
                    
                    # Add lesson to the grade
                    curriculum_data[grade]['lessons'].append(lesson_data)

# Structure the final JSON
final_structure = {
    'curriculum': curriculum_data
}

# Write to JSON file
with open(output_json, 'w', encoding='utf-8') as jsonfile:
    json.dump(final_structure, jsonfile, indent=2)

print(f"Processed curriculum data to {output_json}")
print(f"Total grades: {len(curriculum_data)}")
total_lessons = sum(len(data['lessons']) for data in curriculum_data.values())
print(f"Total lessons: {total_lessons}") 