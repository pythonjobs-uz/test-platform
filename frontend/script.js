// API Base URL
const API_BASE_URL = 'http://localhost:8000';

// DOM Elements
const authSection = document.getElementById('auth-section');
const dashboardSection = document.getElementById('dashboard-section');
const testSection = document.getElementById('test-section');
const resultSection = document.getElementById('result-section');
const userNameElement = document.getElementById('user-name');
const logoutBtn = document.getElementById('logout-btn');
const notification = document.getElementById('notification');

// State
let currentUser = null;
let accessToken = localStorage.getItem('accessToken');
let refreshToken = localStorage.getItem('refreshToken');
let currentTest = null;
let testTimer = null;

// Initialize the application
function init() {
    setupEventListeners();
    
    if (accessToken) {
        fetchCurrentUser()
            .then(() => {
                showDashboard();
                loadTests();
                loadSubmissions();
            })
            .catch(error => {
                console.error('Error fetching user:', error);
                showAuthSection();
            });
    } else {
        showAuthSection();
    }
}

// Event Listeners
function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', function() {
            const tabContainer = this.closest('.tabs').parentElement;
            const tabName = this.dataset.tab;
            
            // Update active tab button
            tabContainer.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            this.classList.add('active');
            
            // Show active tab content
            tabContainer.querySelectorAll('.tab-content, .form-container').forEach(content => {
                content.classList.remove('active');
            });
            tabContainer.querySelector(`#${tabName}-container, #${tabName}-form`).classList.add('active');
        });
    });
    
    // Auth forms
    document.getElementById('login').addEventListener('submit', handleLogin);
    document.getElementById('register').addEventListener('submit', handleRegister);
    
    // Logout
    logoutBtn.addEventListener('click', handleLogout);
    
    // Create test form
    document.getElementById('create-test-form').addEventListener('submit', handleCreateTest);
    document.getElementById('add-question-btn').addEventListener('click', addQuestionField);
    
    // Back to dashboard button
    document.getElementById('back-to-dashboard').addEventListener('click', () => {
        hideAllSections();
        showDashboard();
    });
}

// Authentication Functions
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/login/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Login failed');
        }
        
        // Save tokens
        accessToken = data.access;
        refreshToken = data.refresh;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        
        // Fetch user info and show dashboard
        await fetchCurrentUser();
        showDashboard();
        loadTests();
        loadSubmissions();
        
        showNotification('Login successful', 'success');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const password2 = document.getElementById('register-password2').value;
    const firstName = document.getElementById('first-name').value;
    const lastName = document.getElementById('last-name').value;
    const role = document.getElementById('role').value;
    
    if (password !== password2) {
        showNotification('Passwords do not match', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/register/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                password,
                password2,
                first_name: firstName,
                last_name: lastName,
                role
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            const errorMessage = Object.values(data).flat().join(', ');
            throw new Error(errorMessage || 'Registration failed');
        }
        
        showNotification('Registration successful. Please login.', 'success');
        
        // Switch to login tab
        document.querySelector('.tab-btn[data-tab="login"]').click();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function handleLogout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    accessToken = null;
    refreshToken = null;
    currentUser = null;
    
    hideAllSections();
    showAuthSection();
    showNotification('Logged out successfully', 'success');
}

async function fetchCurrentUser() {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/v1/users/me/`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch user data');
        }
        
        currentUser = await response.json();
        
        // Update UI with user info
        userNameElement.textContent = `${currentUser.first_name} ${currentUser.last_name} (${currentUser.role})`;
        logoutBtn.classList.remove('hidden');
        
        // Show/hide teacher-only elements
        const teacherElements = document.querySelectorAll('.teacher-only');
        if (currentUser.role === 'teacher' || currentUser.role === 'admin') {
            teacherElements.forEach(el => el.classList.remove('hidden'));
        } else {
            teacherElements.forEach(el => el.classList.add('hidden'));
        }
        
        return currentUser;
    } catch (error) {
        throw new Error('Failed to fetch user data');
    }
}

// API Helper Functions
async function fetchWithAuth(url, options = {}) {
    try {
        if (!options.headers) {
            options.headers = {};
        }
        
        if (accessToken) {
            options.headers['Authorization'] = `Bearer ${accessToken}`;
        }
        
        options.headers['Content-Type'] = 'application/json';
        
        let response = await fetch(url, options);
        
        if (response.status === 401 && refreshToken) {
            const newToken = await refreshAccessToken();
            
            if (newToken) {
                options.headers['Authorization'] = `Bearer ${newToken}`;
                response = await fetch(url, options);
            } else {
                throw new Error('Session expired. Please login again.');
            }
        }
        
        return response;
    } catch (error) {
        console.error('API request failed:', error);
        if (error.message.includes('Session expired')) {
            showAuthSection();
        }
        throw error;
    }
}

async function refreshAccessToken() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ refresh: refreshToken })
        });
        
        if (!response.ok) {
            // If refresh fails, clear tokens and redirect to login
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            accessToken = null;
            refreshToken = null;
            showAuthSection();
            return null;
        }
        
        const data = await response.json();
        accessToken = data.access;
        localStorage.setItem('accessToken', accessToken);
        
        return accessToken;
    } catch (error) {
        console.error('Token refresh failed:', error);
        return null;
    }
}

// Tests Functions
async function loadTests() {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/v1/tests/`);
        
        if (!response.ok) {
            throw new Error('Failed to load tests');
        }
        
        const data = await response.json();
        
        const testsContainer = document.getElementById('tests-list');
        testsContainer.innerHTML = '';
        
        if (data.results.length === 0) {
            testsContainer.innerHTML = '<p>No tests available.</p>';
            return;
        }
        
        data.results.forEach(test => {
            const testCard = document.createElement('div');
            testCard.className = 'card';
            testCard.innerHTML = `
                <div class="card-title">${test.title}</div>
                <div class="card-content">
                    <p>Subject: ${test.subject}</p>
                    <p>Time Limit: ${test.time_limit} minutes</p>
                    <p>Questions: ${test.question_count}</p>
                </div>
                <div class="card-footer">
                    <button class="btn primary start-test-btn" data-test-id="${test.id}">Start Test</button>
                </div>
            `;
            
            testsContainer.appendChild(testCard);
            
            // Add event listener to start test button
            testCard.querySelector('.start-test-btn').addEventListener('click', () => {
                startTest(test.id);
            });
        });
    } catch (error) {
        showNotification('Failed to load tests', 'error');
    }
}

async function startTest(testId) {
    try {
        if (!testId) {
            throw new Error('Invalid test ID');
        }
        
        // Show loading indicator
        showNotification('Loading test...', 'info');
        
        // First, get the test details
        const response = await fetchWithAuth(`${API_BASE_URL}/api/v1/tests/${testId}/`);
        
        if (!response.ok) {
            throw new Error('Failed to load test');
        }
        
        const test = await response.json();
        console.log('Test data:', test); // Debug log
        
        // Store test ID in a data attribute on the test section for backup
        testSection.dataset.testId = testId;
        
        // Try different endpoints to get questions
        let questionsData;
        let questions = [];
        
        try {
            // First try the standard endpoint
            const questionsResponse = await fetchWithAuth(`${API_BASE_URL}/api/v1/tests/${testId}/questions/`);
            
            if (questionsResponse.ok) {
                questionsData = await questionsResponse.json();
                console.log('Questions data from standard endpoint:', questionsData); // Debug log
                
                // Check if questions are in results array or directly in the response
                if (questionsData.results && Array.isArray(questionsData.results)) {
                    questions = questionsData.results;
                } else if (Array.isArray(questionsData)) {
                    questions = questionsData;
                } else if (questionsData.questions && Array.isArray(questionsData.questions)) {
                    questions = questionsData.questions;
                }
            }
        } catch (error) {
            console.error('Error fetching questions from standard endpoint:', error);
        }
        
        // If no questions yet, try the alternative endpoint
        if (questions.length === 0) {
            try {
                const altQuestionsResponse = await fetchWithAuth(`${API_BASE_URL}/api/v1/tests/${testId}/questions`);
                
                if (altQuestionsResponse.ok) {
                    questionsData = await altQuestionsResponse.json();
                    console.log('Questions data from alternative endpoint:', questionsData); // Debug log
                    
                    // Check if questions are in results array or directly in the response
                    if (questionsData.results && Array.isArray(questionsData.results)) {
                        questions = questionsData.results;
                    } else if (Array.isArray(questionsData)) {
                        questions = questionsData;
                    } else if (questionsData.questions && Array.isArray(questionsData.questions)) {
                        questions = questionsData.questions;
                    }
                }
            } catch (error) {
                console.error('Error fetching questions from alternative endpoint:', error);
            }
        }
        
        // If still no questions, check if they're embedded in the test object
        if (questions.length === 0 && test.questions && Array.isArray(test.questions)) {
            questions = test.questions;
            console.log('Using questions from test object:', questions); // Debug log
        }
        
        // Final check for questions
        if (questions.length === 0) {
            // Make one last attempt with a different endpoint format
            try {
                const lastAttemptResponse = await fetchWithAuth(`${API_BASE_URL}/api/v1/tests/${testId}/questions/`);
                
                if (lastAttemptResponse.ok) {
                    const lastAttemptData = await lastAttemptResponse.json();
                    console.log('Last attempt data:', lastAttemptData); // Debug log
                    
                    // Try to extract questions from any property that might contain them
                    for (const key in lastAttemptData) {
                        if (Array.isArray(lastAttemptData[key]) && lastAttemptData[key].length > 0) {
                            questions = lastAttemptData[key];
                            break;
                        }
                    }
                }
            } catch (error) {
                console.error('Error in last attempt to fetch questions:', error);
            }
        }
        
        // If we still have no questions, throw an error
        if (questions.length === 0) {
            throw new Error('No questions available for this test. Please contact your administrator.');
        }
        
        // Create a complete test object with all necessary data
        currentTest = {
            id: testId,
            title: test.title || 'Test',
            description: test.description || '',
            subject: test.subject || '',
            time_limit: test.time_limit || 0,
            questions: questions
        };
        
        // Also store the test data in localStorage as a backup
        try {
            localStorage.setItem('currentTestId', testId);
            localStorage.setItem('currentTestData', JSON.stringify(currentTest));
        } catch (e) {
            console.warn('Could not save test data to localStorage:', e);
        }
        
        console.log('Final test with questions:', currentTest); // Debug log
        
        // Display test
        renderTest(currentTest);
        
        // Hide dashboard and show test section
        hideAllSections();
        testSection.classList.remove('hidden');
        
        // Start timer
        if (test.time_limit && test.time_limit > 0) {
            startTestTimer(test.time_limit);
        } else {
            console.warn('No time limit set for test');
        }
    } catch (error) {
        console.error('Start test error:', error);
        showNotification(error.message, 'error');
        showDashboard();
    }
}

function renderTest(test) {
    // Set test header info
    document.getElementById('test-name').textContent = test.title || 'Test';
    document.getElementById('test-description-display').textContent = test.description || '';
    document.getElementById('test-subject-display').textContent = test.subject || '';
    
    // Store test ID in a data attribute for backup
    document.getElementById('submit-test').dataset.testId = test.id;
    
    // Render questions
    const questionsContainer = document.getElementById('questions');
    questionsContainer.innerHTML = '';
    
    // Ensure questions is an array
    const questions = Array.isArray(test.questions) ? test.questions : [];
    
    if (questions.length === 0) {
        questionsContainer.innerHTML = '<div class="question-card"><p>No questions available for this test.</p></div>';
        return;
    }
    
    questions.forEach((question, index) => {
        // Skip invalid questions
        if (!question || !question.id) {
            console.warn('Invalid question data:', question);
            return;
        }
        
        const questionCard = document.createElement('div');
        questionCard.className = 'question-card';
        questionCard.dataset.questionId = question.id;
        questionCard.dataset.questionType = question.question_type || 'text';
        
        let choicesHtml = '';
        
        // Ensure choices is an array
        const choices = Array.isArray(question.choices) ? question.choices : [];
        
        if (question.question_type === 'multiple_choice') {
            choicesHtml = `
                <div class="choices">
                    ${choices.map(choice => `
                        <div class="choice-item">
                            <input type="checkbox" id="choice-${choice.id}" name="question-${question.id}" value="${choice.id}">
                            <label for="choice-${choice.id}">${choice.text}</label>
                        </div>
                    `).join('')}
                </div>
            `;
        } else if (question.question_type === 'single_choice') {
            choicesHtml = `
                <div class="choices">
                    ${choices.map(choice => `
                        <div class="choice-item">
                            <input type="radio" id="choice-${choice.id}" name="question-${question.id}" value="${choice.id}">
                            <label for="choice-${choice.id}">${choice.text}</label>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            // Default to text input for any other question type
            choicesHtml = `
                <div class="text-answer">
                    <textarea id="text-answer-${question.id}" rows="4" placeholder="Your answer"></textarea>
                </div>
            `;
        }
        
        questionCard.innerHTML = `
            <div class="question-text">
                <span class="question-number">${index + 1}.</span> ${question.text}
                <span class="question-points">(${question.points || 1} points)</span>
            </div>
            ${choicesHtml}
        `;
        
        questionsContainer.appendChild(questionCard);
    });
    
    // Add event listener to submit test button
    const submitButton = document.getElementById('submit-test');
    // Remove any existing event listeners
    const newSubmitButton = submitButton.cloneNode(true);
    submitButton.parentNode.replaceChild(newSubmitButton, submitButton);
    newSubmitButton.addEventListener('click', submitTest);
}

function startTestTimer(minutes) {
    let totalSeconds = minutes * 60;
    const timerElement = document.getElementById('time-remaining');
    
    // Clear any existing timer
    if (testTimer) {
        clearInterval(testTimer);
    }
    
    // Update timer immediately
    updateTimerDisplay(totalSeconds, timerElement);
    
    // Set interval to update timer every second
    testTimer = setInterval(() => {
        totalSeconds--;
        updateTimerDisplay(totalSeconds, timerElement);
        
        if (totalSeconds <= 0) {
            clearInterval(testTimer);
            submitTest(true); // Auto-submit when time is up
        }
    }, 1000);
}

function updateTimerDisplay(totalSeconds, element) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    element.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Add warning class when less than 5 minutes remaining
    if (totalSeconds < 300) {
        element.classList.add('warning');
    }
}

async function submitTest(timedOut = false) {
    // Clear timer
    if (testTimer) {
        clearInterval(testTimer);
        testTimer = null;
    }
    
    if (timedOut) {
        showNotification('Time is up! Your test has been submitted.', 'warning');
    }
    
    try {
        // Try to get test ID from multiple sources
        let testId = null;
        
        // First check if currentTest is valid
        if (currentTest && currentTest.id) {
            testId = currentTest.id;
            console.log('Using test ID from currentTest:', testId);
        } 
        // Then check if we have it in the submit button's data attribute
        else if (this && this.dataset && this.dataset.testId) {
            testId = this.dataset.testId;
            console.log('Using test ID from submit button:', testId);
        }
        // Then check if we have it in the test section's data attribute
        else if (testSection.dataset.testId) {
            testId = testSection.dataset.testId;
            console.log('Using test ID from test section:', testId);
        }
        // Finally check localStorage
        else if (localStorage.getItem('currentTestId')) {
            testId = localStorage.getItem('currentTestId');
            console.log('Using test ID from localStorage:', testId);
            
            // Try to restore the full test data
            try {
                const savedTestData = localStorage.getItem('currentTestData');
                if (savedTestData) {
                    currentTest = JSON.parse(savedTestData);
                    console.log('Restored test data from localStorage:', currentTest);
                }
            } catch (e) {
                console.warn('Could not restore test data from localStorage:', e);
            }
        }
        
        if (!testId) {
            throw new Error('Test ID could not be determined. Please try again.');
        }
        
        // Show loading indicator
        showNotification('Submitting test...', 'info');
        
        const answers = [];
        const questionCards = document.querySelectorAll('.question-card');
        
        if (questionCards.length === 0) {
            throw new Error('No questions found. Please try again.');
        }
        
        questionCards.forEach(card => {
            const questionId = parseInt(card.dataset.questionId);
            const questionType = card.dataset.questionType;
            
            if (!questionId || isNaN(questionId)) {
                console.warn('Invalid question ID:', card.dataset.questionId);
                return;
            }
            
            const answer = {
                question_id: questionId,
                selected_choice_ids: [],
                text_answer: ''
            };
            
            try {
                if (questionType === 'multiple_choice') {
                    const checkedChoices = card.querySelectorAll('input[type="checkbox"]:checked');
                    answer.selected_choice_ids = Array.from(checkedChoices)
                        .map(choice => parseInt(choice.value))
                        .filter(id => !isNaN(id));
                } else if (questionType === 'single_choice') {
                    const selectedChoice = card.querySelector('input[type="radio"]:checked');
                    if (selectedChoice) {
                        const choiceId = parseInt(selectedChoice.value);
                        if (!isNaN(choiceId)) {
                            answer.selected_choice_ids = [choiceId];
                        }
                    }
                } else if (questionType === 'text') {
                    const textArea = card.querySelector('textarea');
                    if (textArea) {
                        answer.text_answer = textArea.value.trim();
                    }
                }
                
                answers.push(answer);
            } catch (err) {
                console.error(`Error processing question ${questionId}:`, err);
            }
        });
        
        if (answers.length === 0) {
            throw new Error('No answers collected. Please try again.');
        }
        
        console.log('Submitting answers:', answers);
        console.log('Test ID:', testId);
        
        const response = await fetchWithAuth(`${API_BASE_URL}/api/v1/submissions/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                test: parseInt(testId),
                answers: answers
            })
        });
        
        console.log('Submission response:', response);
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Invalid response from server. Please try again.');
        }
        
        const data = await response.json();
        console.log('Submission data:', data);
        
        if (!response.ok) {
            throw new Error(data.detail || 'Failed to submit test. Please try again.');
        }
        
        // Clear stored test data
        localStorage.removeItem('currentTestId');
        localStorage.removeItem('currentTestData');
        currentTest = null;
        testSection.dataset.testId = '';
        
        showNotification('Test submitted successfully!', 'success');
        
        // Get the submission ID from the response
        const submissionId = data.id;
        if (!submissionId) {
            throw new Error('No submission ID returned. Please check your submissions.');
        }
        
        await loadSubmissionResult(submissionId);
        
    } catch (error) {
        console.error('Submit test error:', error);
        showNotification(error.message || 'Failed to submit test', 'error');
        // Don't automatically return to dashboard, let the user try again
    }
}

async function loadSubmissionResult(submissionId) {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/v1/submissions/${submissionId}/`);
        
        if (!response.ok) {
            throw new Error('Failed to load submission results');
        }
        
        const submission = await response.json();
        
        // Display results
        document.getElementById('test-score').textContent = submission.score ? `${submission.score}%` : 'Pending';
        document.getElementById('test-status').textContent = submission.status;
        
        // Hide test section and show results
        hideAllSections();
        resultSection.classList.remove('hidden');
        
        // Reload submissions list in the background
        loadSubmissions();
    } catch (error) {
        showNotification('Failed to load test results', 'error');
    }
}

// Submissions Functions
async function loadSubmissions() {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/v1/submissions/`);
        
        if (!response.ok) {
            throw new Error('Failed to load submissions');
        }
        
        const data = await response.json();
        
        const submissionsContainer = document.getElementById('submissions-list');
        submissionsContainer.innerHTML = '';
        
        if (data.results.length === 0) {
            submissionsContainer.innerHTML = '<p>No submissions yet.</p>';
            return;
        }
        
        data.results.forEach(submission => {
            const submissionCard = document.createElement('div');
            submissionCard.className = 'card';
            
            const startedDate = new Date(submission.started_at).toLocaleString();
            const completedDate = submission.completed_at ? new Date(submission.completed_at).toLocaleString() : 'In Progress';
            
            submissionCard.innerHTML = `
                <div class="card-title">Test: ${submission.test}</div>
                <div class="card-content">
                    <p>Status: <span class="status-${submission.status.toLowerCase()}">${submission.status}</span></p>
                    <p>Score: ${submission.score ? `${submission.score}%` : 'Pending'}</p>
                    <p>Started: ${startedDate}</p>
                    <p>Completed: ${completedDate}</p>
                </div>
                <div class="card-footer">
                    <button class="btn primary view-submission-btn" data-submission-id="${submission.id}">View Details</button>
                </div>
            `;
            
            submissionsContainer.appendChild(submissionCard);
            
            // Add event listener to view submission button
            submissionCard.querySelector('.view-submission-btn').addEventListener('click', () => {
                loadSubmissionResult(submission.id);
            });
        });
    } catch (error) {
        showNotification('Failed to load submissions', 'error');
    }
}

// Test Creation Functions
function addQuestionField() {
    const questionsContainer = document.getElementById('questions-container');
    const questionIndex = questionsContainer.children.length + 1;
    
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question-field';
    questionDiv.innerHTML = `
        <h4>Question ${questionIndex}</h4>
        <div class="form-group">
            <label for="question-text-${questionIndex}">Question Text</label>
            <input type="text" id="question-text-${questionIndex}" required>
        </div>
        <div class="form-group">
            <label for="question-type-${questionIndex}">Question Type</label>
            <select id="question-type-${questionIndex}" class="question-type" data-index="${questionIndex}" required>
                <option value="single_choice">Single Choice</option>
                <option value="multiple_choice">Multiple Choice</option>
                <option value="text">Text Answer</option>
            </select>
        </div>
        <div class="form-group">
            <label for="question-points-${questionIndex}">Points</label>
            <input type="number" id="question-points-${questionIndex}" min="1" value="1" required>
        </div>
        <div class="choices-container" id="choices-container-${questionIndex}">
            <h5>Choices</h5>
            <div class="choice-fields" id="choice-fields-${questionIndex}">
                <div class="choice-field">
                    <input type="text" placeholder="Choice text" class="choice-text">
                    <label>
                        <input type="checkbox" class="is-correct"> Correct
                    </label>
                </div>
                <div class="choice-field">
                    <input type="text" placeholder="Choice text" class="choice-text">
                    <label>
                        <input type="checkbox" class="is-correct"> Correct
                    </label>
                </div>
            </div>
            <button type="button" class="btn secondary add-choice-btn" data-index="${questionIndex}">Add Choice</button>
        </div>
        <hr>
    `;
    
    questionsContainer.appendChild(questionDiv);
    
    // Add event listeners for question type change
    const questionTypeSelect = questionDiv.querySelector('.question-type');
    questionTypeSelect.addEventListener('change', function() {
        const choicesContainer = document.getElementById(`choices-container-${this.dataset.index}`);
        if (this.value === 'text') {
            choicesContainer.style.display = 'none';
        } else {
            choicesContainer.style.display = 'block';
        }
    });
    
    // Add event listener for add choice button
    const addChoiceBtn = questionDiv.querySelector('.add-choice-btn');
    addChoiceBtn.addEventListener('click', function() {
        const choiceFields = document.getElementById(`choice-fields-${this.dataset.index}`);
        const choiceField = document.createElement('div');
        choiceField.className = 'choice-field';
        choiceField.innerHTML = `
            <input type="text" placeholder="Choice text" class="choice-text">
            <label>
                <input type="checkbox" class="is-correct"> Correct
            </label>
        `;
        choiceFields.appendChild(choiceField);
    });
}

async function handleCreateTest(e) {
    e.preventDefault();
    
    const title = document.getElementById('test-title').value;
    const description = document.getElementById('test-description').value;
    const subject = document.getElementById('test-subject').value;
    const timeLimit = document.getElementById('test-time-limit').value;
    const isActive = document.getElementById('test-active').checked;
    
    try {
        // Create test
        const testResponse = await fetchWithAuth(`${API_BASE_URL}/api/v1/tests/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title,
                description,
                subject,
                time_limit: timeLimit,
                is_active: isActive
            })
        });
        
        if (!testResponse.ok) {
            throw new Error('Failed to create test');
        }
        
        const testData = await testResponse.json();
        
        // Add questions
        const questionFields = document.querySelectorAll('.question-field');
        
        for (const questionField of questionFields) {
            const index = Array.from(questionFields).indexOf(questionField) + 1;
            const text = document.getElementById(`question-text-${index}`).value;
            const questionType = document.getElementById(`question-type-${index}`).value;
            const points = document.getElementById(`question-points-${index}`).value;
            
            const questionData = {
                text,
                question_type: questionType,
                points,
                order: index,
                choices: []
            };
            
            // Add choices if not a text question
            if (questionType !== 'text') {
                const choiceFields = questionField.querySelectorAll('.choice-field');
                
                choiceFields.forEach(choiceField => {
                    const choiceText = choiceField.querySelector('.choice-text').value;
                    const isCorrect = choiceField.querySelector('.is-correct').checked;
                    
                    if (choiceText) {
                        questionData.choices.push({
                            text: choiceText,
                            is_correct: isCorrect
                        });
                    }
                });
            }
            
            // Create question
            const questionResponse = await fetchWithAuth(`${API_BASE_URL}/api/v1/tests/${testData.id}/questions/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(questionData)
            });
            
            if (!questionResponse.ok) {
                throw new Error(`Failed to create question ${index}`);
            }
        }
        
        showNotification('Test created successfully!', 'success');
        
        // Reset form
        document.getElementById('create-test-form').reset();
        document.getElementById('questions-container').innerHTML = '';
        
        // Reload tests
        loadTests();
        
        // Switch to tests tab
        document.querySelector('.tab-btn[data-tab="tests"]').click();
    } catch (error) {
        showNotification('Failed to create test: ' + error.message, 'error');
    }
}

// UI Helper Functions
function cleanupTest() {
    if (testTimer) {
        clearInterval(testTimer);
        testTimer = null;
    }
    currentTest = null;
}

function hideAllSections() {
    cleanupTest();
    authSection.classList.add('hidden');
    dashboardSection.classList.add('hidden');
    testSection.classList.add('hidden');
    resultSection.classList.add('hidden');
}

function showDashboard() {
    hideAllSections();
    dashboardSection.classList.remove('hidden');
}

function showAuthSection() {
    hideAllSections();
    authSection.classList.remove('hidden');
    userNameElement.textContent = '';
    logoutBtn.classList.add('hidden');
}

function showNotification(message, type) {
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 5000);
}

// Initialize the app
init();