# External Documentation References

## Course and Content Resources

### Course Definitions
- **Description**: Lists of lessons by subject and grade level, with current lessons as baseline quality examples
- **Source**: [Course Definitions Spreadsheet](https://docs.google.com/spreadsheets/d/1GMCEXqSVFZ-l-nMDGvPl6eOWhuZw29z6rYDhoQgJMZs/edit?gid=0#gid=0)

### Common Core Crawl (CCC)

#### API Documentation
- **Description**: Guide for accessing standards and content programmatically
- **Base URL**: https://commoncrawl.alpha1edtech.com
- **Documentation**: [CCC API Guide](https://docs.google.com/document/d/1CurvQyCGHL6_zuWXeY8--d9dYi0nIse9HSKSatk3yhw/edit?tab=t.0#heading=h.9kn1guva9bzy)

#### Content Inventory
- **Description**: Inventory of available content in CCC database
- **Source**: [CCC Inventory Spreadsheet](https://docs.google.com/spreadsheets/d/1lOorlDtToCKNcOVBIcLFMYrz3dANSCAWAQAISUqBZl0/edit?gid=0#gid=0)

#### Database Access
- **Description**: Guide for direct database connection
- **Documentation**: [Database Connection Guide](https://docs.google.com/document/d/16_wYiiTdhAqjDlxPQW-oZzBDmVpDfIaS1f1eU66cqzw/edit?tab=t.0)

#### Browser Interface
- **Description**: Web interface for browsing CCC content
- **URL**: [CCC Browser App](https://ccc-light-consulting.vercel.app/)

### 1EdTech QTI Implementation

#### Extended QTI Implementation
- **Description**: CRUD API with JSON representation for QTI content types
- **Documentation**: [1EdTech QTI Implementation Guide](https://docs.google.com/document/d/16cIsRjdXXcxOKUXQNzpQ0P86RJk1u9h_AcwXS8IvXIY/edit?tab=t.0)

## Content Structure

### QTI Mapping Overview

#### Course Structure
- **Course** → AssessmentTest
- **Lesson** → TestPart (contains two sections)
- **Article Section** → Section (holds worked example AssessmentItems)
- **Article** → AssessmentStimulus
- **Question Bank Section** → Section (holds question AssessmentItems)

#### Question Components in QTI
- **Item Body**:
  - Prompt
  - Stimuli
  - Images/diagrams
  - Interaction type (including choices for MCQ)
  - Wrong answer explanations
- **Response Declaration**: Correct answer
- **Feedback Block (explanation)**: Full explanation
- **Feedback Block (solution)**: Solution
- **Rubric Block**: Grading criteria

## API Endpoints

### Question Generator Endpoints
1. **tagQuestion**
   - Input: Question
   - Output: subject, grade, standard, lesson, difficulty

2. **gradeQuestion**
   - Input: Tagged question
   - Output: pass/fail, scorecard, feedback (if failed)

3. **generateQuestion**
   - Input: Either tags or example question
   - Output: Generated question that passes grader

### Article Generator Endpoints
(Similar structure to Question endpoints, specific documentation needed)

## Content Quality Guidelines

### Question Quality Criteria
- Consistent with teaching article
- Appropriate categorization
- All required parts present
- Accurate correct answer
- Valid distractors
- Clear explanations
- Grade-appropriate language
- Proper formatting

### Article Quality Criteria
- Appropriate categorization
- Direct Instruction style
- Clear worked examples
- Factually accurate
- Grade-appropriate language
- Proper formatting
- Consistent explanations

### Question Bank Quality Criteria
- Appropriate categorization
- Comprehensive coverage
- Sufficient depth (100+ questions per difficulty) 