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
        
        // Create a notification about curriculum questions
        const choiceHeader = document.createElement('div');
        choiceHeader.className = 'choice-header';
        choiceHeader.innerHTML = '<h4>Answer Choices</h4><p><i>This question from the curriculum has answer choices embedded in the question text. Attempting to extract and identify them:</i></p>';
        choicesContainer.appendChild(choiceHeader);
        
        // Parse the question to look for certain patterns that might indicate choices
        const questionTextContent = question.question_text || '';
        
        // --- Enhanced Answer Extraction Logic ---
        
        let foundChoices = false;
        let correctAnswerFound = false;
        
        // 1. Look for bullet points with letters/numbers that might indicate multiple choice
        const letterBulletRegex = /^[A-D]\.\s+(.+)$/gmi;
        const numberBulletRegex = /^[1-4]\.\s+(.+)$/gmi;
        
        // Cache the lines for reuse
        const lines = questionTextContent.split('\n');
        
        // Look for multiple choice with A, B, C, D format
        let letterChoices = [];
        lines.forEach(line => {
            const trimmedLine = line.trim();
            const letterMatch = trimmedLine.match(/^([A-D])\.\s+(.+)$/i);
            
            if (letterMatch) {
                foundChoices = true;
                
                const letter = letterMatch[1];
                const choiceText = letterMatch[2];
                
                // Check if this is likely the correct answer
                const isLikelyCorrect = 
                    choiceText.toLowerCase().includes('correct') || 
                    line.includes('✓') ||
                    line.includes('✅') ||
                    line.includes('*correct*') ||
                    line.includes('**correct**') ||
                    trimmedLine.endsWith('(correct)') ||
                    trimmedLine.endsWith('(Correct)') ||
                    trimmedLine.endsWith('(RIGHT)') ||
                    trimmedLine.endsWith('(right)');
                
                letterChoices.push({
                    letter,
                    text: choiceText,
                    isCorrect: isLikelyCorrect
                });
                
                if (isLikelyCorrect) {
                    correctAnswerFound = true;
                }
            }
        });
        
        // Display letter choices if found
        if (letterChoices.length > 0) {
            const choiceExplanation = document.createElement('div');
            choiceExplanation.className = 'choice-item';
            choiceExplanation.innerHTML = '<strong>Multiple choice options detected:</strong>';
            choicesContainer.appendChild(choiceExplanation);
            
            letterChoices.forEach(choice => {
                const choiceOption = document.createElement('div');
                choiceOption.className = `choice-item ${choice.isCorrect ? 'correct' : ''}`;
                
                if (choice.isCorrect) {
                    choiceOption.innerHTML = `<strong>${choice.letter}.</strong> ${choice.text} <span class="correct-indicator">✓ CORRECT</span>`;
                } else {
                    choiceOption.innerHTML = `<strong>${choice.letter}.</strong> ${choice.text}`;
                }
                
                choicesContainer.appendChild(choiceOption);
            });
        }
        
        // 2. Check for answer designations in the text (e.g., "The answer is C")
        if (!correctAnswerFound) {
            const answerDesignations = [
                /The\s+correct\s+answer\s+is\s+([A-D])/i,
                /The\s+answer\s+is\s+([A-D])/i,
                /Correct\s+answer:\s+([A-D])/i,
                /Answer:\s+([A-D])/i
            ];
            
            let correctLetter = null;
            
            for (const regex of answerDesignations) {
                const match = questionTextContent.match(regex);
                if (match) {
                    correctLetter = match[1];
                    break;
                }
            }
            
            // If we found a letter designation and we have letter choices, mark the correct one
            if (correctLetter && letterChoices.length > 0) {
                const correctIndex = letterChoices.findIndex(choice => 
                    choice.letter.toLowerCase() === correctLetter.toLowerCase());
                
                if (correctIndex !== -1) {
                    correctAnswerFound = true;
                    
                    // Clear existing choices and redisplay with correct one highlighted
                    // We need to remove the content after the header
                    const childrenToRemove = Array.from(choicesContainer.children).slice(1);
                    childrenToRemove.forEach(child => child.remove());
                    
                    const choiceExplanation = document.createElement('div');
                    choiceExplanation.className = 'choice-item';
                    choiceExplanation.innerHTML = `<strong>Multiple choice options (with correct answer marked):</strong>`;
                    choicesContainer.appendChild(choiceExplanation);
                    
                    letterChoices.forEach((choice, index) => {
                        const choiceOption = document.createElement('div');
                        const isCorrect = index === correctIndex;
                        choiceOption.className = `choice-item ${isCorrect ? 'correct' : ''}`;
                        
                        if (isCorrect) {
                            choiceOption.innerHTML = `<strong>${choice.letter}.</strong> ${choice.text} <span class="correct-indicator">✓ CORRECT</span>`;
                        } else {
                            choiceOption.innerHTML = `<strong>${choice.letter}.</strong> ${choice.text}`;
                        }
                        
                        choicesContainer.appendChild(choiceOption);
                    });
                }
            }
        }
        
        // 3. Look for options in a table format (common in curriculum questions)
        if (!foundChoices && questionTextContent.includes('|')) {
            // Look for markdown tables
            const tableRows = questionTextContent.split('\n').filter(line => line.trim().startsWith('|'));
            
            if (tableRows.length > 1) {
                foundChoices = true;
                const tableExplanation = document.createElement('div');
                tableExplanation.className = 'choice-item';
                tableExplanation.innerHTML = '<strong>Choices detected in table format:</strong>';
                choicesContainer.appendChild(tableExplanation);
                
                // Skip header row and separator row
                const startIdx = tableRows[1].includes('---') ? 2 : 1;
                
                for (let i = startIdx; i < tableRows.length; i++) {
                    const cells = tableRows[i].split('|').filter(cell => cell.trim() !== '');
                    if (cells.length > 0) {
                        const rowText = cells.map(cell => cell.trim()).join(' - ');
                        
                        // Check if this row might be the correct answer
                        const isLikelyCorrect = 
                            rowText.toLowerCase().includes('correct') || 
                            rowText.includes('✓') ||
                            rowText.includes('✅') ||
                            rowText.includes('*correct*') ||
                            rowText.includes('**correct**');
                        
                        const choiceOption = document.createElement('div');
                        choiceOption.className = `choice-item ${isLikelyCorrect ? 'correct' : ''}`;
                        
                        if (isLikelyCorrect) {
                            choiceOption.innerHTML = `• ${rowText} <span class="correct-indicator">✓ CORRECT</span>`;
                            correctAnswerFound = true;
                        } else {
                            choiceOption.innerHTML = `• ${rowText}`;
                        }
                        
                        choicesContainer.appendChild(choiceOption);
                    }
                }
            }
        }
        
        // 4. Look for true/false questions 
        if (!foundChoices && (questionTextContent.toLowerCase().includes('true or false') || 
                              questionTextContent.toLowerCase().includes('true/false'))) {
            foundChoices = true;
            const tfExplanation = document.createElement('div');
            tfExplanation.className = 'choice-item';
            tfExplanation.innerHTML = '<strong>True/False question detected:</strong>';
            choicesContainer.appendChild(tfExplanation);
            
            // Try to determine if TRUE or FALSE is the correct answer
            const isTrue = 
                questionTextContent.toLowerCase().includes('the answer is true') ||
                questionTextContent.toLowerCase().includes('correct answer is true') ||
                questionTextContent.toLowerCase().includes('answer: true');
                
            const isFalse = 
                questionTextContent.toLowerCase().includes('the answer is false') ||
                questionTextContent.toLowerCase().includes('correct answer is false') ||
                questionTextContent.toLowerCase().includes('answer: false');
            
            // Add True option
            const trueOption = document.createElement('div');
            trueOption.className = `choice-item ${isTrue ? 'correct' : ''}`;
            if (isTrue) {
                trueOption.innerHTML = `<strong>TRUE</strong> <span class="correct-indicator">✓ CORRECT</span>`;
                correctAnswerFound = true;
            } else {
                trueOption.innerHTML = `<strong>TRUE</strong>`;
            }
            choicesContainer.appendChild(trueOption);
            
            // Add False option
            const falseOption = document.createElement('div');
            falseOption.className = `choice-item ${isFalse ? 'correct' : ''}`;
            if (isFalse) {
                falseOption.innerHTML = `<strong>FALSE</strong> <span class="correct-indicator">✓ CORRECT</span>`;
                correctAnswerFound = true;
            } else {
                falseOption.innerHTML = `<strong>FALSE</strong>`;
            }
            choicesContainer.appendChild(falseOption);
        }
        
        // 5. Last resort - scan for bold or emphasized text that might indicate correct answers
        if (!correctAnswerFound) {
            // Look for markdown emphasis that might indicate the correct answer
            const emphasisPatterns = [
                { regex: /\*\*([^*]+)\*\*/g, format: 'bold' },    // Bold: **text**
                { regex: /\*([^*]+)\*/g, format: 'italic' },      // Italic: *text*
                { regex: /__([^_]+)__/g, format: 'underline' },   // Underline: __text__
                { regex: /~~([^~]+)~~/g, format: 'strikethrough' } // Strikethrough: ~~text~~
            ];
            
            let emphasisMatches = [];
            
            for (const pattern of emphasisPatterns) {
                const matches = [...questionTextContent.matchAll(pattern.regex)];
                if (matches.length > 0) {
                    matches.forEach(match => {
                        emphasisMatches.push({
                            text: match[1],
                            format: pattern.format
                        });
                    });
                }
            }
            
            if (emphasisMatches.length > 0) {
                const emphasisExplanation = document.createElement('div');
                emphasisExplanation.className = 'choice-item';
                emphasisExplanation.innerHTML = '<strong>Potential answers detected from emphasized text:</strong>';
                choicesContainer.appendChild(emphasisExplanation);
                
                emphasisMatches.forEach(match => {
                    const choiceOption = document.createElement('div');
                    choiceOption.className = 'choice-item correct'; // We assume emphasized text is likely correct
                    choiceOption.innerHTML = `• ${match.text} <span class="correct-indicator">${match.format.toUpperCase()} - Likely Answer</span>`;
                    choicesContainer.appendChild(choiceOption);
                });
                
                correctAnswerFound = true;
            }
        }
        
        // If we still haven't found answers, add a more explicit notice
        if (!foundChoices) {
            const noChoicesDiv = document.createElement('div');
            noChoicesDiv.className = 'choice-item';
            noChoicesDiv.innerHTML = `
                <strong>Note:</strong> This question doesn't have clearly formatted answer choices.
                <ul>
                    <li>Check the question text above for any potential answer choices</li>
                    <li>The question may be open-ended or require written responses</li>
                    <li>Consider reviewing the standard description for context</li>
                </ul>
            `;
            choicesContainer.appendChild(noChoicesDiv);
        } else if (!correctAnswerFound) {
            const noCorrectDiv = document.createElement('div');
            noCorrectDiv.className = 'choice-item warning';
            noCorrectDiv.innerHTML = `
                <strong>Warning:</strong> Couldn't automatically identify which answer is correct.
                <p>Review the question text carefully to determine the correct answer.</p>
            `;
            choicesContainer.appendChild(noCorrectDiv);
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