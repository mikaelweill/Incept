/**
 * Dashboard Initialization and Statistics
 * 
 * This file contains functions for initializing the dashboard view
 * and updating statistics based on the fetched data.
 */

/**
 * Initialize the dashboard with data and visualizations
 */
async function initDashboard() {
    try {
        document.getElementById('loading-indicator').style.display = 'block';
        
        // Fetch necessary data
        const standards = await fetchFromAPI('/api/standards');
        const lessons = await fetchFromAPI('/api/lessons');
        const structure = await fetchFromAPI('/api/structure');
        
        // Log data to console for debugging
        console.log('Standards:', standards);
        console.log('Lessons:', lessons);
        console.log('Structure:', structure);
        
        // Update statistics
        updateStatistics(standards, lessons);
        
        // Create visualizations
        createStandardsChart(standards, lessons);
        createLessonsChart(standards, lessons);
        
        // Create mini visualization if we have structure data
        if (structure && structure.nodes && structure.links) {
            createForceGraph('mini-visualization', structure);
        }
        
        // Hide loading indicator
        document.getElementById('loading-indicator').style.display = 'none';
        
        // Show dashboard content
        document.getElementById('dashboard-content').style.display = 'block';
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        document.getElementById('loading-indicator').style.display = 'none';
        document.getElementById('error-message').textContent = `Error loading dashboard data: ${error.message}`;
        document.getElementById('error-message').style.display = 'block';
    }
}

/**
 * Update dashboard statistics based on data
 * @param {Array} standards - The standards data
 * @param {Array} lessons - The lessons data
 */
function updateStatistics(standards, lessons) {
    // Update counts
    document.getElementById('standards-count').textContent = standards.length || 0;
    document.getElementById('lessons-count').textContent = lessons.length || 0;
    
    // Calculate number of questions (count sample_questions arrays)
    let questionCount = 0;
    lessons.forEach(lesson => {
        if (lesson.sample_questions && Array.isArray(lesson.sample_questions)) {
            questionCount += lesson.sample_questions.length;
        }
    });
    
    // If no questions found, use estimate
    if (questionCount === 0) {
        questionCount = lessons.length * 4; // Estimate 4 questions per lesson
    }
    
    document.getElementById('questions-count').textContent = questionCount;
}

/**
 * Create a bar chart showing standards distribution
 * @param {Array} standards - The standards data
 * @param {Array} lessons - The lessons data
 */
function createStandardsChart(standards, lessons) {
    // Group lessons by standard
    const lessonsByStandard = {};
    
    // Initialize counters for each standard
    standards.forEach(standard => {
        lessonsByStandard[standard.code] = 0;
    });
    
    // Count lessons for each standard
    lessons.forEach(lesson => {
        if (lesson.standard_code && lessonsByStandard[lesson.standard_code] !== undefined) {
            lessonsByStandard[lesson.standard_code]++;
        }
    });
    
    // Prepare data for chart
    const chartData = Object.keys(lessonsByStandard).map(code => {
        const standard = standards.find(s => s.code === code);
        return {
            code: code,
            count: lessonsByStandard[code],
            name: standard ? standard.name : code
        };
    });
    
    // Filter for standards with at least one lesson
    const filteredData = chartData.filter(item => item.count > 0);
    
    // Sort by standard code
    filteredData.sort((a, b) => a.code.localeCompare(b.code));
    
    // Take top 15 for readability if we have a lot
    const data = filteredData.length > 15 ? filteredData.slice(0, 15) : filteredData;
    
    // Create the chart
    createBarChart(
        'standards-chart',
        data,
        'code',
        'count',
        'Standard Code',
        'Number of Lessons'
    );
}

/**
 * Create a bar chart showing lessons distribution
 * @param {Array} standards - The standards data
 * @param {Array} lessons - The lessons data
 */
function createLessonsChart(standards, lessons) {
    // Group lessons by grade
    const lessonsByGrade = {};
    
    // Count lessons for each grade
    lessons.forEach(lesson => {
        const grade = lesson.grade || 'Unknown';
        if (!lessonsByGrade[grade]) {
            lessonsByGrade[grade] = 0;
        }
        lessonsByGrade[grade]++;
    });
    
    // Convert to array for the chart
    const chartData = Object.keys(lessonsByGrade).map(grade => {
        return {
            code: grade,
            count: lessonsByGrade[grade],
            name: grade
        };
    });
    
    // Sort by grade level (if possible)
    chartData.sort((a, b) => {
        // Try to sort numerically if grades contain numbers
        const gradeA = a.code.match(/\d+/);
        const gradeB = b.code.match(/\d+/);
        if (gradeA && gradeB) {
            return parseInt(gradeA[0]) - parseInt(gradeB[0]);
        }
        // Otherwise sort alphabetically
        return a.code.localeCompare(b.code);
    });
    
    // Create the chart
    createBarChart(
        'lessons-chart',
        chartData,
        'code',
        'count',
        'Grade Level',
        'Number of Lessons'
    );
}

// Initialize the dashboard when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
}); 