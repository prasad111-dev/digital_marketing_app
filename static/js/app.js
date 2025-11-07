// Global state
let currentClient = null;
let uploadedFiles = [];

// DOM Ready
document.addEventListener('DOMContentLoaded', function() {
    initializeTabs();
    loadClients();
    setupEventListeners();
});

// Tab functionality
function initializeTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // Update active tab button
            tabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Show target tab content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(targetTab).classList.add('active');
        });
    });
}

// Client management
async function loadClients() {
    try {
        const response = await fetch('/api/clients');
        const clients = await response.json();
        
        const clientSelect = document.getElementById('client-select');
        clientSelect.innerHTML = '<option value="">-- Select a client --</option>';
        
        clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.client_id;
            option.textContent = `${client.name} (${client.client_id})`;
            clientSelect.appendChild(option);
        });
        
        // Add change listener
        clientSelect.addEventListener('change', function() {
            const clientId = this.value;
            if (clientId) {
                selectClient(clientId, clients);
            } else {
                hideClientInfo();
            }
        });
    } catch (error) {
        console.error('Error loading clients:', error);
    }
}

function selectClient(clientId, clients) {
    const client = clients.find(c => c.client_id === clientId);
    if (!client) return;
    
    currentClient = client;
    
    // Show client info
    const clientInfo = document.getElementById('client-info');
    const clientDetails = document.getElementById('client-details');
    
    clientDetails.innerHTML = `
        <p><strong>Name:</strong> ${client.name}</p>
        <p><strong>Email:</strong> ${client.email || 'N/A'}</p>
        <p><strong>Client ID:</strong> ${client.client_id}</p>
        <p><strong>Platforms configured:</strong> ${Object.keys(client.tokens).filter(p => client.tokens[p]).join(', ') || 'None'}</p>
    `;
    
    clientInfo.style.display = 'block';
    
    // Show post creation section
    document.getElementById('post-creation-section').style.display = 'block';
}

function hideClientInfo() {
    currentClient = null;
    document.getElementById('client-info').style.display = 'none';
    document.getElementById('post-creation-section').style.display = 'none';
    document.getElementById('results-section').style.display = 'none';
}

// Add new client
document.getElementById('add-client-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const data = Object.fromEntries(formData);
    const submitBtn = this.querySelector('button[type="submit"]');
    
    submitBtn.textContent = 'Adding Client...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch('/api/clients', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Client added successfully!');
            this.reset();
            await loadClients(); // Reload clients list
            
            // Switch back to select client tab
            document.querySelector('[data-tab="select-client"]').click();
        } else {
            alert('Error adding client');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error adding client');
    } finally {
        submitBtn.textContent = 'Add Client';
        submitBtn.disabled = false;
    }
});

// File upload handling
function setupEventListeners() {
    const mediaUpload = document.getElementById('media-upload');
    const submitPostBtn = document.getElementById('submit-post');
    
    if (mediaUpload) {
        mediaUpload.addEventListener('change', handleFileUpload);
    }
    
    if (submitPostBtn) {
        submitPostBtn.addEventListener('click', submitPost);
    }
}

async function handleFileUpload(e) {
    const files = e.target.files;
    if (files.length === 0) return;
    
    const formData = new FormData();
    for (let file of files) {
        formData.append('files[]', file);
    }
    
    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            uploadedFiles = [...uploadedFiles, ...result.files];
            updateFileList();
            createMediaPreviews();
            updateSubmitButton();
        } else {
            alert('Error uploading files');
        }
    } catch (error) {
        console.error('Upload error:', error);
        alert('Error uploading files');
    }
    
    // Reset file input
    e.target.value = '';
}

function updateFileList() {
    const fileList = document.getElementById('file-list');
    fileList.innerHTML = '';
    
    uploadedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <span class="file-name">${file.original_name}</span>
            <button type="button" class="remove-file" onclick="removeFile(${index})">Remove</button>
        `;
        fileList.appendChild(fileItem);
    });
}

function removeFile(index) {
    uploadedFiles.splice(index, 1);
    updateFileList();
    createMediaPreviews();
    updateSubmitButton();
}

function createMediaPreviews() {
    const container = document.getElementById('media-previews');
    container.innerHTML = '';
    
    uploadedFiles.forEach((file, index) => {
        const preview = document.createElement('div');
        preview.className = 'media-preview';
        preview.innerHTML = `
            <div class="media-preview-header">
                <div class="media-preview-title">${file.original_name}</div>
                <button type="button" class="remove-file" onclick="removeFile(${index})">Remove</button>
            </div>
            <div class="media-preview-content">
                <div class="media-preview-image">
                    ${file.original_name.match(/\.(jpg|jpeg|png|gif)$/i) ? 
                      `<img src="/temp/${file.temp_name}" alt="Preview" style="max-width: 100%; max-height: 100%;">` : 
                      'Video File'}
                </div>
                <div class="media-preview-fields">
                    <div class="form-group">
                        <label>Caption</label>
                        <textarea placeholder="Enter caption for this media..." rows="3" 
                                  oninput="updateFileData(${index}, 'caption', this.value)"></textarea>
                    </div>
                    <div class="form-group">
                        <label>Hashtags</label>
                        <input type="text" placeholder="#digital #marketing #socialmedia" 
                               oninput="updateFileData(${index}, 'hashtags', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Mentions</label>
                        <input type="text" placeholder="@username1 @username2" 
                               oninput="updateFileData(${index}, 'mentions', this.value)">
                    </div>
                </div>
            </div>
        `;
        container.appendChild(preview);
    });
}

function updateFileData(index, field, value) {
    if (!uploadedFiles[index].metadata) {
        uploadedFiles[index].metadata = {};
    }
    uploadedFiles[index].metadata[field] = value;
}

function updateSubmitButton() {
    const submitBtn = document.getElementById('submit-post');
    const hasFiles = uploadedFiles.length > 0;
    const hasPlatforms = document.querySelectorAll('input[name="platform"]:checked').length > 0;
    
    submitBtn.disabled = !(hasFiles && hasPlatforms && currentClient);
}

// Platform selection
document.addEventListener('change', function(e) {
    if (e.target.name === 'platform') {
        updateSubmitButton();
    }
});

// Post submission
async function submitPost() {
    if (!currentClient || uploadedFiles.length === 0) return;
    
    const selectedPlatforms = Array.from(document.querySelectorAll('input[name="platform"]:checked'))
        .map(cb => cb.value);
    
    if (selectedPlatforms.length === 0) {
        alert('Please select at least one platform');
        return;
    }
    
    const submitBtn = document.getElementById('submit-post');
    submitBtn.textContent = 'Posting...';
    submitBtn.disabled = true;
    
    const postData = {
        client_id: currentClient.client_id,
        platforms: selectedPlatforms,
        media_files: uploadedFiles.map(file => ({
            temp_name: file.temp_name,
            original_name: file.original_name,
            metadata: file.metadata || {}
        }))
    };
    
    try {
        const response = await fetch('/api/post', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(postData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showResults(result.results);
            // Clear uploaded files
            uploadedFiles = [];
            updateFileList();
            createMediaPreviews();
        } else {
            alert('Error posting content');
        }
    } catch (error) {
        console.error('Post error:', error);
        alert('Error posting content');
    } finally {
        submitBtn.textContent = 'Post to Selected Platforms';
        updateSubmitButton();
    }
}

function showResults(results) {
    const resultsSection = document.getElementById('results-section');
    const resultsContainer = document.getElementById('posting-results');
    
    resultsContainer.innerHTML = '';
    
    Object.entries(results).forEach(([platform, result]) => {
        const resultItem = document.createElement('div');
        resultItem.className = `result-item ${result.status === 'success' ? 'result-success' : 'result-error'}`;
        
        const icon = result.status === 'success' ? '✓' : '✗';
        resultItem.innerHTML = `
            <span style="font-weight: bold;">${icon} ${platform.toUpperCase()}:</span>
            ${result.message}
        `;
        
        resultsContainer.appendChild(resultItem);
    });
    
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}