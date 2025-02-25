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
    console.log("Initializing mini visualization...");
    
    const container = document.getElementById('mini-visualization');
    if (!container) {
        console.warn("Mini visualization container not found");
        return;
    }
    
    // Show loading indicator for mini visualization
    container.innerHTML = '<div class="spinner"></div><p>Loading...</p>';
    
    // Fetch a limited set of data for the mini visualization
    fetchFromAPI('/api/structure')
        .then(data => {
            console.log("Mini visualization data loaded:", { 
                nodeCount: data.nodes ? data.nodes.length : 0, 
                linkCount: data.links ? data.links.length : 0 
            });
            
            if (!data || !data.nodes || !data.links) {
                throw new Error("Invalid structure data received");
            }
            
            // Limit data size for mini visualization (max 50 nodes)
            let nodes = data.nodes;
            let links = data.links;
            
            if (nodes.length > 50) {
                // Filter to keep only standard and lesson nodes, not content items
                nodes = nodes.filter(node => 
                    node.type === 'standard' || node.type === 'lesson'
                ).slice(0, 50);
                
                // Keep only links between the remaining nodes
                const nodeIds = new Set(nodes.map(node => node.id));
                links = links.filter(link => 
                    nodeIds.has(link.source.id || link.source) && 
                    nodeIds.has(link.target.id || link.target)
                );
            }
            
            createMiniVisualization(container, nodes, links);
        })
        .catch(error => {
            console.error("Error loading mini visualization:", error);
            container.innerHTML = `<div class="error-message">Error loading mini visualization: ${error.message || 'Unknown error'}</div>`;
        });
}

/**
 * Create a small force-directed graph visualization
 * @param {HTMLElement} container - The container element
 * @param {Array} nodes - Node data
 * @param {Array} links - Link data
 */
function createMiniVisualization(container, nodes, links) {
    // Clear the container
    container.innerHTML = '';
    
    // Set dimensions based on container
    const width = container.clientWidth;
    const height = container.clientHeight || 250;
    
    // Create SVG element
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', [0, 0, width, height]);
    
    // Define colors for node types
    const nodeColors = {
        'standard': '#4285F4', // Blue
        'lesson': '#34A853',   // Green
        'question': '#FBBC05', // Yellow
        'article': '#EA4335'   // Red
    };
    
    // Create a simulation with forces
    const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(30))
        .force('charge', d3.forceManyBody().strength(-100))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(10));
    
    // Create the links
    const link = svg.append('g')
        .selectAll('line')
        .data(links)
        .enter().append('line')
        .attr('stroke', '#999')
        .attr('stroke-opacity', 0.6)
        .attr('stroke-width', 1);
    
    // Create the nodes
    const node = svg.append('g')
        .selectAll('circle')
        .data(nodes)
        .enter().append('circle')
        .attr('r', d => d.type === 'standard' ? 6 : 4)
        .attr('fill', d => nodeColors[d.type] || '#999')
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .append('title')
        .text(d => {
            if (d.type === 'standard') {
                return `Standard: ${d.data.code}`;
            } else if (d.type === 'lesson') {
                return `Lesson: ${d.data.title || 'Unnamed'}`;
            } else {
                return d.data.title || d.type;
            }
        });
    
    // Add interactivity - hover effect
    node.on('mouseover', function(event, d) {
        d3.select(this).attr('r', d => d.type === 'standard' ? 8 : 6);
    })
    .on('mouseout', function(event, d) {
        d3.select(this).attr('r', d => d.type === 'standard' ? 6 : 4);
    });
    
    // Update positions on simulation tick
    simulation.on('tick', () => {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
        
        node
            .attr('cx', d => d.x)
            .attr('cy', d => d.y);
    });
}

// Initialize the dashboard when the DOM is loaded
document.addEventListener('DOMContentLoaded', initDashboard); 