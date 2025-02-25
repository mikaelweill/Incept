/**
 * Dashboard Initialization and Statistics
 * 
 * This file contains functions for initializing the dashboard view
 * and updating statistics based on the fetched data.
 */

/**
 * Initialize the dashboard with data and visualizations
 */
function initDashboard() {
    console.log("Initializing dashboard...");
    
    // Display loading indicators
    document.getElementById('loading-indicator').style.display = 'block';
    document.getElementById('dashboard-content').style.display = 'none';
    document.getElementById('error-message').style.display = 'none';
    
    // We need both standards and lessons data
    Promise.all([
        fetchFromAPI('/api/standards'),
        fetchFromAPI('/api/lessons')
    ])
    .then(([standards, lessons]) => {
        console.log("Dashboard data loaded:", { 
            standardsCount: standards ? standards.length : 0, 
            lessonsCount: lessons ? lessons.length : 0 
        });
        
        if (!standards || standards.length === 0) {
            throw new Error("No standards data available");
        }
        
        if (!lessons || lessons.length === 0) {
            throw new Error("No lessons data available");
        }
        
        // Count total questions from all lessons
        let totalQuestions = 0;
        
        // Group lessons by grade to get grade count
        const grades = new Set();
        
        // Calculate metrics
        lessons.forEach(lesson => {
            // Add grades
            if (lesson.grade) {
                grades.add(lesson.grade);
            }
            
            // Count questions if available
            if (lesson.sample_questions) {
                totalQuestions += lesson.sample_questions.length;
            } else if (lesson.question_count) {
                totalQuestions += lesson.question_count;
            }
        });
        
        // Update metrics
        updateStatistics({
            standards: standards.length,
            lessons: lessons.length,
            questions: totalQuestions,
            grades: grades.size
        });
        
        // Hide loading indicator, show dashboard
        document.getElementById('loading-indicator').style.display = 'none';
        document.getElementById('dashboard-content').style.display = 'block';
        
        // Initialize mini visualization if D3 is available
        if (typeof d3 !== 'undefined') {
            initMiniVisualization();
        } else {
            console.warn("D3.js not available, skipping mini visualization");
        }
    })
    .catch(error => {
        console.error("Error initializing dashboard:", error);
        document.getElementById('loading-indicator').style.display = 'none';
        
        const errorEl = document.getElementById('error-message');
        errorEl.textContent = `Error loading dashboard data: ${error.message}`;
        errorEl.style.display = 'block';
    });
}

/**
 * Updates the dashboard statistics
 */
function updateStatistics(stats) {
    console.log("Updating dashboard statistics:", stats);
    
    try {
        // Update the DOM with statistics
        document.getElementById('standards-count').textContent = stats.standards;
        document.getElementById('lessons-count').textContent = stats.lessons;
        document.getElementById('questions-count').textContent = stats.questions;
        document.getElementById('grades-count').textContent = stats.grades;
        
        // Update progress bars (optional)
        updateProgressBar('standards-progress', stats.standards, 100);
        updateProgressBar('lessons-progress', stats.lessons, 200);
        updateProgressBar('questions-progress', stats.questions, 1000);
    } catch (error) {
        console.error("Error updating statistics:", error);
    }
}

/**
 * Updates a progress bar element
 */
function updateProgressBar(id, value, max) {
    const progressBar = document.getElementById(id);
    if (!progressBar) return;
    
    const percentage = Math.min(100, Math.round((value / max) * 100));
    progressBar.style.width = `${percentage}%`;
    progressBar.setAttribute('aria-valuenow', value);
    progressBar.setAttribute('aria-valuemax', max);
}

/**
 * Initialize mini visualization for the dashboard
 */
function initMiniVisualization() {
    console.log("Initializing grade distribution charts...");
    
    const container = document.getElementById('mini-visualization');
    if (!container) {
        console.warn("Visualization container not found");
        return;
    }
    
    // Show loading indicator
    container.innerHTML = '<div class="spinner"></div><p>Loading data...</p>';
    
    // We need both standards and lessons data for the charts
    Promise.all([
        fetchFromAPI('/api/standards'),
        fetchFromAPI('/api/lessons')
    ])
    .then(([standards, lessons]) => {
        console.log("Distribution data loaded:", { 
            standardsCount: standards ? standards.length : 0, 
            lessonsCount: lessons ? lessons.length : 0 
        });
        
        if (!standards || standards.length === 0 || !lessons || lessons.length === 0) {
            throw new Error("Missing data for distribution charts");
        }
        
        // Group standards and lessons by grade
        const gradeData = processGradeData(standards, lessons);
        
        // Create the charts
        createGradeDistributionCharts(container, gradeData);
    })
    .catch(error => {
        console.error("Error loading grade distribution data:", error);
        container.innerHTML = `
            <div class="error-message">
                Error loading distribution data: ${error.message || 'Unknown error'}
                <br>
                <small>Please check browser console for details</small>
            </div>
        `;
    });
}

/**
 * Process standards and lessons data to group by grade
 */
function processGradeData(standards, lessons) {
    // Create a map to hold data for each grade
    const gradeMap = new Map();
    
    // Process lessons to count by grade
    lessons.forEach(lesson => {
        const grade = lesson.grade || 'Unspecified';
        
        if (!gradeMap.has(grade)) {
            gradeMap.set(grade, { 
                grade,
                lessons: 0,
                standards: 0,
                standardCodes: new Set(),
                sortOrder: getSortOrder(grade) // Add sort order for better sorting
            });
        }
        
        const gradeData = gradeMap.get(grade);
        gradeData.lessons++;
        
        // Add standard code to the set if present
        if (lesson.standard_code) {
            gradeData.standardCodes.add(lesson.standard_code);
        }
    });
    
    // Convert the set of standard codes to a count
    gradeMap.forEach(data => {
        data.standards = data.standardCodes.size;
        delete data.standardCodes; // Clean up the set as we don't need it anymore
    });
    
    // Convert map to array and sort by grade properly
    let gradesArray = Array.from(gradeMap.values());
    
    // Sort by our custom sort order
    gradesArray.sort((a, b) => a.sortOrder - b.sortOrder);
    
    return gradesArray;
}

/**
 * Get a numeric sort order for grades
 */
function getSortOrder(grade) {
    if (grade === 'K' || grade === 'Kindergarten') {
        return 0;
    }
    
    if (grade === 'Unspecified') {
        return 1000; // Put at the end
    }
    
    // Try to extract numeric value
    const num = parseInt(grade);
    if (!isNaN(num)) {
        return num;
    }
    
    // For any other format, default to string comparison position (less important)
    return 500;
}

/**
 * Create bar charts to show distribution by grade level
 */
function createGradeDistributionCharts(container, gradeData) {
    // Clear container and set up layout
    container.innerHTML = '';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    
    // Create heading
    const heading = document.createElement('h4');
    heading.textContent = 'Standards & Lessons by Grade Level';
    heading.style.textAlign = 'center';
    heading.style.marginBottom = '10px';
    container.appendChild(heading);
    
    // Create chart container with enough height to accommodate everything
    const chartContainer = document.createElement('div');
    chartContainer.style.flex = '1';
    chartContainer.style.display = 'flex';
    chartContainer.style.flexDirection = 'column';
    chartContainer.style.minHeight = '350px'; // Ensure minimum height
    chartContainer.style.overflow = 'visible'; // Allow overflow to prevent cutting
    container.appendChild(chartContainer);
    
    try {
        // Prepare data for D3
        if (!gradeData || gradeData.length === 0) {
            throw new Error("No grade data available");
        }
        
        // Create cleaner grade display names
        gradeData.forEach(d => {
            // Format grade names to be more readable (e.g., "8th Grade" instead of "8")
            if (!isNaN(parseInt(d.grade))) {
                const num = parseInt(d.grade);
                const suffix = getSuffix(num);
                d.displayName = `${num}${suffix} Grade`;
            } else if (d.grade === 'K') {
                d.displayName = 'Kindergarten';
            } else {
                d.displayName = d.grade;
            }
        });
        
        // Set up dimensions with even more space for labels
        const margin = { top: 30, right: 40, bottom: 100, left: 60 };
        const width = container.clientWidth - margin.left - margin.right;
        const height = 280 - margin.top - margin.bottom; // Further increased height
        
        // Create SVG for the chart - make it a bit taller
        const svg = d3.select(chartContainer)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        // Create x scale (for grade names)
        const x = d3.scaleBand()
            .domain(gradeData.map(d => d.displayName))
            .range([0, width])
            .padding(0.3);
        
        // Create y scale (for counts)
        const y = d3.scaleLinear()
            .domain([0, d3.max(gradeData, d => Math.max(d.standards, d.lessons)) * 1.1]) // Add 10% headroom
            .nice()
            .range([height, 0]);
        
        // Add background grid for better readability
        svg.append('g')
            .attr('class', 'grid')
            .selectAll('line')
            .data(y.ticks(5))
            .enter()
            .append('line')
            .attr('x1', 0)
            .attr('x2', width)
            .attr('y1', d => y(d))
            .attr('y2', d => y(d))
            .attr('stroke', '#e0e0e0')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '3,3');
        
        // Create x-axis with better positioned labels
        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .selectAll('text')
            .attr('transform', 'rotate(-25)')
            .attr('dy', '0.9em')
            .attr('dx', '-0.5em')
            .style('text-anchor', 'end')
            .style('font-size', '12px');
        
        // Create y-axis with grid lines
        svg.append('g')
            .call(d3.axisLeft(y).ticks(5).tickFormat(d => d))
            .call(g => g.select('.domain').attr('stroke-width', 2));
        
        // Y-axis label
        svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', -margin.left + 20)
            .attr('x', -height / 2)
            .attr('text-anchor', 'middle')
            .style('font-size', '13px')
            .style('font-weight', 'bold')
            .text('Count');
        
        // Create bars for standards
        svg.selectAll('.bar-standards')
            .data(gradeData)
            .enter()
            .append('rect')
            .attr('class', 'bar-standards')
            .attr('x', d => x(d.displayName))
            .attr('width', x.bandwidth() / 2)
            .attr('y', d => y(d.standards))
            .attr('height', d => height - y(d.standards))
            .attr('fill', '#4285F4') // Blue for standards
            .attr('stroke', '#3a76d8')
            .attr('stroke-width', 1);
        
        // Create bars for lessons
        svg.selectAll('.bar-lessons')
            .data(gradeData)
            .enter()
            .append('rect')
            .attr('class', 'bar-lessons')
            .attr('x', d => x(d.displayName) + x.bandwidth() / 2)
            .attr('width', x.bandwidth() / 2)
            .attr('y', d => y(d.lessons))
            .attr('height', d => height - y(d.lessons))
            .attr('fill', '#34A853') // Green for lessons
            .attr('stroke', '#2d9249')
            .attr('stroke-width', 1);
        
        // Add values on top of bars for better readability
        svg.selectAll('.text-standards')
            .data(gradeData)
            .enter()
            .append('text')
            .attr('class', 'text-standards')
            .attr('x', d => x(d.displayName) + x.bandwidth() / 4)
            .attr('y', d => y(d.standards) - 5)
            .attr('text-anchor', 'middle')
            .style('font-size', '11px')
            .style('font-weight', 'bold')
            .style('display', d => d.standards > 0 ? 'block' : 'none')
            .text(d => d.standards);
        
        svg.selectAll('.text-lessons')
            .data(gradeData)
            .enter()
            .append('text')
            .attr('class', 'text-lessons')
            .attr('x', d => x(d.displayName) + (x.bandwidth() * 3/4))
            .attr('y', d => y(d.lessons) - 5)
            .attr('text-anchor', 'middle')
            .style('font-size', '11px')
            .style('font-weight', 'bold')
            .style('display', d => d.lessons > 0 ? 'block' : 'none')
            .text(d => d.lessons);
        
        // Better positioned legend at the top
        const legend = svg.append('g')
            .attr('transform', `translate(${width - 160}, -20)`);
        
        // Add legend background for better visibility
        legend.append('rect')
            .attr('x', -5)
            .attr('y', -5)
            .attr('width', 165)
            .attr('height', 30)
            .attr('fill', 'white')
            .attr('stroke', '#e0e0e0')
            .attr('stroke-width', 1)
            .attr('rx', 4);
        
        // Legend - Standards
        legend.append('rect')
            .attr('x', 5)
            .attr('y', 5)
            .attr('width', 14)
            .attr('height', 14)
            .attr('fill', '#4285F4');
        
        legend.append('text')
            .attr('x', 25)
            .attr('y', 12)
            .attr('dy', '.35em')
            .style('font-size', '12px')
            .text('Standards');
        
        // Legend - Lessons
        legend.append('rect')
            .attr('x', 95)
            .attr('y', 5)
            .attr('width', 14)
            .attr('height', 14)
            .attr('fill', '#34A853');
        
        legend.append('text')
            .attr('x', 115)
            .attr('y', 12)
            .attr('dy', '.35em')
            .style('font-size', '12px')
            .text('Lessons');
        
    } catch (error) {
        console.error("Error creating grade distribution chart:", error);
        container.innerHTML = `
            <div class="error-message">
                Error creating chart: ${error.message}
                <br>
                <small>Please check browser console for details</small>
            </div>
        `;
    }
}

/**
 * Get the appropriate ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 */
function getSuffix(num) {
    if (num >= 11 && num <= 13) {
        return 'th';
    }
    
    switch (num % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
    }
}

// Initialize the dashboard when the DOM is loaded
document.addEventListener('DOMContentLoaded', initDashboard); 