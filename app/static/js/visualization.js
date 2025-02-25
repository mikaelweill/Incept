/**
 * Curriculum Visualization - Force Graph
 * 
 * This file contains functions to create and interact with the
 * force-directed graph visualization of curriculum relationships.
 */

// Global variables for the visualization
let nodes = [];
let links = [];
let simulation;
let svg;
let link;
let node;

// Colors for different node types
const nodeColors = {
    'standard': '#4285F4', // Blue
    'lesson': '#34A853',   // Green
    'question': '#FBBC05', // Yellow
    'article': '#EA4335'   // Red
};

/**
 * Initialize visualization when the DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Visualization script loaded');
    
    // Set up event listeners for controls
    setupFilterControls();
    
    // Initialize visualization
    initVisualization();
});

/**
 * Set up filter controls
 */
function setupFilterControls() {
    const standardFilter = document.getElementById('filter-standard');
    const gradeFilter = document.getElementById('filter-grade');
    const resetButton = document.getElementById('reset-filters');
    
    if (standardFilter) {
        standardFilter.addEventListener('change', applyFilters);
    }
    
    if (gradeFilter) {
        gradeFilter.addEventListener('change', applyFilters);
    }
    
    if (resetButton) {
        resetButton.addEventListener('click', resetFilters);
    }
}

/**
 * Initialize the visualization
 */
function initVisualization() {
    console.log('Initializing visualization');
    
    // Show loading indicator
    document.getElementById('loading-indicator').style.display = 'block';
    document.getElementById('visualization').style.display = 'none';
    document.getElementById('error-message').style.display = 'none';
    
    // Fetch data
    fetchFromAPI('/api/structure')
        .then(data => {
            console.log('Received structure data:', { 
                nodeCount: data.nodes ? data.nodes.length : 0, 
                linkCount: data.links ? data.links.length : 0 
            });
            
            if (!data || !data.nodes || !data.links) {
                throw new Error('Invalid structure data received');
            }
            
            // Store data
            nodes = data.nodes;
            links = data.links;
            
            // Populate filters
            populateFilters(nodes);
            
            // Create visualization
            createVisualization(nodes, links);
            
            // Hide loading indicator, show visualization
            document.getElementById('loading-indicator').style.display = 'none';
            document.getElementById('visualization').style.display = 'block';
        })
        .catch(error => {
            console.error('Error loading visualization data:', error);
            document.getElementById('loading-indicator').style.display = 'none';
            
            const errorElement = document.getElementById('error-message');
            errorElement.textContent = `Error loading visualization: ${error.message || 'Unknown error'}`;
            errorElement.style.display = 'block';
        });
}

/**
 * Populate filter dropdowns
 * @param {Array} nodes - The array of node data
 */
function populateFilters(nodes) {
    console.log('Populating filters');
    
    const standardFilter = document.getElementById('filter-standard');
    const gradeFilter = document.getElementById('filter-grade');
    
    if (!standardFilter || !gradeFilter) {
        console.warn('Filter elements not found');
        return;
    }
    
    // Get unique standards
    const standards = new Set();
    const grades = new Set();
    
    // Extract standards and grades from nodes
    nodes.forEach(node => {
        if (node.type === 'standard' && node.data && node.data.code) {
            standards.add(node.data.code);
        }
        
        if (node.data && node.data.grade) {
            grades.add(node.data.grade);
        }
    });
    
    // Populate standard filter
    standardFilter.innerHTML = '<option value="">All Standards</option>';
    Array.from(standards).sort().forEach(standard => {
        const option = document.createElement('option');
        option.value = standard;
        option.textContent = standard;
        standardFilter.appendChild(option);
    });
    
    // Populate grade filter
    gradeFilter.innerHTML = '<option value="">All Grades</option>';
    Array.from(grades).sort().forEach(grade => {
        const option = document.createElement('option');
        option.value = grade;
        option.textContent = grade;
        gradeFilter.appendChild(option);
    });
}

/**
 * Apply filters to the visualization
 */
function applyFilters() {
    console.log('Applying filters');
    
    const standardFilter = document.getElementById('filter-standard').value;
    const gradeFilter = document.getElementById('filter-grade').value;
    
    console.log(`Filters: standard=${standardFilter}, grade=${gradeFilter}`);
    
    // Create a filtered set of nodes
    let filteredNodes = nodes;
    
    // Apply standard filter
    if (standardFilter) {
        filteredNodes = filteredNodes.filter(node => {
            // Include the standard itself
            if (node.type === 'standard' && node.data && node.data.code === standardFilter) {
                return true;
            }
            
            // Include nodes connected to this standard
            if (node.data && node.data.standard_code === standardFilter) {
                return true;
            }
            
            return false;
        });
    }
    
    // Apply grade filter
    if (gradeFilter) {
        filteredNodes = filteredNodes.filter(node => 
            node.data && node.data.grade === gradeFilter
        );
    }
    
    // Get IDs of filtered nodes
    const nodeIds = new Set(filteredNodes.map(node => node.id));
    
    // Filter links to only include those between filtered nodes
    const filteredLinks = links.filter(link => 
        nodeIds.has(link.source.id || link.source) && 
        nodeIds.has(link.target.id || link.target)
    );
    
    // Update visualization with filtered data
    updateVisualization(filteredNodes, filteredLinks);
}

/**
 * Reset filters
 */
function resetFilters() {
    console.log('Resetting filters');
    
    document.getElementById('filter-standard').value = '';
    document.getElementById('filter-grade').value = '';
    
    // Reset to full dataset
    updateVisualization(nodes, links);
}

/**
 * Create the force directed graph visualization
 * @param {Array} nodes - The array of node data
 * @param {Array} links - The array of link data
 */
function createVisualization(nodes, links) {
    console.log('Creating visualization');
    
    const container = document.getElementById('visualization');
    if (!container) {
        console.error('Visualization container not found');
        return;
    }
    
    // Set dimensions based on container
    const width = container.clientWidth;
    const height = container.clientHeight || 600;
    
    // Create SVG element
    svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', [0, 0, width, height])
        .classed('visualization-svg', true);
    
    // Create the simulation first
    simulation = d3.forceSimulation()
        .force('link', d3.forceLink().id(d => d.id).distance(100))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(30));
    
    // Create container for links
    link = svg.append('g')
        .attr('class', 'links')
        .selectAll('line');
    
    // Create container for nodes
    node = svg.append('g')
        .attr('class', 'nodes')
        .selectAll('g');
    
    // Update the visualization with the data
    updateVisualization(nodes, links);
    
    // Add zoom behavior
    svg.call(d3.zoom()
        .extent([[0, 0], [width, height]])
        .scaleExtent([0.1, 8])
        .on('zoom', (event) => {
            svg.selectAll('g').attr('transform', event.transform);
        })
    );
}

/**
 * Update the visualization with new data
 * @param {Array} nodes - The array of node data
 * @param {Array} links - The array of link data
 */
function updateVisualization(nodes, links) {
    console.log(`Updating visualization with ${nodes.length} nodes and ${links.length} links`);
    
    if (!svg || !simulation) {
        console.error('Visualization not initialized');
        return;
    }
    
    // Update link elements
    link = link.data(links, d => `${d.source.id || d.source}-${d.target.id || d.target}`);
    link.exit().remove();
    
    const linkEnter = link.enter()
        .append('line')
        .attr('stroke-width', d => Math.sqrt(d.value) || 1)
        .attr('stroke', '#999');
    
    link = linkEnter.merge(link);
    
    // Update node elements
    node = node.data(nodes, d => d.id);
    node.exit().remove();
    
    const nodeEnter = node.enter()
        .append('g')
        .attr('class', 'node')
        .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended)
        )
        .on('click', showNodeDetails);
    
    // Add circles to node groups
    nodeEnter.append('circle')
        .attr('r', 10)
        .attr('fill', d => nodeColors[d.type] || '#999')
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5);
    
    // Add text labels
    nodeEnter.append('text')
        .attr('dy', 4)
        .attr('text-anchor', 'middle')
        .text(d => d.label.substring(0, 15) + (d.label.length > 15 ? '...' : ''))
        .style('font-size', '10px')
        .style('pointer-events', 'none')
        .attr('fill', '#fff');
    
    // Append title for tooltip
    nodeEnter.append('title')
        .text(d => `${d.type}: ${d.label}`);
    
    node = nodeEnter.merge(node);
    
    // Update simulation
    simulation.nodes(nodes).on('tick', ticked);
    simulation.force('link').links(links);
    
    // Restart simulation
    simulation.alpha(1).restart();
    
    // Update legend
    updateLegend();
}

/**
 * Handle node dragging
 * @param {Event} event - The drag event
 * @param {Object} d - The node data
 */
function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}

function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
}

function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
}

/**
 * Tick function for updating element positions
 */
function ticked() {
    link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
    
    node
        .attr('transform', d => `translate(${d.x}, ${d.y})`);
}

/**
 * Update the legend
 */
function updateLegend() {
    const legend = d3.select('#visualization-legend');
    if (legend.empty()) return;
    
    legend.html('');
    
    const legendItems = [
        { type: 'standard', label: 'Standards' },
        { type: 'lesson', label: 'Lessons' },
        { type: 'question', label: 'Questions' },
        { type: 'article', label: 'Articles' }
    ];
    
    legendItems.forEach(item => {
        const div = legend.append('div')
            .attr('class', 'legend-item');
        
        div.append('span')
            .attr('class', 'legend-color')
            .style('background-color', nodeColors[item.type] || '#999');
        
        div.append('span')
            .text(item.label);
    });
}

/**
 * Show node details in the detail panel
 * @param {Event} event - The click event
 * @param {Object} d - The node data
 */
function showNodeDetails(event, d) {
    console.log('Showing details for node:', d);
    
    const detailPanel = document.getElementById('detail-panel');
    const detailTitle = document.getElementById('detail-title');
    const detailContent = document.getElementById('detail-content');
    
    if (!detailPanel || !detailTitle || !detailContent) {
        console.warn('Detail panel elements not found');
        return;
    }
    
    // Update panel title
    detailTitle.textContent = d.label;
    
    // Clear previous content
    detailContent.innerHTML = '';
    
    // Create content based on node type
    if (d.type === 'standard') {
        detailContent.innerHTML = `
            <div class="detail-section">
                <h4>Standard Code</h4>
                <p>${d.data.code || 'N/A'}</p>
            </div>
            <div class="detail-section">
                <h4>Description</h4>
                <p>${d.data.description || 'No description available'}</p>
            </div>
            <div class="detail-section">
                <h4>Grade</h4>
                <p>${d.data.grade || 'Not specified'}</p>
            </div>
        `;
        
        // Add link to lessons for this standard
        const lessonsLink = document.createElement('button');
        lessonsLink.textContent = 'View Related Lessons';
        lessonsLink.className = 'button';
        lessonsLink.addEventListener('click', () => {
            window.location.href = `/lessons?standard_code=${d.data.code}`;
        });
        
        detailContent.appendChild(lessonsLink);
    } else if (d.type === 'lesson') {
        detailContent.innerHTML = `
            <div class="detail-section">
                <h4>Standard</h4>
                <p>${d.data.standard_code || 'Not linked to a standard'}</p>
            </div>
            <div class="detail-section">
                <h4>Grade</h4>
                <p>${d.data.grade || 'Not specified'}</p>
            </div>
            <div class="detail-section">
                <h4>Description</h4>
                <p>${d.data.description || 'No description available'}</p>
            </div>
        `;
        
        // Add questions if available
        if (d.data.sample_questions && d.data.sample_questions.length > 0) {
            const questionsSection = document.createElement('div');
            questionsSection.className = 'detail-section';
            questionsSection.innerHTML = `<h4>Sample Questions (${d.data.sample_questions.length})</h4>`;
            
            // Add a limited number of questions to avoid overwhelming the panel
            const maxQuestions = 3;
            for (let i = 0; i < Math.min(maxQuestions, d.data.sample_questions.length); i++) {
                const questionDiv = document.createElement('div');
                questionDiv.className = 'sample-question';
                questionDiv.innerHTML = `<p>${d.data.sample_questions[i].substring(0, 150)}${d.data.sample_questions[i].length > 150 ? '...' : ''}</p>`;
                questionsSection.appendChild(questionDiv);
            }
            
            // Add a message if there are more questions
            if (d.data.sample_questions.length > maxQuestions) {
                const moreDiv = document.createElement('div');
                moreDiv.className = 'more-indicator';
                moreDiv.textContent = `+ ${d.data.sample_questions.length - maxQuestions} more questions`;
                questionsSection.appendChild(moreDiv);
            }
            
            detailContent.appendChild(questionsSection);
        }
    } else if (d.type === 'question' || d.type === 'article') {
        detailContent.innerHTML = `
            <div class="detail-section">
                <h4>Type</h4>
                <p>${d.type.charAt(0).toUpperCase() + d.type.slice(1)}</p>
            </div>
            <div class="detail-section">
                <h4>Related Standard</h4>
                <p>${d.data.standard_code || 'Not specified'}</p>
            </div>
            <div class="detail-section">
                <h4>Content</h4>
                <div class="content-preview">${d.data.content && d.data.content.body ? d.data.content.body.substring(0, 200) + '...' : 'No preview available'}</div>
            </div>
        `;
    }
    
    // Show the detail panel
    detailPanel.style.display = 'block';
    
    // Add close button functionality
    document.getElementById('close-details').addEventListener('click', () => {
        detailPanel.style.display = 'none';
    });
} 