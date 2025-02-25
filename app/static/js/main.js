/**
 * Curriculum Visualization - Main Utilities
 * 
 * This file contains shared utility functions used across the visualization UI.
 */

// API cache to avoid redundant fetches
const apiCache = new Map();

/**
 * Fetch data from an API endpoint with caching
 * @param {string} endpoint - The API endpoint path
 * @returns {Promise<Object>} The fetched data
 */
async function fetchFromAPI(endpoint) {
    // Check cache first
    if (apiCache.has(endpoint)) {
        return apiCache.get(endpoint);
    }
    
    try {
        const response = await fetch(endpoint);
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Cache the response
        apiCache.set(endpoint, data);
        
        return data;
    } catch (error) {
        console.error(`Error fetching from ${endpoint}:`, error);
        throw error;
    }
}

/**
 * Clear the API cache to force fresh data retrieval
 */
function clearAPICache() {
    apiCache.clear();
    console.log('API cache cleared');
}

/**
 * Creates a force-directed graph visualization
 * @param {string} elementId - ID of the container element
 * @param {Object} data - Graph data with nodes and links
 */
function createForceGraph(elementId, data) {
    const container = document.getElementById(elementId);
    if (!container) return;
    
    // Get container dimensions
    const width = container.clientWidth;
    const height = container.clientHeight || 500;
    
    // Clear any existing content
    container.innerHTML = '';
    
    // Create SVG
    const svg = d3.create('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', [0, 0, width, height])
        .attr('style', 'max-width: 100%; height: auto;');
    
    // Add a group for the graph elements
    const g = svg.append('g');
    
    // Create a zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
            g.attr('transform', event.transform);
        });
    
    svg.call(zoom);
    
    // Define forces
    const simulation = d3.forceSimulation(data.nodes)
        .force('link', d3.forceLink(data.links).id(d => d.id).distance(100))
        .force('charge', d3.forceManyBody().strength(-200))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('x', d3.forceX(width / 2).strength(0.1))
        .force('y', d3.forceY(height / 2).strength(0.1));
    
    // Create links
    const link = g.append('g')
        .attr('stroke', '#999')
        .attr('stroke-opacity', 0.6)
        .selectAll('line')
        .data(data.links)
        .join('line')
        .attr('stroke-width', d => Math.sqrt(d.value));
    
    // Create nodes
    const node = g.append('g')
        .selectAll('.node')
        .data(data.nodes)
        .join('g')
        .attr('class', 'node')
        .call(drag(simulation));
    
    // Add circles to nodes
    node.append('circle')
        .attr('r', 8)
        .attr('class', d => `node-${d.type}`)
        .attr('fill', getNodeColor)
        .on('click', (event, d) => showDetailPanel(d));
    
    // Add labels to nodes
    node.append('text')
        .attr('dy', -12)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .text(d => d.label || d.id);
    
    // Handle simulation ticks
    simulation.on('tick', () => {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
        
        node.attr('transform', d => `translate(${d.x},${d.y})`);
    });
    
    // Append the SVG to the container
    container.appendChild(svg.node());
    
    // Make zoom object available globally
    window.zoom = zoom;
    
    // Function to get node color based on type
    function getNodeColor(d) {
        switch (d.type) {
            case 'standard': return '#4e79a7';
            case 'lesson': return '#f28e2c';
            case 'question': return '#e15759';
            case 'article': return '#76b7b2';
            default: return '#aaa';
        }
    }
    
    // Drag function for nodes
    function drag(simulation) {
        function dragstarted(event) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }
        
        function dragged(event) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }
        
        function dragended(event) {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }
        
        return d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended);
    }
}

/**
 * Show detail panel with information about a selected node
 * @param {Object} data - The node data
 */
function showDetailPanel(data) {
    const detailPanel = document.getElementById('detail-panel');
    const detailContent = document.getElementById('detail-content');
    
    if (!detailPanel || !detailContent) return;
    
    // Display the panel
    detailPanel.style.display = 'block';
    
    // Clear existing content
    detailContent.innerHTML = '';
    
    // Build content based on node type
    const type = data.type;
    
    // Header
    const header = document.createElement('h3');
    header.textContent = `${type.charAt(0).toUpperCase() + type.slice(1)}: ${data.label || data.id}`;
    detailContent.appendChild(header);
    
    // Details section
    const details = document.createElement('div');
    details.className = 'detail-item';
    
    switch (type) {
        case 'standard':
            if (data.data && data.data.description) {
                const desc = document.createElement('p');
                desc.textContent = data.data.description;
                details.appendChild(desc);
            }
            
            // Add button to fetch related lessons
            const lessonsBtn = document.createElement('button');
            lessonsBtn.textContent = 'Show Related Lessons';
            lessonsBtn.className = 'detail-button';
            lessonsBtn.addEventListener('click', () => {
                fetchRelatedLessons(data.id.replace('standard-', ''));
            });
            details.appendChild(lessonsBtn);
            break;
            
        case 'lesson':
            if (data.data) {
                if (data.data.description) {
                    const desc = document.createElement('p');
                    desc.textContent = data.data.description;
                    details.appendChild(desc);
                }
                
                if (data.data.standard_code) {
                    const standard = document.createElement('div');
                    standard.innerHTML = `<strong>Standard:</strong> ${data.data.standard_code}`;
                    details.appendChild(standard);
                }
            }
            
            // Add button to fetch sample questions
            const questionsBtn = document.createElement('button');
            questionsBtn.textContent = 'Show Sample Questions';
            questionsBtn.className = 'detail-button';
            questionsBtn.addEventListener('click', () => {
                const lessonId = data.id.replace('lesson-', '');
                fetchSampleQuestions(lessonId);
            });
            details.appendChild(questionsBtn);
            break;
            
        case 'question':
        case 'article':
            if (data.data) {
                const contentId = document.createElement('div');
                contentId.innerHTML = `<strong>ID:</strong> ${data.data.id}`;
                details.appendChild(contentId);
                
                if (data.data.type) {
                    const contentType = document.createElement('div');
                    contentType.innerHTML = `<strong>Type:</strong> ${data.data.type}`;
                    details.appendChild(contentType);
                }
                
                // Add button to fetch full content from CCC API
                const cccBtn = document.createElement('button');
                cccBtn.textContent = 'Fetch Full Content';
                cccBtn.className = 'detail-button';
                cccBtn.addEventListener('click', () => {
                    fetchCCCContent(data.data.id);
                });
                details.appendChild(cccBtn);
            }
            break;
            
        default:
            details.textContent = 'No additional details available';
    }
    
    detailContent.appendChild(details);
}

/**
 * Fetch related lessons for a standard and display them
 * @param {string} standardId - The standard ID
 */
async function fetchRelatedLessons(standardId) {
    const detailContent = document.getElementById('detail-content');
    if (!detailContent) return;
    
    try {
        // Show loading indicator
        const loadingSection = document.createElement('div');
        loadingSection.className = 'related-content';
        loadingSection.innerHTML = '<p>Loading related lessons...</p>';
        detailContent.appendChild(loadingSection);
        
        // Fetch related lessons
        const lessons = await fetchFromAPI(`/api/standards/${standardId}/lessons`);
        
        // Update the section
        loadingSection.innerHTML = '<h4>Related Lessons</h4>';
        
        if (lessons && lessons.length > 0) {
            const list = document.createElement('ul');
            list.className = 'related-list';
            
            lessons.forEach(lesson => {
                const item = document.createElement('li');
                item.innerHTML = `
                    <strong>${lesson.title}</strong><br>
                    ${lesson.description || ''}
                `;
                list.appendChild(item);
            });
            
            loadingSection.appendChild(list);
        } else {
            loadingSection.innerHTML += '<p>No related lessons found</p>';
        }
    } catch (error) {
        console.error('Error fetching related lessons:', error);
        detailContent.innerHTML += '<p class="error">Error loading related lessons</p>';
    }
}

/**
 * Fetch sample questions for a lesson and display them
 * @param {string} lessonId - The lesson ID
 */
async function fetchSampleQuestions(lessonId) {
    const detailContent = document.getElementById('detail-content');
    if (!detailContent) return;
    
    try {
        // Show loading indicator
        const loadingSection = document.createElement('div');
        loadingSection.className = 'related-content';
        loadingSection.innerHTML = '<p>Loading sample questions...</p>';
        detailContent.appendChild(loadingSection);
        
        // Fetch related content
        const content = await fetchFromAPI(`/api/ccc-content?lesson=${lessonId}`);
        
        // Update the section
        loadingSection.innerHTML = '<h4>Sample Content</h4>';
        
        if (content && content.length > 0) {
            const list = document.createElement('ul');
            list.className = 'related-list';
            
            content.forEach(item => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <strong>${item.type || 'Item'} ${item.id}</strong><br>
                    ${item.name || ''}
                `;
                list.appendChild(li);
            });
            
            loadingSection.appendChild(list);
        } else {
            loadingSection.innerHTML += '<p>No sample content found</p>';
        }
    } catch (error) {
        console.error('Error fetching sample questions:', error);
        detailContent.innerHTML += '<p class="error">Error loading sample content</p>';
    }
}

/**
 * Fetch full content from CCC API
 * @param {string} itemId - The CCC item ID
 */
async function fetchCCCContent(itemId) {
    const detailContent = document.getElementById('detail-content');
    if (!detailContent) return;
    
    try {
        // Show loading indicator
        const loadingSection = document.createElement('div');
        loadingSection.className = 'related-content';
        loadingSection.innerHTML = '<p>Loading content from CCC API...</p>';
        detailContent.appendChild(loadingSection);
        
        // Fetch item details
        const item = await fetchFromAPI(`/api/ccc-item/${itemId}`);
        
        // Update the section
        loadingSection.innerHTML = '<h4>CCC Content</h4>';
        
        if (item) {
            const content = document.createElement('div');
            content.className = 'ccc-content';
            
            // Display item details
            content.innerHTML = `
                <div class="ccc-item-header">
                    <strong>${item.type || 'Item'} ${item.id}</strong>
                </div>
                <div class="ccc-item-body">
                    ${item.name || ''}
                </div>
            `;
            
            // Add API data if available
            if (item.api_data) {
                content.innerHTML += `
                    <div class="ccc-api-data">
                        <h5>API Data</h5>
                        <pre>${JSON.stringify(item.api_data, null, 2)}</pre>
                    </div>
                `;
            }
            
            loadingSection.appendChild(content);
        } else {
            loadingSection.innerHTML += '<p>No content found</p>';
        }
    } catch (error) {
        console.error('Error fetching CCC content:', error);
        detailContent.innerHTML += '<p class="error">Error loading CCC content</p>';
    }
}

/**
 * Create a simple bar chart
 * @param {string} elementId - ID of the container element
 * @param {Array} data - The chart data
 * @param {string} xKey - The data key for x-axis values
 * @param {string} yKey - The data key for y-axis values
 * @param {string} xLabel - The x-axis label
 * @param {string} yLabel - The y-axis label
 */
function createBarChart(elementId, data, xKey, yKey, xLabel, yLabel) {
    const container = document.getElementById(elementId);
    if (!container || !data || data.length === 0) return;
    
    // Get container dimensions
    const width = container.clientWidth;
    const height = container.clientHeight || 300;
    
    // Margins
    const margin = {top: 20, right: 30, bottom: 40, left: 50};
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Clear any existing content
    container.innerHTML = '';
    
    // Create SVG
    const svg = d3.create('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', [0, 0, width, height])
        .attr('style', 'max-width: 100%; height: auto;');
    
    // Create a group for the chart elements
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Create scales
    const x = d3.scaleBand()
        .domain(data.map(d => d[xKey]))
        .range([0, innerWidth])
        .padding(0.2);
    
    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d[yKey])])
        .nice()
        .range([innerHeight, 0]);
    
    // Create axes
    g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .attr('y', 10)
        .attr('x', -5)
        .attr('text-anchor', 'end')
        .attr('transform', 'rotate(-45)');
    
    g.append('g')
        .call(d3.axisLeft(y));
    
    // Add bars
    g.selectAll('.bar')
        .data(data)
        .join('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d[xKey]))
        .attr('y', d => y(d[yKey]))
        .attr('width', x.bandwidth())
        .attr('height', d => innerHeight - y(d[yKey]))
        .attr('fill', '#4e79a7');
    
    // Add labels
    if (xLabel) {
        svg.append('text')
            .attr('class', 'x-label')
            .attr('text-anchor', 'middle')
            .attr('x', width / 2)
            .attr('y', height - 5)
            .text(xLabel);
    }
    
    if (yLabel) {
        svg.append('text')
            .attr('class', 'y-label')
            .attr('text-anchor', 'middle')
            .attr('transform', `translate(15,${height / 2}) rotate(-90)`)
            .text(yLabel);
    }
    
    // Append the SVG to the container
    container.appendChild(svg.node());
} 