/**
 * Curriculum Visualization - Main Utilities
 * 
 * This file contains shared utility functions used across the visualization UI.
 */

// Keep a cache of API responses to avoid unnecessary requests
const apiCache = {};

/**
 * Fetch data from the API
 * @param {string} endpoint - The API endpoint to fetch from
 * @param {boolean} useCache - Whether to use cached data if available (default: true)
 * @returns {Promise<Object>} - The JSON response from the API
 */
async function fetchFromAPI(endpoint, useCache = true) {
    console.log(`Fetching from API: ${endpoint}`);
    
    try {
        // Return cached data if available and caching is enabled
        if (useCache && apiCache[endpoint]) {
            console.log(`Using cached data for ${endpoint}`);
            return apiCache[endpoint];
        }
        
        // Make the fetch request
        const response = await fetch(endpoint);
        
        // Check if the response is OK
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API error (${response.status}): ${errorText || response.statusText}`);
        }
        
        // Parse the JSON response
        const data = await response.json();
        
        // Store in cache if caching is enabled
        if (useCache) {
            apiCache[endpoint] = data;
        }
        
        console.log(`Successfully fetched data from ${endpoint}`);
        return data;
    } catch (error) {
        console.error(`Error fetching from ${endpoint}:`, error);
        throw error; // Re-throw to allow caller to handle it
    }
}

/**
 * Clear the API cache
 */
function clearAPICache() {
    Object.keys(apiCache).forEach(key => delete apiCache[key]);
    console.log('API cache cleared');
}

/**
 * Creates a force-directed graph visualization
 * @param {string} elementId - ID of the container element
 * @param {Object} data - Graph data with nodes and links
 */
function createForceGraph(elementId, data) {
    console.log(`Creating force graph in ${elementId}`);
    const container = document.getElementById(elementId);
    
    if (!container) {
        console.error(`Container element with ID ${elementId} not found`);
        return;
    }
    
    // Clear any existing content
    container.innerHTML = '';
    
    // Get container dimensions
    const width = container.clientWidth;
    const height = container.clientHeight || 600;
    
    // Create SVG element
    const svg = d3.create('svg')
        .attr('width', width)
        .attr('height', height);
    
    // Create simulation
    const simulation = d3.forceSimulation(data.nodes)
        .force('link', d3.forceLink(data.links).id(d => d.id).distance(100))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(width / 2, height / 2));
    
    // Create links
    const link = svg.append('g')
        .attr('stroke', '#999')
        .attr('stroke-opacity', 0.6)
        .selectAll('line')
        .data(data.links)
        .join('line')
        .attr('stroke-width', d => Math.sqrt(d.value || 1));
    
    // Create nodes
    const node = svg.append('g')
        .selectAll('circle')
        .data(data.nodes)
        .join('circle')
        .attr('r', 5)
        .attr('fill', d => getNodeColor(d))
        .call(drag(simulation));
    
    // Add click event to nodes
    node.on('click', (event, d) => {
        showDetailPanel(d);
    });
    
    // Update positions on tick
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
    
    // Append the SVG to the container
    container.appendChild(svg.node());
    
    // Function to enable node dragging
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
    
    // Function to determine node color based on type
    function getNodeColor(node) {
        switch (node.type) {
            case 'standard':
                return '#4e79a7';
            case 'lesson':
                return '#f28e2c';
            case 'question':
                return '#e15759';
            case 'article':
                return '#76b7b2';
            default:
                return '#aaa';
        }
    }
}

/**
 * Show detail panel with information about a selected node
 * @param {Object} data - The node data
 */
function showDetailPanel(data) {
    console.log(`Showing detail panel for ${data.type}: ${data.label}`);
    
    // Create or get the detail panel
    let detailPanel = document.getElementById('detail-panel');
    
    if (!detailPanel) {
        // Create the panel if it doesn't exist
        detailPanel = document.createElement('div');
        detailPanel.id = 'detail-panel';
        detailPanel.className = 'detail-panel';
        
        // Add close button
        const closeButton = document.createElement('button');
        closeButton.textContent = '×';
        closeButton.className = 'close-button';
        closeButton.addEventListener('click', () => {
            detailPanel.style.display = 'none';
        });
        
        detailPanel.appendChild(closeButton);
        document.body.appendChild(detailPanel);
    }
    
    // Clear existing content
    detailPanel.innerHTML = '';
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.className = 'close-button';
    closeButton.addEventListener('click', () => {
        detailPanel.style.display = 'none';
    });
    detailPanel.appendChild(closeButton);
    
    // Add title
    const title = document.createElement('h3');
    title.textContent = data.label;
    detailPanel.appendChild(title);
    
    // Add type
    const type = document.createElement('p');
    type.innerHTML = `<strong>Type:</strong> ${data.type}`;
    detailPanel.appendChild(type);
    
    // Add additional information based on type
    if (data.type === 'standard') {
        const description = document.createElement('p');
        description.innerHTML = `<strong>Description:</strong> ${data.data.description || 'No description available'}`;
        detailPanel.appendChild(description);
        
        // Add button to show related lessons
        const button = document.createElement('button');
        button.textContent = 'Show Related Lessons';
        button.className = 'button';
        button.addEventListener('click', () => fetchRelatedLessons(data.id));
        detailPanel.appendChild(button);
    } else if (data.type === 'lesson') {
        if (data.data.description) {
            const description = document.createElement('p');
            description.innerHTML = `<strong>Description:</strong> ${data.data.description}`;
            detailPanel.appendChild(description);
        }
        
        if (data.data.standard_code) {
            const standard = document.createElement('p');
            standard.innerHTML = `<strong>Standard:</strong> ${data.data.standard_code}`;
            detailPanel.appendChild(standard);
        }
        
        // Add button to show sample questions
        const button = document.createElement('button');
        button.textContent = 'Show Sample Questions';
        button.className = 'button';
        button.addEventListener('click', () => fetchSampleQuestions(data.id));
        detailPanel.appendChild(button);
    }
    
    // Show the panel
    detailPanel.style.display = 'block';
}

/**
 * Fetch related lessons for a standard and display them
 * @param {string} standardId - The standard ID
 */
async function fetchRelatedLessons(standardId) {
    try {
        // Extract standard code from ID (e.g., "standard-MS-PS1-1" -> "MS-PS1-1")
        const standardCode = standardId.replace('standard-', '');
        const endpoint = `/api/standards/${standardCode}/lessons`;
        
        // Show loading message
        const detailPanel = document.getElementById('detail-panel');
        const loadingMsg = document.createElement('p');
        loadingMsg.className = 'loading-message';
        loadingMsg.textContent = 'Loading related lessons...';
        detailPanel.appendChild(loadingMsg);
        
        // Fetch the data
        const lessons = await fetchFromAPI(endpoint);
        
        // Remove loading message
        detailPanel.removeChild(loadingMsg);
        
        // Create container for lessons
        const lessonsContainer = document.createElement('div');
        lessonsContainer.className = 'related-items';
        
        // Add title
        const title = document.createElement('h4');
        title.textContent = 'Related Lessons';
        lessonsContainer.appendChild(title);
        
        // Add lessons list
        if (lessons && lessons.length > 0) {
            const list = document.createElement('ul');
            
            lessons.forEach(lesson => {
                const item = document.createElement('li');
                item.textContent = lesson.title || 'Unnamed Lesson';
                list.appendChild(item);
            });
            
            lessonsContainer.appendChild(list);
        } else {
            const noLessons = document.createElement('p');
            noLessons.textContent = 'No related lessons found.';
            lessonsContainer.appendChild(noLessons);
        }
        
        // Add to detail panel
        detailPanel.appendChild(lessonsContainer);
    } catch (error) {
        console.error('Error fetching related lessons:', error);
        
        // Show error message
        const detailPanel = document.getElementById('detail-panel');
        const errorMsg = document.createElement('p');
        errorMsg.className = 'error-message';
        errorMsg.textContent = 'Error loading related lessons.';
        detailPanel.appendChild(errorMsg);
    }
}

/**
 * Fetch sample questions for a lesson and display them
 * @param {string} lessonId - The lesson ID
 */
async function fetchSampleQuestions(lessonId) {
    try {
        // Extract lesson ID from the node ID (e.g., "lesson-123" -> "123")
        const id = lessonId.replace('lesson-', '');
        const endpoint = `/api/ccc-content?lesson_id=${id}`;
        
        // Show loading message
        const detailPanel = document.getElementById('detail-panel');
        const loadingMsg = document.createElement('p');
        loadingMsg.className = 'loading-message';
        loadingMsg.textContent = 'Loading sample questions...';
        detailPanel.appendChild(loadingMsg);
        
        // Fetch the data
        const questions = await fetchFromAPI(endpoint);
        
        // Remove loading message
        detailPanel.removeChild(loadingMsg);
        
        // Create container for questions
        const questionsContainer = document.createElement('div');
        questionsContainer.className = 'related-items';
        
        // Add title
        const title = document.createElement('h4');
        title.textContent = 'Sample Questions';
        questionsContainer.appendChild(title);
        
        // Add questions list
        if (questions && questions.length > 0) {
            const list = document.createElement('ul');
            
            questions.forEach((question, index) => {
                const item = document.createElement('li');
                item.textContent = question.title || `Question ${index + 1}`;
                list.appendChild(item);
            });
            
            questionsContainer.appendChild(list);
        } else {
            const noQuestions = document.createElement('p');
            noQuestions.textContent = 'No sample questions found.';
            questionsContainer.appendChild(noQuestions);
        }
        
        // Add to detail panel
        detailPanel.appendChild(questionsContainer);
    } catch (error) {
        console.error('Error fetching sample questions:', error);
        
        // Show error message
        const detailPanel = document.getElementById('detail-panel');
        const errorMsg = document.createElement('p');
        errorMsg.className = 'error-message';
        errorMsg.textContent = 'Error loading sample questions.';
        detailPanel.appendChild(errorMsg);
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
    console.log(`Creating bar chart in ${elementId}`);
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