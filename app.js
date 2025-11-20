// State management
let questions = [];
let currentQuestionId = null;
let interviewData = [];
let editingQuestionId = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadQuestions();
    renderQuestions();
    setupEventListeners();
    updateBranchTargets();
});

// Load questions from localStorage
function loadQuestions() {
    const stored = localStorage.getItem('streetInterviewQuestions');
    if (stored) {
        questions = JSON.parse(stored);
    }
}

// Save questions to localStorage
function saveQuestions() {
    localStorage.setItem('streetInterviewQuestions', JSON.stringify(questions));
}

// Setup event listeners
function setupEventListeners() {
    // Builder page
    document.getElementById('save-question').addEventListener('click', saveQuestion);
    document.getElementById('add-branch').addEventListener('click', addBranchRule);
    document.getElementById('start-interview').addEventListener('click', startInterview);
    document.getElementById('cancel-edit').addEventListener('click', cancelEdit);
    document.getElementById('import-questions').addEventListener('click', () => {
        document.getElementById('file-input').click();
    });
    document.getElementById('file-input').addEventListener('change', handleFileImport);
    
    // Interview page
    document.getElementById('next-question').addEventListener('click', handleNext);
    document.getElementById('end-interview').addEventListener('click', endInterview);
    
    // Export page
    document.getElementById('download-export').addEventListener('click', downloadExport);
    document.getElementById('back-to-builder').addEventListener('click', () => showPage('builder-page'));
    document.getElementById('new-interview').addEventListener('click', startNewInterview);
    
    // Handle branch rule removal
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-branch')) {
            e.target.closest('.branch-rule').remove();
        }
    });
    
    // Handle question item actions
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('edit-question')) {
            const questionId = e.target.dataset.questionId;
            editQuestion(questionId);
        } else if (e.target.classList.contains('delete-question')) {
            const questionId = e.target.dataset.questionId;
            deleteQuestion(questionId);
        }
    });
    
    // Handle branch buttons in interview mode
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('branch-button')) {
            const nextQuestionId = e.target.dataset.nextQuestionId;
            handleBranch(nextQuestionId);
        }
    });
}

// Generate unique ID for questions
function generateQuestionId() {
    return 'q' + Date.now() + Math.random().toString(36).substr(2, 9);
}

// Add branch rule input
function addBranchRule() {
    const container = document.getElementById('branch-rules');
    const branchRule = document.createElement('div');
    branchRule.className = 'branch-rule';
    branchRule.innerHTML = `
        <input type="text" class="branch-answer" placeholder="Answer type (e.g., positive)" />
        <select class="branch-target">
            <option value="">Select next question...</option>
        </select>
        <button type="button" class="remove-branch">Remove</button>
    `;
    container.appendChild(branchRule);
    updateBranchTargets();
}

// Update branch target dropdowns
function updateBranchTargets() {
    const selects = document.querySelectorAll('.branch-target');
    selects.forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">Select next question...</option><option value="null">End Interview</option>';
        
        questions.forEach(q => {
            if (q.id !== editingQuestionId) {
                const option = document.createElement('option');
                option.value = q.id;
                option.textContent = q.text.substring(0, 50) + (q.text.length > 50 ? '...' : '');
                select.appendChild(option);
            }
        });
        
        if (currentValue) {
            select.value = currentValue;
        }
    });
}

// Save question
function saveQuestion() {
    const text = document.getElementById('question-text').value.trim();
    if (!text) {
        alert('Please enter question text');
        return;
    }
    
    const branchRules = {};
    const branchRuleElements = document.querySelectorAll('.branch-rule');
    
    branchRuleElements.forEach(rule => {
        const answerType = rule.querySelector('.branch-answer').value.trim();
        const targetId = rule.querySelector('.branch-target').value;
        
        if (answerType && targetId) {
            branchRules[answerType] = targetId === 'null' ? null : targetId;
        }
    });
    
    if (editingQuestionId) {
        // Update existing question
        const question = questions.find(q => q.id === editingQuestionId);
        if (question) {
            question.text = text;
            question.branchingRules = branchRules;
        }
        editingQuestionId = null;
        document.getElementById('cancel-edit').style.display = 'none';
    } else {
        // Create new question
        const question = {
            id: generateQuestionId(),
            text: text,
            branchingRules: branchRules
        };
        questions.push(question);
    }
    
    saveQuestions();
    renderQuestions();
    resetQuestionForm();
}

// Reset question form
function resetQuestionForm() {
    document.getElementById('question-text').value = '';
    document.getElementById('branch-rules').innerHTML = `
        <div class="branch-rule">
            <input type="text" class="branch-answer" placeholder="Answer type (e.g., positive)" />
            <select class="branch-target">
                <option value="">Select next question...</option>
            </select>
            <button type="button" class="remove-branch">Remove</button>
        </div>
    `;
    updateBranchTargets();
}

// Cancel edit
function cancelEdit() {
    editingQuestionId = null;
    document.getElementById('cancel-edit').style.display = 'none';
    resetQuestionForm();
}

// Edit question
function editQuestion(questionId) {
    const question = questions.find(q => q.id === questionId);
    if (!question) return;
    
    editingQuestionId = questionId;
    document.getElementById('question-text').value = question.text;
    document.getElementById('cancel-edit').style.display = 'block';
    
    // Clear and populate branch rules
    const branchRulesContainer = document.getElementById('branch-rules');
    branchRulesContainer.innerHTML = '';
    
    if (Object.keys(question.branchingRules).length === 0) {
        addBranchRule();
    } else {
        Object.entries(question.branchingRules).forEach(([answerType, targetId]) => {
            const branchRule = document.createElement('div');
            branchRule.className = 'branch-rule';
            branchRule.innerHTML = `
                <input type="text" class="branch-answer" placeholder="Answer type (e.g., positive)" value="${answerType}" />
                <select class="branch-target">
                    <option value="">Select next question...</option>
                </select>
                <button type="button" class="remove-branch">Remove</button>
            `;
            branchRulesContainer.appendChild(branchRule);
        });
    }
    
    updateBranchTargets();
    
    // Set the target values
    setTimeout(() => {
        const selects = branchRulesContainer.querySelectorAll('.branch-target');
        const entries = Object.entries(question.branchingRules);
        selects.forEach((select, index) => {
            if (entries[index]) {
                const targetId = entries[index][1];
                select.value = targetId === null ? 'null' : targetId;
            }
        });
    }, 100);
    
    // Scroll to form
    document.querySelector('.question-form').scrollIntoView({ behavior: 'smooth' });
}

// Delete question
function deleteQuestion(questionId) {
    if (confirm('Are you sure you want to delete this question?')) {
        questions = questions.filter(q => q.id !== questionId);
        saveQuestions();
        renderQuestions();
    }
}

// Render questions list
function renderQuestions() {
    const container = document.getElementById('questions-container');
    
    if (questions.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No questions yet. Add your first question above!</p></div>';
        return;
    }
    
    container.innerHTML = questions.map(q => {
        const branchesHtml = Object.keys(q.branchingRules).length > 0
            ? `<div class="question-branches">
                ${Object.entries(q.branchingRules).map(([answerType, targetId]) => {
                    const targetText = targetId === null 
                        ? 'End Interview' 
                        : questions.find(tq => tq.id === targetId)?.text.substring(0, 40) + '...' || 'Unknown';
                    return `<div class="branch-display"><strong>${answerType}</strong> → ${targetText}</div>`;
                }).join('')}
               </div>`
            : '<div class="question-branches"><em>No branching rules</em></div>';
        
        return `
            <div class="question-item">
                <div class="question-item-header">
                    <div class="question-item-text">${escapeHtml(q.text)}</div>
                    <div class="question-item-actions">
                        <button class="btn-secondary btn-small edit-question" data-question-id="${q.id}">Edit</button>
                        <button class="btn-secondary btn-small delete-question" data-question-id="${q.id}">Delete</button>
                    </div>
                </div>
                ${branchesHtml}
            </div>
        `;
    }).join('');
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show page
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
}

// Start interview
function startInterview() {
    if (questions.length === 0) {
        alert('Please add at least one question before starting the interview.');
        return;
    }
    
    // Reset interview data
    interviewData = [];
    currentQuestionId = questions[0].id;
    
    // Save interview state
    saveInterviewState();
    
    showPage('interview-page');
    displayCurrentQuestion();
}

// Start new interview
function startNewInterview() {
    if (confirm('Start a new interview? This will clear the current interview data.')) {
        interviewData = [];
        currentQuestionId = questions.length > 0 ? questions[0].id : null;
        saveInterviewState();
        showPage('interview-page');
        displayCurrentQuestion();
    }
}

// Display current question
function displayCurrentQuestion() {
    const question = questions.find(q => q.id === currentQuestionId);
    
    if (!question) {
        endInterview();
        return;
    }
    
    document.getElementById('current-question-text').textContent = question.text;
    document.getElementById('interview-notes').value = '';
    
    // Load existing notes if any
    const existingEntry = interviewData.find(entry => entry.questionId === currentQuestionId);
    if (existingEntry) {
        document.getElementById('interview-notes').value = existingEntry.notes || '';
    }
    
    // Display branch buttons
    const branchButtonsContainer = document.getElementById('branch-buttons');
    const branchingRules = question.branchingRules || {};
    
    branchButtonsContainer.innerHTML = '';
    
    if (Object.keys(branchingRules).length > 0) {
        Object.entries(branchingRules).forEach(([answerType, nextQuestionId]) => {
            const button = document.createElement('button');
            button.className = 'branch-button';
            button.textContent = answerType;
            button.dataset.nextQuestionId = nextQuestionId === null ? 'null' : nextQuestionId;
            branchButtonsContainer.appendChild(button);
        });
        document.getElementById('next-question').style.display = 'none';
    } else {
        document.getElementById('next-question').style.display = 'block';
    }
}

// Handle branch selection
function handleBranch(nextQuestionId) {
    saveCurrentNotes();
    
    if (nextQuestionId === 'null' || nextQuestionId === null) {
        endInterview();
        return;
    }
    
    currentQuestionId = nextQuestionId;
    saveInterviewState();
    displayCurrentQuestion();
}

// Handle next button
function handleNext() {
    saveCurrentNotes();
    
    // Find next question (first question that hasn't been asked, or just move to next in list)
    const currentIndex = questions.findIndex(q => q.id === currentQuestionId);
    if (currentIndex < questions.length - 1) {
        currentQuestionId = questions[currentIndex + 1].id;
    } else {
        endInterview();
        return;
    }
    
    saveInterviewState();
    displayCurrentQuestion();
}

// Save current notes
function saveCurrentNotes() {
    const notes = document.getElementById('interview-notes').value.trim();
    const existingIndex = interviewData.findIndex(entry => entry.questionId === currentQuestionId);
    
    const entry = {
        questionId: currentQuestionId,
        questionText: questions.find(q => q.id === currentQuestionId)?.text || '',
        notes: notes
    };
    
    if (existingIndex >= 0) {
        interviewData[existingIndex] = entry;
    } else {
        interviewData.push(entry);
    }
    
    saveInterviewState();
}

// Save interview state
function saveInterviewState() {
    localStorage.setItem('streetInterviewData', JSON.stringify(interviewData));
    localStorage.setItem('streetInterviewCurrentQuestion', currentQuestionId);
}

// Load interview state
function loadInterviewState() {
    const stored = localStorage.getItem('streetInterviewData');
    if (stored) {
        interviewData = JSON.parse(stored);
    }
    currentQuestionId = localStorage.getItem('streetInterviewCurrentQuestion');
}

// End interview
function endInterview() {
    saveCurrentNotes();
    
    // Filter out questions without notes (not actually answered)
    const answeredQuestions = interviewData.filter(entry => entry.notes.trim().length > 0);
    
    if (answeredQuestions.length === 0) {
        alert('No questions were answered. Interview data not saved.');
        showPage('builder-page');
        return;
    }
    
    showPage('export-page');
    generateExportPreview(answeredQuestions);
}

// Generate export preview
function generateExportPreview(answeredQuestions) {
    let exportText = '';
    
    answeredQuestions.forEach((entry, index) => {
        exportText += `${index + 1}. ${entry.questionText}\n`;
        exportText += `→ ${entry.notes}\n\n`;
    });
    
    document.getElementById('export-content').textContent = exportText;
}

// Download export
function downloadExport() {
    const content = document.getElementById('export-content').textContent;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `street-interview-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Handle file import
function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.txt') && !fileName.endsWith('.md')) {
        showImportError('Invalid file type. Please select a .txt or .md file.');
        event.target.value = ''; // Reset file input
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const content = e.target.result;
            const parsedQuestions = parseQuestionsFromFile(content);
            
            if (parsedQuestions.length === 0) {
                showImportError('No questions found in the file. Please ensure questions are numbered (1., 1), 1 -, or 1:).');
                event.target.value = '';
                return;
            }
            
            // Merge imported questions with existing questions
            questions = questions.concat(parsedQuestions);
            saveQuestions();
            renderQuestions();
            updateBranchTargets();
            
            // Show success message
            showImportSuccess(`Successfully imported ${parsedQuestions.length} question(s).`);
            
            // Reset file input
            event.target.value = '';
        } catch (error) {
            showImportError('Error reading file: ' + error.message);
            event.target.value = '';
        }
    };
    
    reader.onerror = () => {
        showImportError('Error reading file. Please try again.');
        event.target.value = '';
    };
    
    reader.readAsText(file);
}

// Parse questions from file content
function parseQuestionsFromFile(content) {
    const lines = content.split(/\r?\n/);
    const parsedQuestions = [];
    
    // Regex patterns for different numbering formats
    const patterns = [
        /^\s*(\d+)\.\s+(.+)$/,      // 1. question
        /^\s*(\d+)\)\s+(.+)$/,      // 1) question
        /^\s*(\d+)\s+-\s+(.+)$/,    // 1 - question
        /^\s*(\d+):\s+(.+)$/        // 1: question
    ];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines
        
        // Try to match any of the numbering patterns
        let match = null;
        for (const pattern of patterns) {
            match = line.match(pattern);
            if (match) break;
        }
        
        if (match) {
            const questionText = match[2].trim();
            if (questionText) {
                // Create question object
                const question = {
                    id: generateQuestionId(),
                    text: questionText,
                    branchingRules: {}
                };
                parsedQuestions.push(question);
            }
        }
    }
    
    return parsedQuestions;
}

// Show import error
function showImportError(message) {
    const errorDiv = document.getElementById('import-error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    errorDiv.className = 'import-error';
    
    // Hide after 5 seconds
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// Show import success
function showImportSuccess(message) {
    const errorDiv = document.getElementById('import-error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    errorDiv.className = 'import-success';
    
    // Hide after 5 seconds
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}


