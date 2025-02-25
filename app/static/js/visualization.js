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
    
    // Process links to ensure source and target are objects
    const processedLinks = links.map(d => {
        // Create a new link object to avoid modifying the original data
        return {
            source: typeof d.source === 'object' ? d.source.id : d.source,
            target: typeof d.target === 'object' ? d.target.id : d.target,
            type: d.type || 'default'
        };
    });
    
    // Update links
    link = link.data(processedLinks, d => `${d.source}-${d.target}`);
    link.exit().remove();
    
    const linkEnter = link.enter().append('line')
        .attr('stroke-width', 2)
        .attr('stroke', d => d.type === 'standard-lesson' ? '#666' : '#999')
        .attr('stroke-opacity', 0.6);
    
    link = linkEnter.merge(link);
    
    // Update nodes
    node = node.data(nodes, d => d.id);
    node.exit().remove();
    
    const nodeEnter = node.enter().append('g')
        .attr('class', 'node')
        .call(d3.drag()
            .on('start', dragStarted)
            .on('drag', dragged)
            .on('end', dragEnded))
        .on('click', showNodeDetails);
    
    // Add circles for the nodes
    nodeEnter.append('circle')
        .attr('r', d => d.type === 'standard' ? 10 : 7)
        .attr('fill', d => nodeColors[d.type] || '#999')
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5);
    
    // Add labels for the nodes
    nodeEnter.append('text')
        .attr('dy', -15)
        .attr('text-anchor', 'middle')
        .text(d => getNodeLabel(d))
        .attr('font-size', '10px')
        .attr('fill', '#333');
    
    node = nodeEnter.merge(node);
    
    // Update simulation
    simulation.nodes(nodes)
        .on('tick', ticked);
    
    simulation.force('link')
        .links(processedLinks);
    
    // Restart simulation
    simulation.alpha(1).restart();
    
    // Function to handle simulation ticks
    function ticked() {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
        
        node
            .attr('transform', d => `translate(${d.x},${d.y})`);
    }
}

/**
 * Get label text for a node
 * @param {Object} node - The node data
 * @returns {string} - The label for the node
 */
function getNodeLabel(node) {
    if (!node || !node.data) return 'Unknown';
    
    if (node.type === 'standard') {
        return node.data.code || node.id;
    } else if (node.type === 'lesson') {
        return node.data.title || 'Lesson';
    } else {
        return node.data.title || node.type || 'Item';
    }
}

/**
 * Show detailed information about a node when clicked
 * @param {Object} event - The click event
 * @param {Object} d - The node data
 */
function showNodeDetails(event, d) {
    console.log('Showing details for node:', d);
    
    // Get or create the node details element
    let detailsEl = document.getElementById('node-details');
    if (!detailsEl) {
        console.log('Creating node-details element');
        
        // Create the details panel
        detailsEl = document.createElement('div');
        detailsEl.id = 'node-details';
        detailsEl.className = 'details-panel';
        detailsEl.style.position = 'absolute';
        detailsEl.style.right = '20px';
        detailsEl.style.top = '100px';
        detailsEl.style.width = '300px';
        detailsEl.style.backgroundColor = 'white';
        detailsEl.style.border = '1px solid #ddd';
        detailsEl.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
        detailsEl.style.padding = '15px';
        detailsEl.style.zIndex = '1000';
        
        // Add a close button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        closeBtn.style.position = 'absolute';
        closeBtn.style.right = '10px';
        closeBtn.style.top = '10px';
        closeBtn.style.background = 'none';
        closeBtn.style.border = 'none';
        closeBtn.style.cursor = 'pointer';
        closeBtn.onclick = function() {
            detailsEl.style.display = 'none';
        };
        
        detailsEl.appendChild(closeBtn);
        
        // Add to the page
        const container = document.getElementById('visualization');
        if (container) {
            container.parentNode.appendChild(detailsEl);
        } else {
            document.body.appendChild(detailsEl);
        }
    }
    
    let html = '<div class="node-details-content">';
    
    if (d.type === 'standard') {
        html += `<h3>${d.data.code || 'Standard'}</h3>`;
        html += `<p><strong>Name:</strong> ${d.data.name || 'No name available'}</p>`;
        html += `<p><strong>Description:</strong> ${d.data.description || 'No description available'}</p>`;
        html += `<p><strong>Grade:</strong> ${d.data.grade || 'Not specified'}</p>`;
    } else if (d.type === 'lesson') {
        html += `<h3>${d.data.title || 'Lesson'}</h3>`;
        html += `<p><strong>Standard:</strong> ${d.data.standard_code || 'Not linked to a standard'}</p>`;
        html += `<p><strong>Description:</strong> ${d.data.description || d.data.summary || 'No description available'}</p>`;
        
        if (d.data.objectives && d.data.objectives.length > 0) {
            html += '<p><strong>Objectives:</strong></p><ul>';
            d.data.objectives.forEach(obj => {
                html += `<li>${obj}</li>`;
            });
            html += '</ul>';
        }
    } else {
        html += `<h3>${d.data.title || 'Content Item'}</h3>`;
        html += `<p><strong>Type:</strong> ${d.data.type || 'Unknown'}</p>`;
        html += `<p><strong>Description:</strong> ${d.data.description || 'No description available'}</p>`;
    }
    
    html += '</div>';
    detailsEl.innerHTML = html;
    detailsEl.style.display = 'block';
}

/**
 * Handle node dragging
 * @param {Event} event - The drag event
 * @param {Object} d - The node data
 */
function dragStarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}

function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
}

function dragEnded(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
} 