document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessage = document.getElementById('error-message');
    const loadRandomQuestionBtn = document.getElementById('load-random-question');
    const verifyQuestionBtn = document.getElementById('verify-question');
    const questionText = document.getElementById('question-text');
    const choicesContainer = document.getElementById('choices-container');
    const metadataContainer = document.getElementById('metadata-container');
    const verificationResults = document.getElementById('verification-results');
    
    // Check if essential elements exist
    if (!questionText) {
        console.error("Error: Could not find element with ID 'question-text'");
        if (errorMessage) {
            errorMessage.textContent = "UI initialization error: Missing essential DOM elements";
            errorMessage.style.display = 'block';
        }
        return; // Stop execution if essential elements are missing
    }
    
    // Filters
    const standardFilter = document.getElementById('standard-filter');
    const lessonFilter = document.getElementById('lesson-filter');
    const difficultyFilter = document.getElementById('difficulty-filter');
    
    // Check if filter elements exist
    if (!standardFilter || !lessonFilter || !difficultyFilter) {
        console.error("Error: Could not find one or more filter elements");
        if (errorMessage) {
            errorMessage.textContent = "UI initialization error: Missing filter elements";
            errorMessage.style.display = 'block';
        }
        return; // Stop execution if filter elements are missing
    }
    
    // Current question data
    let currentQuestion = null;
    
    // Initialize
    initializeApp();
    
    /**
     * Initialize the application
     */
    async function initializeApp() {
        try {
            // Load standards and lessons for filters
            await loadFilters();
            
            // Set up event listeners
            setupEventListeners();
            
        } catch (error) {
            showError('Failed to initialize the application: ' + error.message);
        }
    }
    
    /**
     * Load standards and lessons for filter dropdowns
     */
    async function loadFilters() {
        try {
            showLoading(true);
            
            // Load available filters from the question dataset
            const filtersResponse = await fetch('/api/available-question-filters');
            if (!filtersResponse.ok) {
                throw new Error('Failed to fetch available filters');
            }
            const filterData = await filtersResponse.json();
            
            // Populate standards dropdown
            const standards = filterData.standards || [];
            standards.forEach(standard => {
                const option = document.createElement('option');
                option.value = standard;
                option.textContent = standard;
                standardFilter.appendChild(option);
            });
            
            // Store lessons data for later use
            const lessonsData = filterData.lessons || {};
            
            // Set up standard change event
            standardFilter.addEventListener('change', function() {
                // Clear lessons dropdown
                lessonFilter.innerHTML = '<option value="">Any</option>';
                
                if (standardFilter.value) {
                    // Get lessons for selected standard from our cached data
                    const standardLessons = lessonsData[standardFilter.value] || [];
                    
                    // Populate lessons dropdown
                    standardLessons.forEach(lesson => {
                        const option = document.createElement('option');
                        option.value = lesson.id;
                        option.textContent = lesson.title;
                        lessonFilter.appendChild(option);
                    });
                }
            });
            
            // Populate difficulty filter
            const difficulties = filterData.difficulties || [];
            difficulties.forEach(difficulty => {
                // Skip if it's already in the dropdown (we have default options)
                if (!Array.from(difficultyFilter.options).some(option => option.value === difficulty)) {
                    const option = document.createElement('option');
                    option.value = difficulty;
                    option.textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
                    difficultyFilter.appendChild(option);
                }
            });
            
            showLoading(false);
        } catch (error) {
            showLoading(false);
            showError('Failed to load filters: ' + error.message);
        }
    }
    
    /**
     * Set up event listeners
     */
    function setupEventListeners() {
        // Load random question button
        loadRandomQuestionBtn.addEventListener('click', loadRandomQuestion);
        
        // Verify question button
        verifyQuestionBtn.addEventListener('click', verifyCurrentQuestion);
    }
    
    /**
     * Load a random question based on filters
     */
    async function loadRandomQuestion() {
        try {
            showLoading(true);
            clearDisplay();
            
            // Build query params based on filters
            const params = new URLSearchParams();
            if (standardFilter.value) params.append('standard', standardFilter.value);
            if (lessonFilter.value) params.append('lesson', lessonFilter.value);
            if (difficultyFilter.value) params.append('difficulty', difficultyFilter.value);
            
            // Fetch random question
            const response = await fetch(`/api/random-question?${params.toString()}`);
            if (!response.ok) {
                if (response.status === 404) {
                    // Specific error for when no questions match filters
                    questionText.textContent = 'No questions found matching your filter criteria. Try selecting different filters or removing some constraints.';
                    showLoading(false);
                    return;
                }
                throw new Error(`Failed to fetch random question: ${response.status} ${response.statusText}`);
            }
            
            currentQuestion = await response.json();
            displayQuestion(currentQuestion);
            
            showLoading(false);
        } catch (error) {
            showLoading(false);
            showError('Failed to load random question: ' + error.message);
        }
    }
    
    /**
     * Display the question and its metadata
     */
    function displayQuestion(question) {
        if (!question) {
            questionText.textContent = 'No question available. Try different filters.';
            return;
        }
        
        // For debugging - log the structure to help diagnose issues
        console.log('Question structure:', question);
        
        // Display question text
        questionText.innerHTML = question.question_text || question.text || 'No question text available';
        
        // For curriculum questions, we don't have a separate choices property
        // so we'll handle this differently - clear the choices container first
        choicesContainer.innerHTML = '';
        
        // For curriculum questions, the choices are embedded in the question text
        // Just display a note about choices being in the question text
        const choiceDiv = document.createElement('div');
        choiceDiv.className = 'choice-item';
        choiceDiv.innerHTML = '<i>Note: This question from the curriculum has answer choices embedded in the question text.</i>';
        choicesContainer.appendChild(choiceDiv);
        
        // Parse the question to look for certain patterns that might indicate choices
        const questionTextContent = question.question_text || '';
        
        // Look for bullet points that might indicate choices
        if (questionTextContent.includes('- ')) {
            const choiceExplanation = document.createElement('div');
            choiceExplanation.className = 'choice-item';
            choiceExplanation.innerHTML = '<strong>Possible choices detected:</strong> (identified from bullet points in question text)';
            choicesContainer.appendChild(choiceExplanation);
            
            // Extract and display possible choices (this is a simple heuristic)
            const lines = questionTextContent.split('\n');
            lines.forEach(line => {
                if (line.trim().startsWith('- ')) {
                    const choiceText = line.trim().substring(2);
                    const choiceOption = document.createElement('div');
                    choiceOption.className = 'choice-item';
                    choiceOption.innerHTML = `• ${choiceText}`;
                    choicesContainer.appendChild(choiceOption);
                }
            });
        }
        
        // Display metadata
        metadataContainer.innerHTML = '';
        
        // Standard
        addMetadataItem('Standard', question.standard_code || 'N/A');
        
        // Standard Description
        if (question.standard_description) {
            addMetadataItem('Standard Description', question.standard_description);
        }
        
        // Lesson
        addMetadataItem('Lesson', question.lesson_title || 'N/A');
        
        // Grade
        if (question.grade) {
            addMetadataItem('Grade', question.grade);
        }
        
        // Add any other metadata fields present in the question
        for (const [key, value] of Object.entries(question)) {
            // Skip fields we've already displayed or that are too complex
            if (['question_text', 'text', 'standard_code', 'standard_description', 'lesson_title', 'grade'].includes(key) || 
                typeof value === 'object' || Array.isArray(value)) {
                continue;
            }
            
            addMetadataItem(key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()), value);
        }
        
        // Clear verification results
        verificationResults.innerHTML = '';
    }
    
    /**
     * Add a metadata item to the container
     */
    function addMetadataItem(label, value) {
        const metadataDiv = document.createElement('div');
        metadataDiv.className = 'metadata-item';
        metadataDiv.innerHTML = `<strong>${label}:</strong> ${value || 'N/A'}`;
        metadataContainer.appendChild(metadataDiv);
    }
    
    /**
     * Verify the current question
     */
    async function verifyCurrentQuestion() {
        if (!currentQuestion) {
            showError('No question loaded to verify');
            return;
        }
        
        try {
            showLoading(true);
            
            // Clear previous verification results
            verificationResults.innerHTML = '';
            
            // Call verification API
            const response = await fetch('/api/verify-question', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(currentQuestion)
            });
            
            if (!response.ok) {
                throw new Error('Failed to verify question');
            }
            
            const result = await response.json();
            displayVerificationResults(result);
            
            showLoading(false);
        } catch (error) {
            showLoading(false);
            showError('Failed to verify question: ' + error.message);
        }
    }
    
    /**
     * Display verification results
     */
    function displayVerificationResults(results) {
        // Create main result container
        const resultDiv = document.createElement('div');
        resultDiv.className = `verification-result ${results.overall_result ? 'pass' : 'fail'}`;
        
        // Overall result
        const overallResult = document.createElement('h4');
        overallResult.textContent = results.overall_result ? 'PASS' : 'FAIL';
        resultDiv.appendChild(overallResult);
        
        // Add explanation
        if (results.explanation) {
            const explanation = document.createElement('p');
            explanation.textContent = results.explanation;
            resultDiv.appendChild(explanation);
        }
        
        // Categories
        const categories = ['content', 'format', 'metadata'];
        categories.forEach(category => {
            if (results[category]) {
                const categoryDiv = document.createElement('div');
                categoryDiv.className = 'category-item';
                
                const categoryTitle = document.createElement('h5');
                categoryTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1);
                categoryDiv.appendChild(categoryTitle);
                
                const criteriaList = document.createElement('ul');
                Object.entries(results[category]).forEach(([criterion, { pass, reason }]) => {
                    const criterionItem = document.createElement('li');
                    criterionItem.innerHTML = `
                        <span style="color: ${pass ? '#28a745' : '#dc3545'}">
                            ${criterion}: ${pass ? 'Pass' : 'Fail'}
                        </span>
                        <p><small>${reason || 'No explanation provided'}</small></p>
                    `;
                    criteriaList.appendChild(criterionItem);
                });
                
                categoryDiv.appendChild(criteriaList);
                resultDiv.appendChild(categoryDiv);
            }
        });
        
        // Append to results container
        verificationResults.appendChild(resultDiv);
    }
    
    /**
     * Show or hide loading indicator
     */
    function showLoading(show) {
        loadingIndicator.style.display = show ? 'flex' : 'none';
    }
    
    /**
     * Show error message
     */
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        
        // Hide after 5 seconds
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    }
    
    /**
     * Clear the display
     */
    function clearDisplay() {
        questionText.textContent = 'Loading question...';
        choicesContainer.innerHTML = '';
        metadataContainer.innerHTML = '';
        verificationResults.innerHTML = '';
        errorMessage.style.display = 'none';
    }
}); 