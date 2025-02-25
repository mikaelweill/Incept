#!/usr/bin/env python3
import asyncio
import json
from dotenv import load_dotenv
from src.services.ccc_client import CCCClient
from src.services.grader import QuestionGrader

async def main():
    """
    Fetch real questions from CCC API and grade them
    """
    print("Initializing CCC Client and Question Grader...")
    # Load environment variables for API keys
    load_dotenv()
    
    # Initialize services
    ccc = CCCClient()
    grader = QuestionGrader()
    
    # List of standards to fetch questions for
    standards = [
        "MS-PS2-2",  # Forces and Motion
    ]
    
    # Keep track of pass/fail statistics
    stats = {
        "total": 0,
        "passed": 0,
        "failed": 0,
        "failures_by_category": {}
    }
    
    # For each standard, fetch questions and grade them
    for standard in standards:
        print(f"\n=== Fetching questions for standard {standard} ===")
        try:
            # First get the standard details
            standard_obj = await ccc._get_standard(standard)
            print(f"Standard object: {json.dumps(standard_obj, indent=2)}")
            
            # Then get all content for this standard to see raw data
            content_items = await ccc._get_content_for_standard(standard_obj["id"])
            print(f"Content items count: {len(content_items)}")
            if content_items:
                print(f"Sample content item: {json.dumps(content_items[0], indent=2)}")
            
            # Now try to get questions normally
            questions = await ccc.get_questions_for_standard(standard)
            print(f"Found {len(questions)} questions for standard {standard}")
            
            # Check if we have any questions to grade
            if not questions:
                print("No questions found to grade.")
                continue
                
            # Convert Pydantic models to dictionaries for the grader
            for i, question in enumerate(questions):
                question_dict = question.dict()
                print(f"\n--- Grading Question {i+1}/{len(questions)} for {standard} ---")
                
                # Grade the question
                result = await grader.grade_question(question_dict)
                
                # Update statistics
                stats["total"] += 1
                if result["passed"]:
                    stats["passed"] += 1
                    print(f"✅ PASSED")
                else:
                    stats["failed"] += 1
                    print(f"❌ FAILED: {result['feedback']}")
                    
                    # Track failure categories from scorecard
                    for category, passed in result["scorecard"].items():
                        if not passed:
                            stats["failures_by_category"][category] = stats["failures_by_category"].get(category, 0) + 1
        
        except Exception as e:
            print(f"Error processing standard {standard}: {str(e)}")
            import traceback
            print(traceback.format_exc())
    
    # Print summary statistics
    print("\n=== GRADING SUMMARY ===")
    print(f"Total questions graded: {stats['total']}")
    
    if stats['total'] > 0:
        passed_pct = stats['passed']/stats['total']*100
        failed_pct = stats['failed']/stats['total']*100
    else:
        passed_pct = failed_pct = 0
        
    print(f"Passed: {stats['passed']} ({passed_pct:.1f}%)")
    print(f"Failed: {stats['failed']} ({failed_pct:.1f}%)")
    
    if stats["failures_by_category"] and stats['failed'] > 0:
        print("\nFailures by category:")
        for category, count in sorted(stats["failures_by_category"].items(), key=lambda x: x[1], reverse=True):
            print(f"  - {category}: {count} failures ({count/stats['failed']*100:.1f}% of failures)")

if __name__ == "__main__":
    asyncio.run(main()) 