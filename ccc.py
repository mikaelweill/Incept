import csv
import json
import ast  # For safely evaluating the array strings

# Define the input and output files
input_csv = 'ccc.csv'
output_json = 'ccc_structure.json'

# Initialize the data structure
ccc_data = {
    "content": []
}

# Read the CSV file
with open(input_csv, 'r', encoding='utf-8') as csvfile:
    reader = csv.DictReader(csvfile)
    
    for row in reader:
        # Parse the subject field which is a string representation of a list
        try:
            subject = ast.literal_eval(row['subject'])
        except:
            subject = row['subject']  # Keep as is if parsing fails
            
        # Add to our data structure
        ccc_data["content"].append({
            "id": row['id'],
            "content_type": row['content type'],
            "source": row['source'],
            "subject": subject,
            "grade": row['grade'],
            "standard": row['standard'],
            "lesson": row['lesson'],
            "difficulty": row['difficulty'],
            "interaction_type": row['interaction type']
        })

# Write to JSON file
with open(output_json, 'w', encoding='utf-8') as jsonfile:
    json.dump(ccc_data, jsonfile, indent=2)

print(f"Converted {len(ccc_data['content'])} items to JSON")