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
 * Initialize a mini visualization for the dashboard
 */
function initMiniVisualization() {
    console.log("Initializing mini visualization");
    
    const container = document.getElementById('mini-visualization');
    if (!container) {
        console.warn("Mini visualization container not found");
        return;
    }
    
    // Show loading indicator
    container.innerHTML = '<div class="spinner"></div>';
    
    // Fetch structure data
    fetchFromAPI('/api/structure')
        .then(data => {
            if (!data || !data.nodes || !data.links) {
                throw new Error("Invalid structure data");
            }
            
            console.log(`Structure data contains ${data.nodes.length} nodes and ${data.links.length} links`);
            
            // Limit data size for mini visualization
            let nodes = data.nodes;
            let links = data.links;
            
            if (nodes.length > 50) {
                console.log("Limiting visualization to 50 nodes");
                // Keep standards and some lessons
                const standardNodes = nodes.filter(n => n.type === 'standard');
                const lessonNodes = nodes.filter(n => n.type === 'lesson').slice(0, 50 - standardNodes.length);
                nodes = [...standardNodes, ...lessonNodes];
                
                // Keep only links between these nodes
                const nodeIds = new Set(nodes.map(n => n.id));
                links = links.filter(l => 
                    nodeIds.has(l.source) && nodeIds.has(l.target)
                );
            }
            
            // Create the mini visualization
            createMiniVisualization(container, nodes, links);
        })
        .catch(error => {
            console.error("Error loading mini visualization:", error);
            container.innerHTML = `<div class="error-message">Error loading visualization: ${error.message}</div>`;
        });
}

/**
 * Creates a mini force-directed graph visualization
 */
function createMiniVisualization(container, nodes, links) {
    // Clear the container
    container.innerHTML = '';
    
    // Set dimensions
    const width = container.clientWidth;
    const height = container.clientHeight || 300;
    
    // Create SVG
    const svg = d3.select(container)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])
        .attr("class", "mini-visualization-svg");
        
    // Define node colors by type
    const colors = {
        'standard': '#4285F4',
        'lesson': '#34A853',
        'question': '#FBBC05',
        'article': '#EA4335'
    };
    
    // Create the simulation with forces
    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id))
        .force("charge", d3.forceManyBody().strength(-30))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collide", d3.forceCollide(10));
    
    // Create links
    const link = svg.append("g")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .selectAll("line")
        .data(links)
        .join("line")
        .attr("stroke-width", d => Math.sqrt(d.value));
    
    // Create nodes
    const node = svg.append("g")
        .selectAll("circle")
        .data(nodes)
        .join("circle")
        .attr("r", 5)
        .attr("fill", d => colors[d.type] || "#999")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        .append("title")
        .text(d => d.label);
    
    // Update node positions on simulation tick
    simulation.on("tick", () => {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);
            
        node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);
    });
    
    // Add hover effects
    d3.selectAll("circle")
        .on("mouseover", function() {
            d3.select(this).attr("r", 8);
        })
        .on("mouseout", function() {
            d3.select(this).attr("r", 5);
        });
}

// Initialize the dashboard when the DOM is loaded
document.addEventListener('DOMContentLoaded', initDashboard); 