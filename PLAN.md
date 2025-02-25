# Development Plan

## Phase 0: Project Setup & Infrastructure
1. Basic project structure ✓
   - FastAPI application skeleton ✓
   - Dependencies and environment setup ✓
   - Code quality tools ✓

2. Minimal Testing Setup
   - Basic pytest structure for critical paths
   - Simple fixtures for API testing
   - Success Criteria: Can test core functionality

## Phase 1: Question System Foundation
1. Basic Question Models
   - Define core Question schema
   - Add validation rules
   - Success Criteria: Can create/validate question objects

2. CCC Integration ✓
   - Create simple CCC client ✓
   - Fetch and store example questions ✓
   - Database direct access established ✓
   - Retrieved 8th grade science questions ✓
   - Success Criteria: Can fetch real questions from CCC ✓

3. Question Tagging (First Core Feature)
   - Data Preparation ✓
     - Standard <-> Lesson mapping JSON created ✓
     - Article/Question <-> Standard mapping JSON created ✓
   - Implement basic subject/grade tagging
   - Add NGSS standard matching
   - Implement lesson-level tagging
   - Success Criteria: Works for sample questions

## Phase 1.5: Visualization UI
1. Simple Dashboard ✓
   - Create a basic web interface to visualize mapping relationships ✓
   - Enable browsing of standards, lessons, and sample questions ✓
   - Success Criteria: Can visually navigate the curriculum structure ✓

2. Relationship Visualization (In Progress)
   - Implement a graph or tree view of standard-lesson relationships
   - Create interactive elements to explore connections
   - Bug fixes for standard-lesson relationships display ✓
   - Success Criteria: Relationships are intuitively displayed

3. Content Preview ✓
   - Add ability to preview sample questions ✓ 
   - Show metadata and tagging information ✓
   - Fixed UI for lesson descriptions display ✓
   - Display CCC content (articles and questions) for standards and lessons ✓
   - Success Criteria: Content is viewable in context ✓

## Phase 2: Quality Control System (UPDATED)
1. Question Grading Framework
   - Define basic grading criteria
   - Create simple scoring system
   - Leverage existing lesson/standard mappings for context-aware grading
   - Success Criteria: Can grade sample questions

2. LLM Integration
   - Set up OpenAI client
   - Basic prompt engineering
   - Include standard/lesson context from mapping JSONs in prompts
   - Success Criteria: Can get reliable responses

3. Quality Control Pipeline
   - Implement grading pipeline
   - Add feedback generation
   - Use mapping metadata to evaluate alignment with curriculum
   - Success Criteria: Can identify good/bad questions

## Phase 3: Question Generation (UPDATED)
1. Basic Generation
   - Template-based generation
   - Basic validation
   - Use standard/lesson mappings to target specific content areas
   - Success Criteria: Can generate valid questions

2. Quality-Aware Generation
   - Integrate with QC pipeline
   - Use sample questions from mapping files as examples/templates
   - Success Criteria: Generated questions pass QC

## Phase 4: Article System (UPDATED)
1. Article Generation
   - Generate content from questions
   - Add worked examples
   - Ensure consistency with standard descriptions from mapping files
   - Success Criteria: Articles match questions and standards

## Phase 5: Refinement & Scaling
1. Performance Improvements
   - Basic caching of JSON mappings for fast lookups
   - Optimize LLM usage with contextual information from mappings
   - Success Criteria: Reasonable response times

2. Error Handling
   - Add core error handling
   - Basic retry logic
   - Validation against mapping files to catch content misalignments
   - Success Criteria: System handles common errors

## Success Metrics
1. Question Quality
   - Questions are grade-appropriate
   - Questions align with standards (verified against standard<->lesson mapping)
   - Clear and unambiguous

2. Article Quality
   - Covers question concepts
   - Grade-appropriate explanations
   - Clear worked examples
   - Consistent with curriculum structure defined in mapping files

3. System Performance
   - Reasonable response times
   - Reliable operation
   - UI responsiveness for visualization components ✓

## Current Progress
- ✓ Created Standard <-> Lesson mapping JSON
- ✓ Created Article/Question <-> Standard mapping JSON
- ✓ Implemented basic dashboard with key statistics
- ✓ Created grade distribution visualization chart
- ✓ Fixed UI issues with lesson descriptions and standards display
- ✓ Enhanced dashboard statistics and data presentation
- ✓ Implemented CCC content display for articles and questions
- ✓ Added interactive modal system to view CCC content in detail
- ✓ Successfully connected to CCC database via SSH tunnel
- ✓ Retrieved 15,958 8th grade science questions from database
- ✓ Created database schema exploration utilities
- ✓ Identified correct relationships between content entries, questions, and articles
- ✓ Generated local JSON dataset of questions for processing

## Next Steps
1. Data Processing and Analysis:
   - Process the retrieved 8th grade science questions
   - Extract key metadata and patterns to inform tagging strategy
   - Analyze question distribution across NGSS standards

2. Complete the relationship visualization component:
   - Implement force-directed graph for standards-lessons relationships
   - Add filtering capabilities by grade, subject, or domain
   
3. Begin Question Tagging Implementation:
   - Develop automated tagging system using standard descriptions
   - Map retrieved questions to our curriculum structure
   - Create validation process for tagged questions

4. Develop Question Grading Framework:
   - Define grading criteria based on curriculum alignment
   - Design initial scoring system prototype
   
5. Begin LLM integration:
   - Set up OpenAI client connections
   - Create basic prompt templates for question analysis
   - Implement context-aware prompting using standard/lesson data 