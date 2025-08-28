// ========== SOLTHRON EXTENSION - MAGIC PILL INTEGRATED ==========

// Global variables
let shadowRoot;
let button;
let outputText;
let selectedMode;
let solthronContainer;
let currentCategory = null;
let activeNoteId = null;
let isStarActive = false;
let isButtonVisible = true;
let pageCredits = null;

// ========== MAGIC PILL VARIABLES ==========
let autoModeEnabled = true; // ✅ FIX: Always enabled by default
let magicPillIcon = null;
let currentInputField = null;
let lastMagicPillClick = 0;
const MAGIC_PILL_COOLDOWN = 2000; // 2 seconds cooldown


// ========== FILE & CODE ANALYSIS VARIABLES ==========
let codeAnalysisEnabled = true; // Always enabled for code detection
let lastCodeAnalysis = 0;
let codeAnalysisNotification = null;
const CODE_ANALYSIS_COOLDOWN = 5000; // 5 seconds cooldown between code analyses
let fileAnalysisEnabled = true; // Always enabled for all file types
let pdfAnalysisEnabled = true; // Always enabled
let currentlyAttachedFile = null;
let fileAnalysisNotification = null;
let lastFileProcessed = null;
const PDF_ANALYSIS_COOLDOWN = 3000; // 3 seconds cooldown between file analyses

// ✨ Double-click animation function
function triggerDoubleClickAnimation() {
    const solthronButton = shadowRoot.querySelector('.solthron-button');
    
    if (!solthronButton) return;
    
    solthronButton.classList.remove('double-click-activated');
    solthronButton.offsetHeight; // Force reflow
    solthronButton.classList.add('double-click-activated');
    
    setTimeout(() => {
        solthronButton.classList.remove('double-click-activated');
    }, 600);
}

// Loading Bar Helper Functions
function showShimmerLoading(message) {
    outputText.classList.remove('placeholder', 'error');
    outputText.classList.add('shimmer-loading');
    outputText.textContent = message;
}

function hideShimmerLoading() {
    outputText.classList.remove('shimmer-loading');
}

// Feature-to-credit mapping function
function getFeatureCredits(mode) {
    const explainModes = ['explain_meaning', 'explain_story', 'explain_eli5'];
    const aiAssistantModes = ['smart_followups']
    const imageModes = ['image_prompt']; // Removed image_caption
    const freeModes = ['save_note', 'save_prompt', 'save_persona'];
    const magicPillModes = ['magic_pill_enhance'];
    const fileAnalysisModes = ['pdf_analysis', 'excel_analysis', 'image_analysis', 'code_analysis']; // UPDATED: Added code_analysis
    
    if (explainModes.includes(mode)) return 5;
    if (aiAssistantModes.includes(mode)) return 15;
    if (imageModes.includes(mode)) return 12;
    if (freeModes.includes(mode)) return 0;
    if (magicPillModes.includes(mode)) return 10;
    if (fileAnalysisModes.includes(mode)) return 5; // 5 credits for all file/code analysis
    
    return 6;
}

// ========== PLATFORM DETECTION ==========
function detectAIPlatform() {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    
    if (hostname.includes('chatgpt.com') || hostname.includes('chat.openai.com')) {
        return 'chatgpt';
    } else if (hostname.includes('claude.ai')) {
        return 'claude';
    } else if (hostname.includes('gemini.google.com') || hostname.includes('bard.google.com')) {
        return 'gemini';
    } else if (hostname.includes('chat.deepseek.com')) {
        return 'deepseek';
    } else if (hostname.includes('grok.x.com') || (hostname.includes('x.com') && pathname.includes('grok'))) {
        return 'grok';
    } else if (hostname.includes('perplexity.ai')) {
        return 'perplexity';
    }
    return 'unknown';
}

// ========== CURSOR POSITION UTILITIES ==========
function getCursorPosition(element) {
    try {
        if (element.tagName === 'TEXTAREA') {
            return getCursorPositionTextarea(element);
        } else {
            return getCursorPositionContentEditable(element);
        }
    } catch (error) {
        console.warn('Error getting cursor position:', error);
        return null;
    }
}

function getCursorPositionContentEditable(element) {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return null;
    
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // If range has no width/height, it's probably collapsed at cursor
    if (rect.width === 0 && rect.height === 0) {
        return {
            x: rect.left,
            y: rect.top,
            height: rect.height || 20 // fallback height
        };
    }
    
    // For text selection, use the end of the range
    const endRange = range.cloneRange();
    endRange.collapse(false);
    const endRect = endRange.getBoundingClientRect();
    
    return {
        x: endRect.left,
        y: endRect.top,
        height: endRect.height || 20
    };
}

function getCursorPositionTextarea(element) {
    const selectionStart = element.selectionStart;
    const text = element.value.substring(0, selectionStart);
    
    // Create a temporary element to measure text
    const measurer = createTextMeasurer(element);
    const position = measureTextPosition(measurer, text, element);
    
    // Clean up
    document.body.removeChild(measurer);
    
    return position;
}

function createTextMeasurer(textarea) {
    const measurer = document.createElement('div');
    const style = window.getComputedStyle(textarea);
    const platform = detectAIPlatform();
    
    // Base styling that works for all platforms
    let measurerCSS = `
        position: absolute;
        visibility: hidden;
        height: auto;
        width: ${textarea.offsetWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)}px;
        font: ${style.font};
        font-family: ${style.fontFamily};
        font-size: ${style.fontSize};
        font-weight: ${style.fontWeight};
        line-height: ${style.lineHeight};
        letter-spacing: ${style.letterSpacing};
        white-space: pre-wrap;
        word-wrap: break-word;
        padding: ${style.paddingTop} ${style.paddingRight} ${style.paddingBottom} ${style.paddingLeft};
        border: ${style.border};
        box-sizing: ${style.boxSizing};
        z-index: -1;
    `;
    
    // Platform-specific positioning
    if (platform === 'deepseek' || platform === 'grok') {
        // For DeepSeek and Grok, position the measurer element exactly over the textarea
        const rect = textarea.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        measurerCSS += `
            top: ${rect.top + scrollTop}px;
            left: ${rect.left + scrollLeft}px;
        `;
    } else {
        // For other platforms, use the original positioning (off-screen)
        measurerCSS += `
            top: -9999px;
            left: -9999px;
        `;
    }
    
    measurer.style.cssText = measurerCSS;
    document.body.appendChild(measurer);
    return measurer;
}

function measureTextPosition(measurer, text, textarea) {
    // Add text up to cursor position
    measurer.textContent = text;
    
    // Add a marker span at the end to get cursor position
    const marker = document.createElement('span');
    marker.textContent = '|';
    measurer.appendChild(marker);
    
    const textareaRect = textarea.getBoundingClientRect();
    const markerRect = marker.getBoundingClientRect();
    const measurerRect = measurer.getBoundingClientRect();
    
    // Platform-specific coordinate calculation
    const platform = detectAIPlatform();
    
    if (platform === 'deepseek' || platform === 'grok') {
        // DeepSeek and Grok need special coordinate handling
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        // Calculate relative position within measurer, then translate to textarea coordinates
        const relativeX = markerRect.left - measurerRect.left;
        const relativeY = markerRect.top - measurerRect.top;
        
        return {
            x: textareaRect.left + relativeX,
            y: textareaRect.top + relativeY,
            height: markerRect.height || 20
        };
    } else {
        // Original logic for other platforms (ChatGPT, Claude, Gemini)
        return {
            x: markerRect.left,
            y: markerRect.top,
            height: markerRect.height || 20
        };
    }
}

// ========== MAGIC PILL FUNCTIONS ==========
function initializeMagicPill() {
    const platform = detectAIPlatform();
    console.log('🔍 Platform detected:', platform);
    
    if (platform === 'unknown') {
        console.log('❌ Not on a supported AI platform');
        return;
    }
    
    if (!autoModeEnabled) {
        console.log('❌ Auto mode not enabled');
        removeMagicPill();
        return;
    }
    
    console.log('✅ Initializing magic pill for', platform);
    monitorInputField(platform);
}

function monitorInputField(platform) {
    const findAndMonitorInput = () => {
        let inputField = null;
        
        // Platform-specific selectors
        const selectors = {
            chatgpt: [
                '#prompt-textarea',
                'textarea[data-id="root"]',
                'textarea[placeholder*="Send"]',
                'textarea[placeholder*="Message"]',
                'div[contenteditable="true"]'
            ],
            claude: [
                'div.ProseMirror[contenteditable="true"]',
                'div[contenteditable="true"][data-placeholder]',
                'div[contenteditable="true"]'
            ],
            gemini: [
                '.ql-editor[contenteditable="true"]',
                'div[contenteditable="true"][aria-label*="message"]',
                'div[contenteditable="true"]',
                'rich-textarea .ql-editor'
            ],
            deepseek: [
                'textarea[placeholder*="Message"]',
                'textarea.chat-input',
                'div[contenteditable="true"]',
                'textarea'
            ],
            grok: [
                'textarea[placeholder*="Enter"]',
                'textarea[placeholder*="Message"]',
                'textarea[placeholder*="Type"]',
                'div[contenteditable="true"]',
                'textarea.input',
                'textarea',
                '#chat-input',
                '.chat-input'
            ]
        };
        
        const platformSelectors = selectors[platform] || [];
        
        for (const selector of platformSelectors) {
            const elements = document.querySelectorAll(selector);
            for (const el of elements) {
                // Check if this is likely the main input field
                const rect = el.getBoundingClientRect();
                const style = window.getComputedStyle(el);
                
                // Enhanced checks for visibility and usability
                if (rect.width > 200 && 
                    rect.height > 20 && 
                    style.display !== 'none' && 
                    style.visibility !== 'hidden' &&
                    !el.disabled &&
                    !el.readOnly) {
                    
                    inputField = el;
                    console.log('✅ Found input field:', selector);
                    break;
                }
            }
            if (inputField) break;
        }
        
        // ✅ FIX: Always check if we need to attach to a new field
        if (inputField && inputField !== currentInputField) {
            console.log('🔄 New input field detected, switching attachment');
            currentInputField = inputField;
            attachMagicPillToInput(inputField);
        } else if (!inputField && currentInputField) {
            console.log('⚠️ Input field lost, clearing current reference');
            currentInputField = null;
            hideMagicPill();
        }
    };
    
    // Initial check
    findAndMonitorInput();
    
    // ✅ FIX: Less aggressive monitoring for ChatGPT to avoid icon conflicts
    const platformMonitoringIntervals = {
        claude: 1500,     // Claude recreates input after responses
        gemini: 1500,     // Gemini also recreates input
        deepseek: 1500,   // DeepSeek recreates input
        chatgpt: 4000,    // ✅ FIX: Slower for ChatGPT to avoid icon conflicts
        grok: 2000        // Grok moderate recreation
    };
    
    const monitorInterval = platformMonitoringIntervals[platform] || 2000;
    
    // ✅ FIX: Only aggressive monitoring for non-ChatGPT platforms
    if (platform !== 'chatgpt') {
        const platformMonitor = setInterval(() => {
            if (autoModeEnabled) {
                findAndMonitorInput();
            }
        }, monitorInterval);
        
        // Store interval for cleanup if needed
        window[`solthron${platform}Monitor`] = platformMonitor;
    } else {
        // Gentler monitoring for ChatGPT
        console.log('🎯 Using gentle monitoring for ChatGPT to preserve icon');
    }
    
    // ✅ FIX: Enhanced mutation observer that catches input field changes
    const inputObserver = new MutationObserver((mutations) => {
        if (!autoModeEnabled) return;
        
        let shouldCheck = false;
        mutations.forEach(mutation => {
            // Check for new input-related elements
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Element node
                        // Check if the added node contains input fields
                        if (node.querySelector && (
                            node.querySelector('textarea') ||
                            node.querySelector('[contenteditable="true"]') ||
                            node.matches && (
                                node.matches('textarea') ||
                                node.matches('[contenteditable="true"]')
                            )
                        )) {
                            shouldCheck = true;
                        }
                    }
                });
            }
        });
        
        if (shouldCheck) {
            console.log('🔄 Input-related DOM change detected');
            setTimeout(findAndMonitorInput, 300);
        }
    });
    
    inputObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// ✅ FIX: Enhanced attachment that handles field replacement
function attachMagicPillToInput(inputField) {
    console.log('📎 Attaching magic pill to input field');
    
    // ✅ FIX: Always remove existing listeners first (even if field is different)
    if (currentInputField && currentInputField !== inputField) {
        try {
            currentInputField.removeEventListener('input', handleInputChange);
            currentInputField.removeEventListener('focus', handleInputFocus);
            currentInputField.removeEventListener('blur', handleInputBlur);
            currentInputField.removeEventListener('keyup', handleCursorMove);
            currentInputField.removeEventListener('click', handleCursorMove);
            currentInputField.removeEventListener('keydown', handleKeyboardShortcut);
            console.log('🧹 Cleaned up old input field listeners');
        } catch (error) {
            console.log('⚠️ Error cleaning up old listeners (field might be removed):', error.message);
        }
    }
    
    // Add listeners to new field
    try {
        inputField.addEventListener('input', handleInputChange);
        inputField.addEventListener('focus', handleInputFocus);
        inputField.addEventListener('blur', handleInputBlur);
        inputField.addEventListener('keyup', handleCursorMove);
        inputField.addEventListener('click', handleCursorMove);
        inputField.addEventListener('keydown', handleKeyboardShortcut);
        console.log('✅ Magic pill attached to new input field');
    } catch (error) {
        console.error('❌ Failed to attach magic pill listeners:', error);
    }
}

let inputDebounceTimer = null;
let cursorMoveTimer = null;

function handleInputChange(e) {
    if (!autoModeEnabled) return;
    
    // Clear previous timer
    if (inputDebounceTimer) {
        clearTimeout(inputDebounceTimer);
    }
    
    // Debounce input changes
    inputDebounceTimer = setTimeout(() => {
        const text = getInputText(e.target);
        
        if (text.trim().length > 0) {
            showMagicPill(e.target);
        } else {
            hideMagicPill();
        }
    }, 300);
}

function handleKeyboardShortcut(e) {
    if (!autoModeEnabled) return;
    
    // Check for Ctrl+Shift+Enter
    if (e.ctrlKey && e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        
        // Only trigger if magic pill is visible and there's text
        const text = getInputText(e.target);
        if (text.trim().length > 0 && magicPillIcon && magicPillIcon.style.display !== 'none') {
            console.log('⌨️ Keyboard shortcut triggered (Ctrl+Shift+Enter)');
            
            // Create a synthetic event object for handleMagicPillClick
            const syntheticEvent = {
                preventDefault: () => {},
                stopPropagation: () => {}
            };
            
            // Trigger the same logic as clicking the magic pill
            handleMagicPillClick(syntheticEvent);
        }
    }
}

function handleCursorMove(e) {
    if (!autoModeEnabled) return;
    
    // Clear previous timer
    if (cursorMoveTimer) {
        clearTimeout(cursorMoveTimer);
    }
    
    // Debounce cursor movements
    cursorMoveTimer = setTimeout(() => {
        const text = getInputText(e.target);
        if (text.trim().length > 0 && magicPillIcon && magicPillIcon.style.display !== 'none') {
            positionMagicPillAtCursor(e.target);
        }
    }, 100);
}

function handleInputFocus(e) {
    if (!autoModeEnabled) return;
    
    const text = getInputText(e.target);
    if (text.trim().length > 0) {
        showMagicPill(e.target);
    }
}

function handleInputBlur(e) {
    setTimeout(() => {
        if (!magicPillIcon?.matches(':hover')) {
            hideMagicPill();
        }
    }, 200);
}

function getInputText(element) {
    // Handle both textarea and contenteditable
    if (element.tagName === 'TEXTAREA') {
        return element.value || '';
    } else {
        return element.innerText || element.textContent || '';
    }
}

function setInputText(element, text) {
    const platform = detectAIPlatform();
    
    if (element.tagName === 'TEXTAREA') {
        element.value = text;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
        // For contenteditable
        element.innerText = text;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        
        // Platform-specific event triggers
        if (platform === 'claude') {
            // Claude uses ProseMirror
            element.dispatchEvent(new InputEvent('beforeinput', { bubbles: true }));
            element.dispatchEvent(new InputEvent('input', { bubbles: true }));
        } else if (platform === 'gemini') {
            // Gemini might use Quill editor
            element.dispatchEvent(new Event('textInput', { bubbles: true }));
        }
    }
    
    // Set focus and move cursor to end
    element.focus();
    
    if (element.tagName !== 'TEXTAREA') {
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(element);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
    }
}

function showMagicPill(inputField) {
    if (!magicPillIcon) {
        createMagicPillIcon();
    }
    
    positionMagicPillAtCursor(inputField);
    
    magicPillIcon.style.display = 'flex';
    setTimeout(() => {
        magicPillIcon.style.opacity = '1';
        magicPillIcon.style.transform = 'scale(1)';
    }, 10);
}

function initializeFileAnalysis() {
    const platform = detectAIPlatform();
    console.log('📄 Initializing File Analysis (PDF, Excel & Images) for:', platform);
    
    if (platform === 'unknown') {
        console.log('❌ Platform not supported for file analysis');
        return;
    }
    
    if (!fileAnalysisEnabled) {
        console.log('❌ File analysis not enabled');
        return;
    }
    
    console.log('✅ Setting up file upload detection (PDF, Excel & Images)');
    monitorFileUploads(platform);
}

function initializeCodeAnalysis() {
    const platform = detectAIPlatform();
    console.log('💻 Initializing Code Analysis for:', platform);
    
    if (platform === 'unknown') {
        console.log('❌ Platform not supported for code analysis');
        return;
    }
    
    if (!codeAnalysisEnabled) {
        console.log('❌ Code analysis not enabled');
        return;
    }
    
    console.log('✅ Setting up code detection in input fields');
    monitorCodeInput(platform);
}

function monitorCodeInput(platform) {
    console.log(`🔍 Starting code input monitoring for ${platform}`);
    
    // Monitor input changes for code detection
    let codeDetectionTimer = null;
    
    function handleInputForCodeDetection(inputElement) {
        // Clear existing timer
        if (codeDetectionTimer) {
            clearTimeout(codeDetectionTimer);
        }
        
        // Debounce - wait 3 seconds after user stops typing
        codeDetectionTimer = setTimeout(() => {
            const content = getInputText(inputElement);
            if (content && content.trim().length > 50) { // Minimum length for code detection
                analyzeForCode(content, inputElement, platform);
            }
        }, 3000);
    }
    
    // Monitor magic pill input field if available
    if (currentInputField) {
        console.log('📎 Adding code detection to magic pill input field');
        currentInputField.addEventListener('input', () => handleInputForCodeDetection(currentInputField));
        currentInputField.addEventListener('paste', () => {
            // Handle paste events with slight delay to get pasted content
            setTimeout(() => handleInputForCodeDetection(currentInputField), 100);
        });
    }
    
    // Also monitor common input selectors across platforms
    const inputSelectors = {
        chatgpt: ['#prompt-textarea', 'textarea[data-id="root"]', 'div[contenteditable="true"]'],
        claude: ['div.ProseMirror[contenteditable="true"]', 'div[contenteditable="true"]'],
        gemini: ['.ql-editor[contenteditable="true"]', 'div[contenteditable="true"]'],
        deepseek: ['textarea[placeholder*="Message"]', 'div[contenteditable="true"]'],
        grok: ['textarea', 'div[contenteditable="true"]']
    };
    
    const platformSelectors = inputSelectors[platform] || ['textarea', 'div[contenteditable="true"]'];
    
    for (const selector of platformSelectors) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            // Check if already monitored
            if (!element.hasAttribute('data-solthron-code-monitored')) {
                element.addEventListener('input', () => handleInputForCodeDetection(element));
                element.addEventListener('paste', () => {
                    setTimeout(() => handleInputForCodeDetection(element), 100);
                });
                element.setAttribute('data-solthron-code-monitored', 'true');
                console.log('📎 Added code detection to input element:', selector);
            }
        });
    }
    
    console.log('✅ Code input monitoring initialized');
}

function analyzeForCode(content, inputElement, platform) {
    // Check cooldown
    const now = Date.now();
    if (now - lastCodeAnalysis < CODE_ANALYSIS_COOLDOWN) {
        console.log('⏱️ Code analysis cooldown active');
        return;
    }
    
    // NEW: Check if content contains our analysis prompts (to prevent notification loop)
    const analysisIndicators = [
        'debug and troubleshoot this code',
        'analyze this code for bugs',
        'optimize this code for performance',
        'convert this code to',
        'provide a detailed line-by-line explanation',
        'generate comprehensive test cases',
        'perform comprehensive debugging analysis',
        'enhance code performance and documentation'
    ];
    
    const contentLower = content.toLowerCase();
    const hasAnalysisPrompt = analysisIndicators.some(indicator => contentLower.includes(indicator));
    
    if (hasAnalysisPrompt) {
        console.log('📝 Content contains analysis prompt - skipping code detection to prevent loop');
        return;
    }
    
    const codeAnalysis = detectCodeContent(content);
    
    if (codeAnalysis.isCode) {
        console.log('💻 Code detected:', codeAnalysis.language, 'confidence:', codeAnalysis.confidence);
        console.log('📝 Code preview:', content.substring(0, 100) + '...');
        
        lastCodeAnalysis = now;
        
        // Show code analysis notification
        showCodeAnalysisNotification(codeAnalysis, content.length, platform);
    } else {
        console.log('📝 Content not detected as code (confidence:', codeAnalysis.confidence + ')');
    }
}

function detectCodeContent(content) {
    const text = content.toLowerCase().trim();
    let codeScore = 0;
    let detectedLanguage = 'unknown';
    
    // Programming language keywords and patterns
    const languagePatterns = {
        javascript: ['function', 'const', 'let', 'var', '=>', 'console.log', 'document.', 'window.', '.js', 'react', 'node'],
        python: ['def ', 'import ', 'from ', 'class ', '__init__', 'print(', 'if __name__', '.py', 'django', 'flask'],
        java: ['public class', 'public static', 'private ', 'protected ', 'import java', '.java', 'system.out'],
        cpp: ['#include', 'iostream', 'std::', 'cout', 'cin', 'int main', '.cpp', '.h'],
        csharp: ['using system', 'public class', 'private ', 'public ', 'namespace ', '.cs', 'console.write'],
        php: ['<?php', '<?=', '$_', 'echo ', 'function ', '.php', '->'],
        ruby: ['def ', 'end', 'class ', '.rb', 'puts ', 'require '],
        go: ['package ', 'import ', 'func ', 'fmt.', '.go'],
        rust: ['fn ', 'let ', 'mut ', 'impl ', 'struct ', '.rs'],
        swift: ['func ', 'var ', 'let ', 'import ', '.swift', 'println'],
        kotlin: ['fun ', 'val ', 'var ', 'class ', '.kt'],
        html: ['<html', '<div', '<body', '<head', '</div>', '</body>', '.html'],
        css: ['{', '}', ':', ';', 'color:', 'background:', '.css', '@media'],
        sql: ['select ', 'from ', 'where ', 'insert ', 'update ', 'delete ', 'create table'],
        bash: ['#!/bin/bash', 'echo ', 'cd ', 'ls ', 'grep ', '.sh']
    };
    
    // Check for language-specific patterns
    for (const [language, patterns] of Object.entries(languagePatterns)) {
        let languageScore = 0;
        for (const pattern of patterns) {
            if (text.includes(pattern.toLowerCase())) {
                languageScore += 2;
                codeScore += 1;
            }
        }
        
        if (languageScore > 4 && languageScore > codeScore - languageScore) {
            detectedLanguage = language;
        }
    }
    
    // General code indicators
    const codeIndicators = [
        { pattern: /\{[\s\S]*\}/g, weight: 3 }, // Braces
        { pattern: /\([\s\S]*\)/g, weight: 2 }, // Parentheses
        { pattern: /;/g, weight: 1 }, // Semicolons
        { pattern: /\n\s{2,}/g, weight: 2 }, // Indentation
        { pattern: /\/\*[\s\S]*?\*\//g, weight: 2 }, // Block comments
        { pattern: /\/\/.*$/gm, weight: 2 }, // Line comments
        { pattern: /#.*$/gm, weight: 1 }, // Hash comments
        { pattern: /\[[\s\S]*?\]/g, weight: 2 }, // Brackets
        { pattern: /=>/g, weight: 2 }, // Arrow functions
        { pattern: /\w+\(/g, weight: 2 }, // Function calls
        { pattern: /\w+\.\w+/g, weight: 2 }, // Object properties
    ];
    
    // Check general code patterns
    for (const { pattern, weight } of codeIndicators) {
        const matches = content.match(pattern);
        if (matches) {
            codeScore += matches.length * weight;
        }
    }
    
    // Line count bonus for structured content
    const lines = content.split('\n');
    if (lines.length > 5) {
        codeScore += 2;
    }
    
    // Calculate confidence (normalize score)
    const confidence = Math.min(codeScore / 20, 1); // Scale to 0-1
    
    // Determine if it's code (confidence > 0.3)
    const isCode = confidence > 0.3;
    
    return {
        isCode,
        confidence,
        language: detectedLanguage,
        lineCount: lines.length,
        charCount: content.length
    };
}

function monitorFileUploads(platform) {
    console.log(`🔍 Starting file upload monitoring for ${platform}`);
    
    // Clean up any existing observers
    if (window.fileObserver) {
        window.fileObserver.disconnect();
    }
    
    // Create observer for file input changes and drag/drop areas
    const fileObserver = new MutationObserver((mutations) => {
        if (!pdfAnalysisEnabled) return;
        
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                // Check for new file input elements or upload indicators
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === 1) { // Element node
                        checkForFileElements(node, platform);
                    }
                }
            } else if (mutation.type === 'attributes') {
                // Check for file-related attribute changes
                if (mutation.target && mutation.target.tagName) {
                    checkForFileElements(mutation.target, platform);
                }
            }
        }
    });
    
    // Observe with comprehensive configuration
    fileObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'data-testid', 'aria-label']
    });
    
    // Store observer for cleanup
    window.fileObserver = fileObserver;
    
    // Also monitor for direct file input changes
    document.addEventListener('change', handleFileInputChange, true);
    
    console.log('✅ File upload monitoring initialized');
}

function checkForFileElements(element, platform) {
    if (!element.querySelector && !element.matches) return;
    
    // Platform-specific file upload selectors
    const fileSelectors = {
        chatgpt: ['input[type="file"]', '[data-testid*="file"]', '.file-upload', '[accept*="pdf"]'],
        claude: ['input[type="file"]', '[data-testid*="attachment"]', '.attachment', '.file-input'],
        gemini: ['input[type="file"]', '.upload-button', '[data-upload]', '.file-selector'],
        deepseek: ['input[type="file"]', '.upload', '.file-input'],
        grok: ['input[type="file"]', '.attach', '.upload-button']
    };
    
    const selectors = fileSelectors[platform] || ['input[type="file"]'];
    
    for (const selector of selectors) {
        let fileElement = null;
        
        // Check if element itself matches
        if (element.matches && element.matches(selector)) {
            fileElement = element;
        } else if (element.querySelector) {
            fileElement = element.querySelector(selector);
        }
        
        if (fileElement && fileElement.tagName === 'INPUT') {
            // Add event listener if not already added
            if (!fileElement.hasAttribute('data-solthron-monitored')) {
                fileElement.addEventListener('change', handleFileInputChange);
                fileElement.setAttribute('data-solthron-monitored', 'true');
                console.log('📎 Added file monitoring to input element');
            }
        }
    }
    
    // Also check for visual file upload indicators (like file names, upload progress)
    checkForUploadedFileIndicators(element, platform);
}

function checkForUploadedFileIndicators(element, platform) {
    // Look for elements that indicate a file has been uploaded
    const fileIndicatorPatterns = {
        chatgpt: ['.uploaded-file', '[data-testid*="uploaded"]', '.file-attachment'],
        claude: ['.attachment-item', '.uploaded-document', '.file-preview'],
        gemini: ['.file-chip', '.uploaded-item', '.attachment-preview'],
        deepseek: ['.file-item', '.attachment', '.uploaded-file'],
        grok: ['.attachment', '.file-preview', '.uploaded-document']
    };
    
    const patterns = fileIndicatorPatterns[platform] || ['.uploaded-file', '.file-attachment'];
    
    for (const pattern of patterns) {
        const uploadedElements = element.querySelectorAll ? element.querySelectorAll(pattern) : [];
        
        for (const uploadedElement of uploadedElements) {
            const text = uploadedElement.textContent || uploadedElement.getAttribute('aria-label') || '';
            
            // Check for PDF files
            if (text.toLowerCase().includes('.pdf') || text.toLowerCase().includes('pdf')) {
                const filename = extractFilename(text, 'pdf');
                if (filename && filename !== lastFileProcessed) {
                    console.log('📄 PDF file detected:', filename);
                    handleFileDetection(filename, uploadedElement, platform, 'pdf');
                }
            }
            
            // Check for Excel files
            else if (text.toLowerCase().includes('.xlsx') || text.toLowerCase().includes('.xls') || 
                     text.toLowerCase().includes('excel') || text.toLowerCase().includes('.csv')) {
                const filename = extractFilename(text, 'excel');
                if (filename && filename !== lastFileProcessed) {
                    console.log('📊 Excel file detected:', filename);
                    handleFileDetection(filename, uploadedElement, platform, 'excel');
                }
            }
            
            // Check for Image files
            else if (text.toLowerCase().includes('.jpg') || text.toLowerCase().includes('.jpeg') || 
                     text.toLowerCase().includes('.png') || text.toLowerCase().includes('.gif') || 
                     text.toLowerCase().includes('.webp') || text.toLowerCase().includes('.svg') ||
                     text.toLowerCase().includes('image') || text.toLowerCase().includes('picture')) {
                const filename = extractFilename(text, 'image');
                if (filename && filename !== lastFileProcessed) {
                    console.log('🖼️ Image file detected:', filename);
                    handleFileDetection(filename, uploadedElement, platform, 'image');
                }
            }
        }
    }
}

function handleFileInputChange(event) {
    const fileInput = event.target;
    const files = fileInput.files;
    
    if (!files || files.length === 0) return;
    
    for (const file of files) {
        // Check for PDF files
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            console.log('📄 PDF file selected:', file.name);
            handleFileDetection(file.name, fileInput, detectAIPlatform(), 'pdf', file.size);
        }
        // Check for Excel files
        else if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                 file.type === 'application/vnd.ms-excel' || 
                 file.type === 'text/csv' ||
                 file.name.toLowerCase().endsWith('.xlsx') || 
                 file.name.toLowerCase().endsWith('.xls') || 
                 file.name.toLowerCase().endsWith('.csv')) {
            console.log('📊 Excel file selected:', file.name);
            handleFileDetection(file.name, fileInput, detectAIPlatform(), 'excel', file.size);
        }
        // Check for Image files
        else if (file.type.startsWith('image/') ||
                 file.name.toLowerCase().endsWith('.jpg') ||
                 file.name.toLowerCase().endsWith('.jpeg') ||
                 file.name.toLowerCase().endsWith('.png') ||
                 file.name.toLowerCase().endsWith('.gif') ||
                 file.name.toLowerCase().endsWith('.webp') ||
                 file.name.toLowerCase().endsWith('.svg')) {
            console.log('🖼️ Image file selected:', file.name);
            handleFileDetection(file.name, fileInput, detectAIPlatform(), 'image', file.size);
        }
    }
}

function extractFilename(text, fileType) {
    // Try to extract filename from various text formats
    let patterns = [];
    
    if (fileType === 'pdf') {
        patterns = [
            /([^\s]+\.pdf)/i,  // filename.pdf
            /PDF.*?([^\s]+\.pdf)/i,  // "PDF: filename.pdf"
            /Uploaded.*?([^\s]+\.pdf)/i  // "Uploaded filename.pdf"
        ];
    } else if (fileType === 'excel') {
        patterns = [
            /([^\s]+\.xlsx)/i,  // filename.xlsx
            /([^\s]+\.xls)/i,   // filename.xls
            /([^\s]+\.csv)/i,   // filename.csv
            /Excel.*?([^\s]+\.xlsx?)/i,  // "Excel: filename.xlsx"
            /Uploaded.*?([^\s]+\.xlsx?)/i,  // "Uploaded filename.xlsx"
            /Uploaded.*?([^\s]+\.csv)/i   // "Uploaded filename.csv"
        ];
    } else if (fileType === 'image') {
        patterns = [
            /([^\s]+\.jpg)/i,   // filename.jpg
            /([^\s]+\.jpeg)/i,  // filename.jpeg
            /([^\s]+\.png)/i,   // filename.png
            /([^\s]+\.gif)/i,   // filename.gif
            /([^\s]+\.webp)/i,  // filename.webp
            /([^\s]+\.svg)/i,   // filename.svg
            /Image.*?([^\s]+\.(jpg|jpeg|png|gif|webp|svg))/i,  // "Image: filename.jpg"
            /Uploaded.*?([^\s]+\.(jpg|jpeg|png|gif|webp|svg))/i  // "Uploaded filename.png"
        ];
    }
    
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            return match[1];
        }
    }
    
    // Fallback: if text contains file type indicator, return a generic name
    if (fileType === 'pdf' && text.toLowerCase().includes('pdf')) {
        return 'document.pdf';
    } else if (fileType === 'excel' && (text.toLowerCase().includes('excel') || text.toLowerCase().includes('xlsx') || text.toLowerCase().includes('csv'))) {
        return 'spreadsheet.xlsx';
    } else if (fileType === 'image' && (text.toLowerCase().includes('image') || text.toLowerCase().includes('picture'))) {
        return 'image.jpg';
    }
    
    return null;
}

function handleFileDetection(filename, element, platform, fileType, fileSize = null) {
    // Check cooldown
    const now = Date.now();
    const cooldownKey = `${filename}_${platform}_${fileType}`;
    
    if (lastFileProcessed === cooldownKey) {
        console.log('⏱️ File already processed recently:', filename);
        return;
    }
    
    lastFileProcessed = cooldownKey;
    currentlyAttachedFile = {
        name: filename,
        size: fileSize,
        element: element,
        platform: platform,
        fileType: fileType,
        detectedAt: now
    };
    
    console.log(`🎯 Processing ${fileType.toUpperCase()} file for analysis options:`, filename);

    // Show appropriate analysis options
    if (fileType === 'pdf') {
    showPDFAnalysisNotification(filename, fileSize, platform);
    } else if (fileType === 'excel') {
    showExcelAnalysisNotification(filename, fileSize, platform);
    } else if (fileType === 'image') {
    showImageAnalysisNotification(filename, fileSize, platform);
    }
    
    // Show appropriate analysis options
    if (fileType === 'pdf') {
        showPDFAnalysisNotification(filename, fileSize, platform);
    } else if (fileType === 'excel') {
        showExcelAnalysisNotification(filename, fileSize, platform);
    }
}


function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString();
}

// ========== PDF FILE ANALYSIS FUNCTIONS ==========
function getPDFAnalysisPrompts() {
    return {
        summarize: [
            "Please analyze this PDF and create a comprehensive executive summary. Include: (1) Main purpose and scope, (2) Key findings or arguments, (3) Supporting evidence or data points, (4) Conclusions and implications, (5) Any recommendations or next steps mentioned. Structure with clear headings and bullet points for executive-level consumption.",
            
            "Break down this PDF document into a clear, structured summary. Focus on: the core message, most important details, critical insights, and actionable takeaways. Use a hierarchical format with main points and sub-points. Make it scannable for someone who needs to quickly understand the document's value.",
            
            "Create a detailed summary of this PDF that captures the essential information. Organize by: document overview, main themes, supporting details, key statistics or data mentioned, and practical implications. Write in a professional tone suitable for sharing with colleagues or stakeholders."
        ],
        
        extract_key_points: [
            "Extract the 8-10 most important key points from this PDF. For each point, provide: the main concept, supporting details, and why it matters. Format as a numbered list with brief explanations. Prioritize information that would be most valuable for decision-making or further research.",
            
            "Identify and list the crucial insights from this PDF document. Present each key point with: a clear headline, 2-3 sentences of explanation, and relevance to the overall topic. Focus on information that someone would highlight or bookmark for future reference.",
            
            "Analyze this PDF and distill it into essential key points. Structure each point with: the core concept, context within the document, and practical significance. Aim for 8-12 points that capture the document's most valuable information in an easily digestible format."
        ],
        
        highlight_action_items: [
            "Scan this PDF for actionable items and recommendations. Extract: specific tasks mentioned, implementation steps, deadlines or timelines, responsible parties (if mentioned), and measurable outcomes. Format as a prioritized action list with context for each item.",
            
            "Identify all action-oriented content in this PDF. Look for: explicit recommendations, suggested next steps, implementation guidelines, best practices to adopt, and measurable goals. Present as a structured action plan with clear, executable items.",
            
            "Extract actionable insights and recommendations from this PDF. Focus on: what should be done, how to do it, when to do it (if specified), and expected results. Organize by priority level and include any prerequisites or dependencies mentioned."
        ],
        
        all_above: [
            "Provide a comprehensive analysis of this PDF including: (1) Executive Summary with main points, (2) Key Insights with detailed explanations, (3) Action Items with implementation steps, and (4) Overall Assessment with recommendations. Structure with clear sections and bullet points for maximum usability.",
            
            "Complete analysis of this PDF document: Begin with a concise summary, then extract key findings with context, identify actionable recommendations, and conclude with implementation priorities. Format for easy scanning with headers, bullet points, and numbered lists where appropriate.",
            
            "Full document analysis including: Summary of main themes and conclusions, Critical insights with supporting evidence, Actionable recommendations with priority levels, and Strategic implications for implementation. Present in a structured format suitable for executive briefing or project planning."
        ]
    };
}

function getExcelAnalysisPrompts() {
    return {
        data_analysis_summary: [
            "Analyze this Excel spreadsheet and provide a comprehensive data overview. Include: (1) Dataset structure and column descriptions, (2) Key statistical summaries and trends, (3) Notable patterns, outliers, or anomalies, (4) Data quality assessment (missing values, duplicates), (5) Initial insights and observations. Structure with clear headings and highlight the most significant findings.",
            
            "Examine this Excel file and create a detailed data analysis summary. Focus on: dataset composition, statistical distributions, temporal trends (if applicable), categorical breakdowns, correlation patterns, and data integrity issues. Present findings in a structured format with actionable insights for further analysis.",
            
            "Provide a thorough analysis of this Excel data including: data structure overview, descriptive statistics for key metrics, trend identification across time periods or categories, outlier detection, missing data assessment, and preliminary insights. Format as an executive summary with bullet points for key findings."
        ],
        
        generate_formulas: [
            "Based on the structure and content of this Excel file, generate useful formulas that would enhance data analysis. Include: (1) Summary formulas (SUM, AVERAGE, COUNT variations), (2) Conditional formulas (IF, SUMIF, COUNTIF), (3) Lookup formulas (VLOOKUP, INDEX-MATCH), (4) Date/time calculations, (5) Data validation formulas. Provide the exact formula syntax with explanations for each.",
            
            "Create a comprehensive set of Excel formulas tailored to this dataset. Focus on: aggregation formulas for totals and averages, conditional logic for data categorization, lookup functions for data relationships, statistical formulas for analysis, and dynamic formulas for ongoing calculations. Include cell references and step-by-step implementation guidance.",
            
            "Generate practical Excel formulas optimized for this data structure. Provide: calculation formulas for key metrics, conditional formulas for data filtering and categorization, advanced lookup formulas for cross-referencing, time-based calculations for trends, and data validation formulas. Each formula should include syntax, purpose, and implementation instructions."
        ],
        
        business_intelligence_visuals: [
            "Transform this Excel data into actionable business intelligence with visualization recommendations. Include: (1) Key performance indicators and metrics extraction, (2) Strategic insights and business implications, (3) Recommended chart types (bar, line, pie, scatter plots), (4) Dashboard layout suggestions, (5) Data storytelling approach. Focus on turning numbers into business decisions.",
            
            "Analyze this Excel file for business intelligence opportunities and create visualization strategy. Provide: executive summary of business insights, KPI identification and benchmarking, trend analysis with strategic implications, recommended visualization types for each data dimension, and dashboard wireframe suggestions. Emphasize actionable business outcomes.",
            
            "Convert this Excel data into comprehensive business intelligence insights with visual presentation plans. Focus on: business performance analysis, competitive insights (if applicable), operational efficiency metrics, growth opportunities identification, risk assessment indicators, and detailed visualization recommendations including chart types, color schemes, and dashboard organization."
        ],
        
        all_above: [
            "Provide complete Excel file analysis including: (1) Comprehensive Data Summary with structure, statistics, and quality assessment, (2) Custom Excel Formulas tailored to your data needs, (3) Business Intelligence Insights with strategic recommendations, (4) Data Visualization Strategy with specific chart recommendations and dashboard layout. Structure as a comprehensive report with implementation guidance.",
            
            "Full Excel analysis package: Begin with detailed data overview including structure and key statistics, generate practical formulas for enhanced calculations and analysis, extract business intelligence insights with strategic implications, and conclude with comprehensive visualization recommendations. Format for immediate implementation with step-by-step guidance.",
            
            "Complete Excel file transformation analysis: Data structure and quality assessment with statistical summary, custom formula generation for automated calculations, business intelligence extraction with actionable insights, and visualization strategy with dashboard design recommendations. Present as a comprehensive guide for data optimization and business decision-making."
        ]
    };
}

function getImageAnalysisPrompts() {
    return {
        analyze_describe: [
            "Analyze this image in comprehensive detail. Provide: (1) Detailed visual description including all objects, people, and elements, (2) Technical analysis of composition, lighting, and style, (3) Color palette and visual mood assessment, (4) Context and setting identification, (5) Any notable artistic or photographic techniques used. Structure your analysis with clear sections and highlight the most significant visual elements.",
            
            "Examine this image thoroughly and provide a complete visual analysis. Include: scene composition and layout, identification of all visible elements and subjects, lighting conditions and photographic style, color scheme and visual aesthetics, emotional tone and mood conveyed, technical quality assessment, and contextual information about the setting or theme.",
            
            "Provide an in-depth analysis of this image covering: comprehensive description of all visible content, artistic and technical elements (composition, perspective, lighting), style identification and visual characteristics, color analysis and aesthetic mood, cultural or contextual significance, and overall visual impact assessment. Format as a structured analysis suitable for detailed understanding."
        ],
        
        extract_text_ocr: [
            "Extract and transcribe all visible text from this image using OCR analysis. Provide: (1) Complete text transcription in reading order, (2) Text formatting and structure preservation, (3) Identification of different text elements (headings, body text, captions), (4) Location context for each text element, (5) Any partially visible or unclear text with best-effort interpretation. Format the extracted text clearly with proper structure and hierarchy.",
            
            "Perform comprehensive text extraction from this image. Include: full transcription of all readable text, preservation of original formatting and layout structure, categorization of text types (titles, paragraphs, lists, labels), indication of text positioning and context, handling of multiple languages if present, and notation of any unclear or partially obscured text with reasonable interpretations.",
            
            "Analyze this image for text content and provide complete OCR results. Focus on: accurate transcription of all visible text elements, maintaining original document structure and formatting, identifying different text categories and their purposes, noting text placement and visual hierarchy, extracting data from tables or structured content, and providing context for how text relates to visual elements."
        ],
        
        generate_ai_prompts: [
            "Create detailed AI image generation prompts to recreate this image's style and content. Include: (1) Comprehensive scene description for image generators, (2) Specific style and artistic technique keywords, (3) Technical parameters (lighting, composition, perspective), (4) Color palette and mood descriptors, (5) Quality and detail modifiers for optimal AI generation. Format as ready-to-use prompts for Midjourney, DALL-E, or Stable Diffusion.",
            
            "Generate AI image prompts that capture this image's essence and style. Provide: detailed subject and scene descriptions, artistic style and technique specifications, lighting and atmosphere keywords, color scheme and visual mood terms, composition and framing instructions, quality enhancers and negative prompts, and platform-specific optimizations for different AI image generators.",
            
            "Analyze this image and create comprehensive AI generation prompts for recreation. Focus on: precise visual element descriptions, artistic style identification and keywords, technical photography/art terms, mood and atmosphere descriptors, composition and perspective details, color and lighting specifications, and format as multiple prompt variations optimized for different AI image generation platforms."
        ],
        
        all_above: [
            "Provide complete image analysis including: (1) Comprehensive Visual Analysis with detailed descriptions and technical assessment, (2) OCR Text Extraction with full transcription and formatting, (3) AI Image Generation Prompts for recreating this style, and (4) Overall Assessment with key insights and applications. Structure as a comprehensive report covering all aspects of image understanding and utilization.",
            
            "Full image analysis package: Begin with detailed visual description and technical analysis, extract and transcribe all visible text with proper formatting, generate AI prompts for image recreation and style matching, and conclude with comprehensive insights and practical applications. Format for maximum utility across different use cases and platforms.",
            
            "Complete image processing analysis: Visual content analysis with artistic and technical evaluation, comprehensive text extraction and OCR processing, AI generation prompt creation for style replication, and integrated assessment with actionable insights. Present as a structured guide for complete image understanding and practical application."
        ]
    };
}

function getCodeAnalysisPrompts() {
    return {
        debug_fix_errors: [
            "Analyze this code for bugs, errors, and potential issues. Provide: (1) Identification of syntax errors, logical errors, and runtime issues, (2) Specific line-by-line error explanations, (3) Corrected code with fixes implemented, (4) Potential edge cases and vulnerabilities, (5) Error handling improvements and best practices. Format with clear problem descriptions and working solutions.",
            
            "Perform comprehensive debugging analysis on this code. Include: detailed error detection and classification, root cause analysis for each issue found, step-by-step fixing instructions with corrected code snippets, testing recommendations to prevent similar issues, and defensive programming suggestions. Present findings in a structured debugging report.",
            
            "Debug and troubleshoot this code systematically. Focus on: syntax validation and error correction, logic flow analysis and bug identification, exception handling improvements, performance bottlenecks and memory issues, security vulnerabilities assessment, and provide clean, working code with all issues resolved."
        ],
        
        optimize_document: [
            "Optimize this code for performance and add comprehensive documentation. Include: (1) Performance analysis with bottleneck identification, (2) Optimized code with efficiency improvements, (3) Inline comments explaining complex logic, (4) Function/method documentation with parameters and return values, (5) Overall code architecture improvements. Focus on maintainability and performance gains.",
            
            "Enhance code performance and documentation quality. Provide: algorithmic optimizations and efficiency improvements, memory usage optimization and resource management, comprehensive commenting strategy with clear explanations, API documentation with usage examples, code organization and structure improvements, and maintainable coding patterns implementation.",
            
            "Refactor code for optimal performance while adding professional documentation. Focus on: execution speed improvements and resource optimization, clean code principles implementation, detailed inline documentation and comments, comprehensive function signatures and descriptions, code readability enhancements, and professional documentation standards following industry best practices."
        ],
        
        convert_language: [
            "Convert this code to [specify target language] while maintaining functionality. Provide: (1) Complete code translation with equivalent logic, (2) Language-specific best practices implementation, (3) Syntax adaptation and idiom usage, (4) Library/framework equivalent replacements, (5) Comments explaining conversion decisions and differences. Ensure the converted code follows target language conventions.",
            
            "Translate this code to another programming language with full functionality preservation. Include: syntactic conversion with proper language constructs, semantic equivalence maintenance across languages, framework and library mappings to target ecosystem, language-specific optimization opportunities, detailed conversion notes explaining design decisions, and usage examples in the target language.",
            
            "Port this code to [target language] with professional quality standards. Focus on: accurate functional translation maintaining original behavior, idiomatic language usage and best practices adoption, proper error handling in target language style, efficient use of language-specific features and libraries, comprehensive migration notes with key differences explained, and testing recommendations for the converted code."
        ],
        
        explain_line_by_line: [
            "Provide a detailed line-by-line explanation of this code. Include: (1) Step-by-step breakdown of each line's purpose, (2) Variable and function explanations with their roles, (3) Logic flow and execution order description, (4) Concepts and algorithms explanation, (5) Learning insights and key takeaways. Format as an educational walkthrough suitable for understanding complex code logic.",
            
            "Create a comprehensive educational breakdown of this code. Provide: detailed line-by-line commentary with purpose explanations, variable lifecycle and data flow analysis, function interactions and call sequences, algorithm logic and decision-making processes, design pattern identification and explanations, and learning objectives with skill development insights.",
            
            "Explain this code in detail for educational understanding. Focus on: sequential line-by-line analysis with clear explanations, programming concepts and principles demonstration, code structure and organization logic, best practices identification and reasoning, problem-solving approach and methodology, and practical applications with real-world context."
        ],
        
        generate_test_cases: [
            "Generate comprehensive test cases for this code. Include: (1) Unit tests covering all functions and methods, (2) Edge case testing with boundary conditions, (3) Error handling and exception testing, (4) Integration test scenarios, (5) Performance and load testing suggestions. Provide complete test code with assertions and expected outcomes.",
            
            "Create a full testing suite for this code implementation. Provide: systematic unit test coverage with positive and negative cases, boundary testing and edge case validation, mock data and test fixture setup, integration testing strategies and scenarios, automated testing framework recommendations, and test execution and validation procedures.",
            
            "Develop thorough test cases and testing strategy for this code. Focus on: comprehensive test coverage with all code paths tested, realistic test data and scenarios creation, error condition testing and validation, performance benchmarking and load testing, continuous integration testing setup, and quality assurance methodology with best practices implementation."
        ]
    };
}

function getContextualizedPrompt(option, filename, fileSize, fileType = 'pdf', codeAnalysis = null) {
    let prompts;
    
    // Get appropriate prompt set based on file type
    if (fileType === 'excel') {
        prompts = getExcelAnalysisPrompts();
    } else if (fileType === 'image') {
        prompts = getImageAnalysisPrompts();
    } else if (fileType === 'code') {
        prompts = getCodeAnalysisPrompts();
    } else {
        prompts = getPDFAnalysisPrompts();
    }
    
    const variations = prompts[option] || (fileType === 'excel' ? prompts.data_analysis_summary : 
                                         fileType === 'image' ? prompts.analyze_describe : 
                                         fileType === 'code' ? prompts.debug_fix_errors :
                                         prompts.summarize);
    
    // Simple rotation based on filename/code hash for consistency
    const hashInput = filename || (codeAnalysis ? codeAnalysis.language + codeAnalysis.lineCount : 'default');
    const index = Math.abs(simpleHash(hashInput)) % variations.length;
    let selectedPrompt = variations[index];
    
    // Add contextual elements based on file type
    const filenameLower = (filename || '').toLowerCase();
    let contextualPrefix = "";
    
    if (fileType === 'code') {
        // Code-specific contextual prefixes
        if (codeAnalysis && codeAnalysis.language !== 'unknown') {
            const languageDisplayNames = {
                javascript: 'JavaScript',
                python: 'Python',
                java: 'Java',
                cpp: 'C++',
                csharp: 'C#',
                php: 'PHP',
                ruby: 'Ruby',
                go: 'Go',
                rust: 'Rust',
                swift: 'Swift',
                kotlin: 'Kotlin',
                html: 'HTML',
                css: 'CSS',
                sql: 'SQL',
                bash: 'Bash/Shell'
            };
            const displayName = languageDisplayNames[codeAnalysis.language] || codeAnalysis.language;
            contextualPrefix = `This appears to be ${displayName} code. `;
            
            // Add specific context based on detected patterns
            if (codeAnalysis.lineCount > 100) {
                contextualPrefix += "Given the code's length, focus on the most critical aspects. ";
            } else if (codeAnalysis.lineCount < 20) {
                contextualPrefix += "This is a concise code snippet. ";
            }
        }
        
        // Handle convert_language option specifically
        if (option === 'convert_language') {
            contextualPrefix += "Please specify the target programming language you want to convert this code to. ";
        }
    } else if (fileType === 'image') {
        // Image-specific contextual prefixes (existing logic)
        if (filenameLower.includes('screenshot') || filenameLower.includes('screen')) {
            contextualPrefix = "This appears to be a screenshot. ";
        } else if (filenameLower.includes('chart') || filenameLower.includes('graph') || filenameLower.includes('data')) {
            contextualPrefix = "This appears to be a chart or data visualization. ";
        } else if (filenameLower.includes('diagram') || filenameLower.includes('flow') || filenameLower.includes('process')) {
            contextualPrefix = "This appears to be a diagram or process flow. ";
        } else if (filenameLower.includes('logo') || filenameLower.includes('brand') || filenameLower.includes('design')) {
            contextualPrefix = "This appears to be a design or branding element. ";
        } else if (filenameLower.includes('product') || filenameLower.includes('item')) {
            contextualPrefix = "This appears to be a product image. ";
        } else if (filenameLower.includes('document') || filenameLower.includes('text') || filenameLower.includes('page')) {
            contextualPrefix = "This appears to be a document or text-heavy image. ";
        } else if (filenameLower.includes('photo') || filenameLower.includes('pic') || filenameLower.includes('image')) {
            contextualPrefix = "This appears to be a photograph or general image. ";
        } else if (filenameLower.includes('art') || filenameLower.includes('creative') || filenameLower.includes('drawing')) {
            contextualPrefix = "This appears to be artwork or creative content. ";
        }
    } else if (fileType === 'excel') {
        // Excel-specific contextual prefixes (existing logic)
        if (filenameLower.includes('sales') || filenameLower.includes('revenue')) {
            contextualPrefix = "This appears to be a sales/revenue dataset. ";
        } else if (filenameLower.includes('finance') || filenameLower.includes('budget') || filenameLower.includes('cost')) {
            contextualPrefix = "This appears to be a financial dataset. ";
        } else if (filenameLower.includes('inventory') || filenameLower.includes('stock')) {
            contextualPrefix = "This appears to be an inventory/stock dataset. ";
        } else if (filenameLower.includes('customer') || filenameLower.includes('client')) {
            contextualPrefix = "This appears to be a customer/client dataset. ";
        } else if (filenameLower.includes('employee') || filenameLower.includes('hr') || filenameLower.includes('staff')) {
            contextualPrefix = "This appears to be an HR/employee dataset. ";
        } else if (filenameLower.includes('analytics') || filenameLower.includes('metrics') || filenameLower.includes('kpi')) {
            contextualPrefix = "This appears to be an analytics/metrics dataset. ";
        } else if (filenameLower.includes('report') || filenameLower.includes('dashboard')) {
            contextualPrefix = "This appears to be a business reporting dataset. ";
        }
    } else {
        // PDF-specific contextual prefixes (existing logic)
        if (filenameLower.includes('report') || filenameLower.includes('analysis')) {
            contextualPrefix = "This appears to be a business/analytical document. ";
        } else if (filenameLower.includes('research') || filenameLower.includes('paper') || filenameLower.includes('study')) {
            contextualPrefix = "This appears to be a research document. ";
        } else if (filenameLower.includes('manual') || filenameLower.includes('guide') || filenameLower.includes('documentation')) {
            contextualPrefix = "This appears to be a instructional document. ";
        } else if (filenameLower.includes('presentation') || filenameLower.includes('slides')) {
            contextualPrefix = "This appears to be a presentation document. ";
        }
    }
    
    return contextualPrefix + selectedPrompt;
}

function showPDFAnalysisNotification(filename, fileSize, platform) {
    // Remove any existing PDF analysis notification
    if (fileAnalysisNotification) {
        fileAnalysisNotification.remove();
        fileAnalysisNotification = null;
    }
    
    const extensionButton = shadowRoot.querySelector('#solthron-floating-button');
    if (!extensionButton) return;
    
    // Create notification popup
    const notification = document.createElement('div');
    notification.className = 'pdf-analysis-notification';
    notification.style.cssText = `
        position: absolute;
        bottom: 60px;
        right: -10px;
        background: #2c2c2c;
        color: white;
        padding: 16px;
        border-radius: 10px;
        font-size: 13px;
        width: 320px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        border: 2px solid rgba(255,215,0,0.4);
        z-index: 10003;
        animation: pdfAnalysisSlide 0.4s ease-out;
    `;
    
    const displayName = filename.length > 25 ? filename.substring(0, 22) + '...' : filename;
    const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
    
    notification.innerHTML = `
        <div style="margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <div style="width: 8px; height: 8px; background: #ffd700; border-radius: 50%; animation: pulse 1.5s infinite;"></div>
                <span style="font-weight: 500; color: #ffd700;">📄 PDF Analysis Ready</span>
            </div>
            <div style="font-size: 11px; color: rgba(255,255,255,0.7); margin-bottom: 10px;">
                File detected: <span style="color: #ffd700;">${displayName}</span>
            </div>
            <div style="font-size: 11px; color: rgba(255,255,255,0.8); margin-bottom: 12px;">
                Choose your analysis approach:
            </div>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px;">
            <button class="pdf-option-btn" data-option="summarize" style="
                background: rgba(255,215,0,0.1);
                border: 1px solid rgba(255,215,0,0.3);
                color: white;
                padding: 8px 12px;
                border-radius: 5px;
                font-size: 11px;
                cursor: pointer;
                text-align: left;
                transition: all 0.2s ease;
            ">📋 Summarize Document</button>
            
            <button class="pdf-option-btn" data-option="extract_key_points" style="
                background: rgba(255,215,0,0.1);
                border: 1px solid rgba(255,215,0,0.3);
                color: white;
                padding: 8px 12px;
                border-radius: 5px;
                font-size: 11px;
                cursor: pointer;
                text-align: left;
                transition: all 0.2s ease;
            ">🔍 Extract Key Points</button>
            
            <button class="pdf-option-btn" data-option="highlight_action_items" style="
                background: rgba(255,215,0,0.1);
                border: 1px solid rgba(255,215,0,0.3);
                color: white;
                padding: 8px 12px;
                border-radius: 5px;
                font-size: 11px;
                cursor: pointer;
                text-align: left;
                transition: all 0.2s ease;
            ">⚡ Highlight Action Items</button>
            
            <button class="pdf-option-btn" data-option="all_above" style="
                background: rgba(255,215,0,0.1);
                border: 1px solid rgba(255,215,0,0.3);
                color: white;
                padding: 8px 12px;
                border-radius: 5px;
                font-size: 11px;
                cursor: pointer;
                text-align: left;
                transition: all 0.2s ease;
            ">🎯 All of Above</button>
        </div>
        
        <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button class="pdf-dismiss-btn" style="
                background: none;
                border: 1px solid rgba(255,255,255,0.3);
                color: rgba(255,255,255,0.8);
                padding: 6px 12px;
                border-radius: 5px;
                font-size: 11px;
                cursor: pointer;
                transition: all 0.2s ease;
            ">Dismiss</button>
        </div>
    `;
    
    // Add CSS animation if not already present
    if (!shadowRoot.querySelector('#pdf-analysis-styles')) {
        const style = document.createElement('style');
        style.id = 'pdf-analysis-styles';
        style.textContent = `
            @keyframes pdfAnalysisSlide {
                from { 
                    transform: translateY(20px) scale(0.95); 
                    opacity: 0; 
                }
                to { 
                    transform: translateY(0) scale(1); 
                    opacity: 1; 
                }
            }
            .pdf-option-btn:hover {
                background: rgba(255,215,0,0.2) !important;
                border-color: rgba(255,215,0,0.5) !important;
                transform: translateY(-1px);
            }
            .pdf-dismiss-btn:hover {
                background: rgba(255,255,255,0.1) !important;
                border-color: rgba(255,255,255,0.5) !important;
            }
        `;
        shadowRoot.appendChild(style);
    }
    
    // Event handlers for PDF option buttons
    notification.querySelectorAll('.pdf-option-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const option = btn.getAttribute('data-option');
            handlePDFOptionSelection(option, filename, fileSize, platform);
            notification.remove();
            fileAnalysisNotification = null;
        });
    });
    
    // Dismiss button handler
    notification.querySelector('.pdf-dismiss-btn').addEventListener('click', () => {
        notification.remove();
        fileAnalysisNotification = null;
    });
    
    // Add to extension button
    extensionButton.appendChild(notification);
    fileAnalysisNotification = notification;
    
    // Auto-dismiss after 30 seconds
    setTimeout(() => {
        if (fileAnalysisNotification === notification) {
            notification.remove();
            fileAnalysisNotification = null;
        }
    }, 30000);
    
    console.log('📱 PDF analysis notification displayed');
}

function showExcelAnalysisNotification(filename, fileSize, platform) {
    // Remove any existing file analysis notification
    if (fileAnalysisNotification) {
        fileAnalysisNotification.remove();
        fileAnalysisNotification = null;
    }
    
    const extensionButton = shadowRoot.querySelector('#solthron-floating-button');
    if (!extensionButton) return;
    
    // Create notification popup
    const notification = document.createElement('div');
    notification.className = 'excel-analysis-notification';
    notification.style.cssText = `
        position: absolute;
        bottom: 60px;
        right: -10px;
        background: #2c2c2c;
        color: white;
        padding: 16px;
        border-radius: 10px;
        font-size: 13px;
        width: 320px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        border: 2px solid rgba(34,139,34,0.4);
        z-index: 10003;
        animation: excelAnalysisSlide 0.4s ease-out;
    `;
    
    const displayName = filename.length > 25 ? filename.substring(0, 22) + '...' : filename;
    const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
    
    notification.innerHTML = `
        <div style="margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <div style="width: 8px; height: 8px; background: #228b22; border-radius: 50%; animation: pulse 1.5s infinite;"></div>
                <span style="font-weight: 500; color: #228b22;">📊 Excel Analysis Ready</span>
            </div>
            <div style="font-size: 11px; color: rgba(255,255,255,0.7); margin-bottom: 10px;">
                File detected: <span style="color: #228b22;">${displayName}</span>
            </div>
            <div style="font-size: 11px; color: rgba(255,255,255,0.8); margin-bottom: 12px;">
                Choose your analysis approach:
            </div>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px;">
            <button class="excel-option-btn" data-option="data_analysis_summary" style="
                background: rgba(34,139,34,0.1);
                border: 1px solid rgba(34,139,34,0.3);
                color: white;
                padding: 8px 12px;
                border-radius: 5px;
                font-size: 11px;
                cursor: pointer;
                text-align: left;
                transition: all 0.2s ease;
            ">📊 Data Analysis & Summary</button>
            
            <button class="excel-option-btn" data-option="generate_formulas" style="
                background: rgba(34,139,34,0.1);
                border: 1px solid rgba(34,139,34,0.3);
                color: white;
                padding: 8px 12px;
                border-radius: 5px;
                font-size: 11px;
                cursor: pointer;
                text-align: left;
                transition: all 0.2s ease;
            ">🔢 Generate Excel Formulas</button>
            
            <button class="excel-option-btn" data-option="business_intelligence_visuals" style="
                background: rgba(34,139,34,0.1);
                border: 1px solid rgba(34,139,34,0.3);
                color: white;
                padding: 8px 12px;
                border-radius: 5px;
                font-size: 11px;
                cursor: pointer;
                text-align: left;
                transition: all 0.2s ease;
            ">📈 Business Intelligence & Visualizations</button>
            
            <button class="excel-option-btn" data-option="all_above" style="
                background: rgba(34,139,34,0.1);
                border: 1px solid rgba(34,139,34,0.3);
                color: white;
                padding: 8px 12px;
                border-radius: 5px;
                font-size: 11px;
                cursor: pointer;
                text-align: left;
                transition: all 0.2s ease;
            ">🎯 All of Above</button>
        </div>
        
        <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button class="excel-dismiss-btn" style="
                background: none;
                border: 1px solid rgba(255,255,255,0.3);
                color: rgba(255,255,255,0.8);
                padding: 6px 12px;
                border-radius: 5px;
                font-size: 11px;
                cursor: pointer;
                transition: all 0.2s ease;
            ">Dismiss</button>
        </div>
    `;
    
    // Add CSS animation if not already present
    if (!shadowRoot.querySelector('#excel-analysis-styles')) {
        const style = document.createElement('style');
        style.id = 'excel-analysis-styles';
        style.textContent = `
            @keyframes excelAnalysisSlide {
                from { 
                    transform: translateY(20px) scale(0.95); 
                    opacity: 0; 
                }
                to { 
                    transform: translateY(0) scale(1); 
                    opacity: 1; 
                }
            }
            .excel-option-btn:hover {
                background: rgba(34,139,34,0.2) !important;
                border-color: rgba(34,139,34,0.5) !important;
                transform: translateY(-1px);
            }
            .excel-dismiss-btn:hover {
                background: rgba(255,255,255,0.1) !important;
                border-color: rgba(255,255,255,0.5) !important;
            }
        `;
        shadowRoot.appendChild(style);
    }
    
    // Event handlers for Excel option buttons
    notification.querySelectorAll('.excel-option-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const option = btn.getAttribute('data-option');
            handleExcelOptionSelection(option, filename, fileSize, platform);
            notification.remove();
            fileAnalysisNotification = null;
        });
    });
    
    // Dismiss button handler
    notification.querySelector('.excel-dismiss-btn').addEventListener('click', () => {
        notification.remove();
        fileAnalysisNotification = null;
    });
    
    // Add to extension button
    extensionButton.appendChild(notification);
    fileAnalysisNotification = notification;
    
    // Auto-dismiss after 30 seconds
    setTimeout(() => {
        if (fileAnalysisNotification === notification) {
            notification.remove();
            fileAnalysisNotification = null;
        }
    }, 30000);
    
    console.log('📱 Excel analysis notification displayed');
}

function showImageAnalysisNotification(filename, fileSize, platform) {
    // Remove any existing file analysis notification
    if (fileAnalysisNotification) {
        fileAnalysisNotification.remove();
        fileAnalysisNotification = null;
    }
    
    const extensionButton = shadowRoot.querySelector('#solthron-floating-button');
    if (!extensionButton) return;
    
    // Create notification popup
    const notification = document.createElement('div');
    notification.className = 'image-analysis-notification';
    notification.style.cssText = `
        position: absolute;
        bottom: 60px;
        right: -10px;
        background: #2c2c2c;
        color: white;
        padding: 16px;
        border-radius: 10px;
        font-size: 13px;
        width: 320px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        border: 2px solid rgba(138,43,226,0.4);
        z-index: 10003;
        animation: imageAnalysisSlide 0.4s ease-out;
    `;
    
    const displayName = filename.length > 25 ? filename.substring(0, 22) + '...' : filename;
    const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
    
    notification.innerHTML = `
        <div style="margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <div style="width: 8px; height: 8px; background: #8a2be2; border-radius: 50%; animation: pulse 1.5s infinite;"></div>
                <span style="font-weight: 500; color: #8a2be2;">🖼️ Image Analysis Ready</span>
            </div>
            <div style="font-size: 11px; color: rgba(255,255,255,0.7); margin-bottom: 10px;">
                File detected: <span style="color: #8a2be2;">${displayName}</span>
            </div>
            <div style="font-size: 11px; color: rgba(255,255,255,0.8); margin-bottom: 12px;">
                Choose your analysis approach:
            </div>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px;">
            <button class="image-option-btn" data-option="analyze_describe" style="
                background: rgba(138,43,226,0.1);
                border: 1px solid rgba(138,43,226,0.3);
                color: white;
                padding: 8px 12px;
                border-radius: 5px;
                font-size: 11px;
                cursor: pointer;
                text-align: left;
                transition: all 0.2s ease;
            ">🔍 Analyze & Describe Image</button>
            
            <button class="image-option-btn" data-option="extract_text_ocr" style="
                background: rgba(138,43,226,0.1);
                border: 1px solid rgba(138,43,226,0.3);
                color: white;
                padding: 8px 12px;
                border-radius: 5px;
                font-size: 11px;
                cursor: pointer;
                text-align: left;
                transition: all 0.2s ease;
            ">📝 Extract Text (OCR)</button>
            
            <button class="image-option-btn" data-option="generate_ai_prompts" style="
                background: rgba(138,43,226,0.1);
                border: 1px solid rgba(138,43,226,0.3);
                color: white;
                padding: 8px 12px;
                border-radius: 5px;
                font-size: 11px;
                cursor: pointer;
                text-align: left;
                transition: all 0.2s ease;
            ">🎨 Generate AI Image Prompts</button>
            
            <button class="image-option-btn" data-option="all_above" style="
                background: rgba(138,43,226,0.1);
                border: 1px solid rgba(138,43,226,0.3);
                color: white;
                padding: 8px 12px;
                border-radius: 5px;
                font-size: 11px;
                cursor: pointer;
                text-align: left;
                transition: all 0.2s ease;
            ">🎯 All of Above</button>
        </div>
        
        <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button class="image-dismiss-btn" style="
                background: none;
                border: 1px solid rgba(255,255,255,0.3);
                color: rgba(255,255,255,0.8);
                padding: 6px 12px;
                border-radius: 5px;
                font-size: 11px;
                cursor: pointer;
                transition: all 0.2s ease;
            ">Dismiss</button>
        </div>
    `;
    
    // Add CSS animation if not already present
    if (!shadowRoot.querySelector('#image-analysis-styles')) {
        const style = document.createElement('style');
        style.id = 'image-analysis-styles';
        style.textContent = `
            @keyframes imageAnalysisSlide {
                from { 
                    transform: translateY(20px) scale(0.95); 
                    opacity: 0; 
                }
                to { 
                    transform: translateY(0) scale(1); 
                    opacity: 1; 
                }
            }
            .image-option-btn:hover {
                background: rgba(138,43,226,0.2) !important;
                border-color: rgba(138,43,226,0.5) !important;
                transform: translateY(-1px);
            }
            .image-dismiss-btn:hover {
                background: rgba(255,255,255,0.1) !important;
                border-color: rgba(255,255,255,0.5) !important;
            }
        `;
        shadowRoot.appendChild(style);
    }
    
    // Event handlers for Image option buttons
    notification.querySelectorAll('.image-option-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const option = btn.getAttribute('data-option');
            handleImageOptionSelection(option, filename, fileSize, platform);
            notification.remove();
            fileAnalysisNotification = null;
        });
    });
    
    // Dismiss button handler
    notification.querySelector('.image-dismiss-btn').addEventListener('click', () => {
        notification.remove();
        fileAnalysisNotification = null;
    });
    
    // Add to extension button
    extensionButton.appendChild(notification);
    fileAnalysisNotification = notification;
    
    // Auto-dismiss after 30 seconds
    setTimeout(() => {
        if (fileAnalysisNotification === notification) {
            notification.remove();
            fileAnalysisNotification = null;
        }
    }, 30000);
    
    console.log('📱 Image analysis notification displayed');
}

function showCodeAnalysisNotification(codeAnalysis, contentLength, platform) {
    // Remove any existing file analysis notification
    if (codeAnalysisNotification) {
        codeAnalysisNotification.remove();
        codeAnalysisNotification = null;
    }
    
    const extensionButton = shadowRoot.querySelector('#solthron-floating-button');
    if (!extensionButton) return;
    
    // Create notification popup
    const notification = document.createElement('div');
    notification.className = 'code-analysis-notification';
    notification.style.cssText = `
        position: absolute;
        bottom: 60px;
        right: -10px;
        background: #2c2c2c;
        color: white;
        padding: 16px;
        border-radius: 10px;
        font-size: 13px;
        width: 320px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        border: 2px solid rgba(30,144,255,0.4);
        z-index: 10003;
        animation: codeAnalysisSlide 0.4s ease-out;
    `;
    
    const languageDisplay = codeAnalysis.language !== 'unknown' ? 
        codeAnalysis.language.charAt(0).toUpperCase() + codeAnalysis.language.slice(1) : 'Code';
    const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
    
    notification.innerHTML = `
        <div style="margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <div style="width: 8px; height: 8px; background: #1e90ff; border-radius: 50%; animation: pulse 1.5s infinite;"></div>
                <span style="font-weight: 500; color: #1e90ff;">💻 Code Analysis Ready</span>
            </div>
            <div style="font-size: 11px; color: rgba(255,255,255,0.7); margin-bottom: 10px;">
                Detected: <span style="color: #1e90ff;">${languageDisplay}</span> • ${codeAnalysis.lineCount} lines • ${Math.round(codeAnalysis.confidence * 100)}% confidence
            </div>
            <div style="font-size: 11px; color: rgba(255,255,255,0.8); margin-bottom: 12px;">
                Choose your analysis approach:
            </div>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px;">
            <button class="code-option-btn" data-option="debug_fix_errors" style="
                background: rgba(30,144,255,0.1);
                border: 1px solid rgba(30,144,255,0.3);
                color: white;
                padding: 8px 12px;
                border-radius: 5px;
                font-size: 11px;
                cursor: pointer;
                text-align: left;
                transition: all 0.2s ease;
            ">🐛 Debug & Fix Errors</button>
            
            <button class="code-option-btn" data-option="optimize_document" style="
                background: rgba(30,144,255,0.1);
                border: 1px solid rgba(30,144,255,0.3);
                color: white;
                padding: 8px 12px;
                border-radius: 5px;
                font-size: 11px;
                cursor: pointer;
                text-align: left;
                transition: all 0.2s ease;
            ">⚡ Optimize & Document</button>
            
            <button class="code-option-btn" data-option="convert_language" style="
                background: rgba(30,144,255,0.1);
                border: 1px solid rgba(30,144,255,0.3);
                color: white;
                padding: 8px 12px;
                border-radius: 5px;
                font-size: 11px;
                cursor: pointer;
                text-align: left;
                transition: all 0.2s ease;
            ">🔄 Convert to Another Language</button>
            
            <button class="code-option-btn" data-option="explain_line_by_line" style="
                background: rgba(30,144,255,0.1);
                border: 1px solid rgba(30,144,255,0.3);
                color: white;
                padding: 8px 12px;
                border-radius: 5px;
                font-size: 11px;
                cursor: pointer;
                text-align: left;
                transition: all 0.2s ease;
            ">📖 Explain Line by Line</button>
            
            <button class="code-option-btn" data-option="generate_test_cases" style="
                background: rgba(30,144,255,0.1);
                border: 1px solid rgba(30,144,255,0.3);
                color: white;
                padding: 8px 12px;
                border-radius: 5px;
                font-size: 11px;
                cursor: pointer;
                text-align: left;
                transition: all 0.2s ease;
            ">🧪 Generate Test Cases</button>
        </div>
        
        <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button class="code-dismiss-btn" style="
                background: none;
                border: 1px solid rgba(255,255,255,0.3);
                color: rgba(255,255,255,0.8);
                padding: 6px 12px;
                border-radius: 5px;
                font-size: 11px;
                cursor: pointer;
                transition: all 0.2s ease;
            ">Dismiss</button>
        </div>
    `;
    
    // Add CSS animation if not already present
    if (!shadowRoot.querySelector('#code-analysis-styles')) {
        const style = document.createElement('style');
        style.id = 'code-analysis-styles';
        style.textContent = `
            @keyframes codeAnalysisSlide {
                from { 
                    transform: translateY(20px) scale(0.95); 
                    opacity: 0; 
                }
                to { 
                    transform: translateY(0) scale(1); 
                    opacity: 1; 
                }
            }
            .code-option-btn:hover {
                background: rgba(30,144,255,0.2) !important;
                border-color: rgba(30,144,255,0.5) !important;
                transform: translateY(-1px);
            }
            .code-dismiss-btn:hover {
                background: rgba(255,255,255,0.1) !important;
                border-color: rgba(255,255,255,0.5) !important;
            }
        `;
        shadowRoot.appendChild(style);
    }
    
    // Event handlers for Code option buttons
    notification.querySelectorAll('.code-option-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const option = btn.getAttribute('data-option');
            handleCodeOptionSelection(option, codeAnalysis, contentLength, platform);
            notification.remove();
            codeAnalysisNotification = null;
        });
    });
    
    // Dismiss button handler
    notification.querySelector('.code-dismiss-btn').addEventListener('click', () => {
        notification.remove();
        codeAnalysisNotification = null;
    });
    
    // Add to extension button
    extensionButton.appendChild(notification);
    codeAnalysisNotification = notification;
    
    // Auto-dismiss after 30 seconds
    setTimeout(() => {
        if (codeAnalysisNotification === notification) {
            notification.remove();
            codeAnalysisNotification = null;
        }
    }, 30000);
    
    console.log('📱 Code analysis notification displayed');
}

async function handlePDFOptionSelection(option, filename, fileSize, platform) {
    console.log('📝 PDF option selected:', option, 'for file:', filename);
    
    try {
        // Generate contextual prompt (no credit check needed here - credits handled by backend)
        const prompt = getContextualizedPrompt(option, filename, fileSize);
        console.log('✅ Generated prompt for', option);
        console.log('📝 Prompt preview:', prompt.substring(0, 100) + '...');
        
        // Insert prompt into input field
        await insertFileAnalysisPrompt(prompt, platform, 'pdf');
        
        console.log('🎯 PDF analysis prompt ready for user to send');
        
    } catch (error) {
        console.error('❌ PDF option selection error:', error);
        // Show error in a simple way
        const errorMsg = 'Failed to process PDF analysis option: ' + error.message;
        console.log('❌', errorMsg);
        
        // Try to show error in output if available
        if (shadowRoot && shadowRoot.querySelector('#output-text')) {
            const outputText = shadowRoot.querySelector('#output-text');
            outputText.classList.add('error');
            outputText.textContent = errorMsg;
        }
    }
}

async function handleExcelOptionSelection(option, filename, fileSize, platform) {
    console.log('📊 Excel option selected:', option, 'for file:', filename);
    
    try {
        // Generate contextual prompt for Excel
        const prompt = getContextualizedPrompt(option, filename, fileSize, 'excel');
        console.log('✅ Generated Excel prompt for', option);
        console.log('📝 Prompt preview:', prompt.substring(0, 100) + '...');
        
        // Insert prompt into input field
        await insertFileAnalysisPrompt(prompt, platform, 'excel');
        
        console.log('🎯 Excel analysis prompt ready for user to send');
        
    } catch (error) {
        console.error('❌ Excel option selection error:', error);
        // Show error in a simple way
        const errorMsg = 'Failed to process Excel analysis option: ' + error.message;
        console.log('❌', errorMsg);
        
        // Try to show error in output if available
        if (shadowRoot && shadowRoot.querySelector('#output-text')) {
            const outputText = shadowRoot.querySelector('#output-text');
            outputText.classList.add('error');
            outputText.textContent = errorMsg;
        }
    }
}

async function handleImageOptionSelection(option, filename, fileSize, platform) {
    console.log('🖼️ Image option selected:', option, 'for file:', filename);
    
    try {
        // Generate contextual prompt for Image
        const prompt = getContextualizedPrompt(option, filename, fileSize, 'image');
        console.log('✅ Generated Image prompt for', option);
        console.log('📝 Prompt preview:', prompt.substring(0, 100) + '...');
        
        // Insert prompt into input field
        await insertFileAnalysisPrompt(prompt, platform, 'image');
        
        console.log('🎯 Image analysis prompt ready for user to send');
        
    } catch (error) {
        console.error('❌ Image option selection error:', error);
        // Show error in a simple way
        const errorMsg = 'Failed to process Image analysis option: ' + error.message;
        console.log('❌', errorMsg);
        
        // Try to show error in output if available
        if (shadowRoot && shadowRoot.querySelector('#output-text')) {
            const outputText = shadowRoot.querySelector('#output-text');
            outputText.classList.add('error');
            outputText.textContent = errorMsg;
        }
    }
}

async function handleCodeOptionSelection(option, codeAnalysis, contentLength, platform) {
    console.log('💻 Code option selected:', option, 'for', codeAnalysis.language, 'code');
    
    try {
        // Generate contextual prompt for Code
        const prompt = getContextualizedPrompt(option, null, contentLength, 'code', codeAnalysis);
        console.log('✅ Generated Code prompt for', option);
        console.log('📝 Prompt preview:', prompt.substring(0, 100) + '...');
        
        // Insert prompt into input field
        await insertFileAnalysisPrompt(prompt, platform, 'code');
        
        console.log('🎯 Code analysis prompt ready for user to send');
        
    } catch (error) {
        console.error('❌ Code option selection error:', error);
        // Show error in a simple way
        const errorMsg = 'Failed to process Code analysis option: ' + error.message;
        console.log('❌', errorMsg);
        
        // Try to show error in output if available
        if (shadowRoot && shadowRoot.querySelector('#output-text')) {
            const outputText = shadowRoot.querySelector('#output-text');
            outputText.classList.add('error');
            outputText.textContent = errorMsg;
        }
    }
 }

 async function insertFileAnalysisPrompt(prompt, platform, fileType = 'pdf') {
    console.log(`📝 Inserting ${fileType.toUpperCase()} analysis prompt into input field...`);
    console.log('🎯 Platform:', platform);
    console.log('📄 Prompt length:', prompt.length);
    console.log('📝 Prompt preview:', prompt.substring(0, 150) + '...');
    
    // Try to use magic pill input field first
    if (currentInputField) {
        try {
            console.log('🎯 Trying magic pill input field...');
            
            if (fileType === 'code') {
                // For code analysis, APPEND the prompt to existing content
                const existingContent = getInputText(currentInputField);
                const combinedContent = existingContent + '\n\n' + prompt;
                setInputText(currentInputField, combinedContent);
                console.log('✅ Code analysis prompt APPENDED to existing content');
            } else {
                // For files (PDF, Excel, Images), REPLACE content as before
                setInputText(currentInputField, prompt);
                console.log(`✅ ${fileType.toUpperCase()} prompt inserted via magic pill input field`);
            }
            return;
        } catch (error) {
            console.log('❌ Failed to use magic pill input field:', error);
        }
    } else {
        console.log('⚠️ No currentInputField available, using fallback detection');
    }
    
    // Fallback: detect input field manually
    let inputField = null;
    
    const selectors = {
        chatgpt: ['#prompt-textarea', 'textarea[data-id="root"]', 'div[contenteditable="true"]'],
        claude: ['div.ProseMirror[contenteditable="true"]', 'div[contenteditable="true"]'],
        gemini: ['.ql-editor[contenteditable="true"]', 'div[contenteditable="true"]'],
        deepseek: ['textarea[placeholder*="Message"]', 'div[contenteditable="true"]'],
        grok: ['textarea', 'div[contenteditable="true"]']
    };
    
    const platformSelectors = selectors[platform] || ['textarea', 'div[contenteditable="true"]'];
    
    for (const selector of platformSelectors) {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
            const rect = el.getBoundingClientRect();
            if (rect.width > 200 && rect.height > 20 && !el.disabled) {
                inputField = el;
                break;
            }
        }
        if (inputField) break;
    }
    
    if (inputField) {
        try {
            if (fileType === 'code') {
                // For code analysis, APPEND the prompt to existing content
                const existingContent = getInputText(inputField);
                const combinedContent = existingContent + '\n\n' + prompt;
                setInputText(inputField, combinedContent);
                console.log('✅ Code analysis prompt APPENDED to existing content via fallback');
            } else {
                // For files (PDF, Excel, Images), REPLACE content as before
                setInputText(inputField, prompt);
                console.log(`✅ ${fileType.toUpperCase()} prompt inserted via fallback detection`);
            }
            inputField.focus();
        } catch (error) {
            console.error(`❌ Failed to insert ${fileType.toUpperCase()} prompt:`, error);
            // Final fallback: copy to clipboard
            if (fileType === 'code') {
                const existingContent = getInputText(inputField) || '[Your code here]';
                const combinedContent = existingContent + '\n\n' + prompt;
                navigator.clipboard.writeText(combinedContent).then(() => {
                    console.log(`📋 Code analysis prompt with existing content copied to clipboard as fallback`);
                });
            } else {
                navigator.clipboard.writeText(prompt).then(() => {
                    console.log(`📋 ${fileType.toUpperCase()} prompt copied to clipboard as fallback`);
                });
            }
        }
    } else {
        console.log(`❌ Could not find input field for ${fileType.toUpperCase()} prompt insertion`);
        // Fallback: copy to clipboard
        if (fileType === 'code') {
            const fallbackContent = '[Your code here]\n\n' + prompt;
            navigator.clipboard.writeText(fallbackContent).then(() => {
                console.log(`📋 Code analysis prompt copied to clipboard as fallback`);
            });
        } else {
            navigator.clipboard.writeText(prompt).then(() => {
                console.log(`📋 ${fileType.toUpperCase()} prompt copied to clipboard as fallback`);
            });
        }
    }
}

function hideMagicPill() {
    if (!magicPillIcon) return;
    
    magicPillIcon.style.opacity = '0';
    magicPillIcon.style.transform = 'scale(0.8)';
    
    setTimeout(() => {
        if (magicPillIcon) {
            magicPillIcon.style.display = 'none';
        }
    }, 200);
}

function positionMagicPillAtCursor(inputField) {
    if (!magicPillIcon) return;
    
    const cursorPos = getCursorPosition(inputField);
    
    if (!cursorPos) {
        console.log('❌ Could not get cursor position, using fallback');
        positionMagicPillFallback(inputField);
        return;
    }
    
    const platform = detectAIPlatform();
    
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    // Calculate position relative to cursor
    let x = cursorPos.x + scrollLeft + 10; // 10px to the right of cursor
    let y = cursorPos.y + scrollTop - 40; // 40px above cursor
    
    // Viewport boundary checks
    const pillWidth = 32;
    const pillHeight = 32;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Adjust horizontal position if too close to right edge
    if (x + pillWidth > viewportWidth + scrollLeft - 10) {
        x = cursorPos.x + scrollLeft - pillWidth - 10; // Position to the left of cursor
    }
    
    // Adjust vertical position if too close to top edge
    if (y < scrollTop + 10) {
        y = cursorPos.y + scrollTop + (cursorPos.height || 20) + 10; // Position below cursor
    }
    
    // Apply position
    magicPillIcon.style.left = `${x}px`;
    magicPillIcon.style.top = `${y}px`;
}

function positionMagicPillFallback(inputField) {
    // Fallback to original positioning method
    const rect = inputField.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    // Position at the right edge, vertically centered
    magicPillIcon.style.top = `${rect.top + scrollTop + (rect.height / 2) - 16}px`;
    magicPillIcon.style.left = `${rect.right + scrollLeft - 45}px`;
}

function createMagicPillIcon() {
    removeMagicPill();
    
    magicPillIcon = document.createElement('div');
    magicPillIcon.id = 'solthron-magic-pill';
    magicPillIcon.style.cssText = `
        position: absolute;
        width: 32px;
        height: 32px;
        background: #ffff00;
        border-radius: 50%;
        display: none;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 999999;
        opacity: 0;
        transform: scale(0.8);
        transition: all 0.2s ease;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15), 0 0 20px rgba(255, 255, 0, 0.3);
        pointer-events: auto;
    `;
    
    magicPillIcon.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2v6m0 4v6m0 4v-2"></path>
            <path d="M2 12h6m4 0h6m4 0h-2"></path>
            <circle cx="12" cy="12" r="3"></circle>
        </svg>
    `;
    
    magicPillIcon.addEventListener('mouseenter', () => {
        magicPillIcon.style.transform = 'scale(1.1)';
        magicPillIcon.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2), 0 0 25px rgba(255, 255, 0, 0.4)';
    });
    
    magicPillIcon.addEventListener('mouseleave', () => {
        magicPillIcon.style.transform = 'scale(1)';
        magicPillIcon.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15), 0 0 20px rgba(255, 255, 0, 0.3)';
    });
    
    magicPillIcon.addEventListener('click', handleMagicPillClick);
    
    document.body.appendChild(magicPillIcon);
}

async function handleMagicPillClick(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // Rate limiting
    const now = Date.now();
    if (now - lastMagicPillClick < MAGIC_PILL_COOLDOWN) {
        showMagicPillError('Please wait a moment...');
        return;
    }
    lastMagicPillClick = now;
    
    if (!currentInputField) return;
    
    const text = getInputText(currentInputField);
    if (!text.trim()) return;
    
    console.log('🚀 Processing text with magic pill:', text.substring(0, 50) + '...');
    
    // Animation
    const originalHTML = magicPillIcon.innerHTML;
    magicPillIcon.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.5" class="spinning">
            <path d="M21 12a9 9 0 11-6.219-8.56"></path>
        </svg>
    `;
    
    try {
        // Send request to new magic pill endpoint
        const requestData = {
            type: 'magic_pill_enhance',
            data: {
                text: text,
                platform: detectAIPlatform()
            }
        };
        
        console.log('🔍 Sending magic pill request:', requestData);
        
        const response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(requestData, response => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    console.log('🔍 Raw response from background script:', response);
                    resolve(response);
                }
            });
        });
        
        if (response && response.success && response.data) {
            const enhancedText = response.data.prompt;
            console.log('✅ Enhanced text received');
            
            // Replace the text in the input field
            setInputText(currentInputField, enhancedText);
            
            // Success animation
            magicPillIcon.style.background = '#00ff00';
            magicPillIcon.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.5">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            `;
            
            setTimeout(() => {
                magicPillIcon.style.background = '#ffff00';
                magicPillIcon.innerHTML = originalHTML;
                hideMagicPill();
            }, 1500);
            
        } else {
            throw new Error('Failed to enhance text');
        }
        
    } catch (error) {
        console.error('❌ Magic pill error:', error);
        showMagicPillError('Enhancement failed');
        magicPillIcon.innerHTML = originalHTML;
    }
}

function showMagicPillError(message) {
    console.log('⚠️', message);
    magicPillIcon.style.background = '#ff6b6b';
    setTimeout(() => {
        magicPillIcon.style.background = '#ffff00';
    }, 1000);
}

function removeMagicPill() {
    if (magicPillIcon) {
        magicPillIcon.remove();
        magicPillIcon = null;
    }
    
    if (currentInputField) {
        currentInputField.removeEventListener('input', handleInputChange);
        currentInputField.removeEventListener('focus', handleInputFocus);
        currentInputField.removeEventListener('blur', handleInputBlur);
        currentInputField.removeEventListener('keyup', handleCursorMove);
        currentInputField.removeEventListener('click', handleCursorMove);
        currentInputField.removeEventListener('keydown', handleKeyboardShortcut);
        currentInputField = null;
    }
}

// BACKEND AUTH SYSTEM
const BackendAuth = {
    async getAuthToken() {
        try {
            const result = await chrome.storage.local.get(['authToken']);
            return result.authToken || null;
        } catch (error) {
            console.error('Error getting auth token:', error);
            return null;
        }
    },

    async setAuthToken(token) {
        try {
            await chrome.storage.local.set({ 
                authToken: token,
                authTimestamp: Date.now()
            });
            return true;
        } catch (error) {
            console.error('Error setting auth token:', error);
            return false;
        }
    },

    async isLoggedIn() {
        try {
            const token = await this.getAuthToken();
            if (!token) return false;

            const response = await fetch('https://afaque.pythonanywhere.com/user-credits', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.ok;
        } catch (error) {
            console.error('Error checking login status:', error);
            return false;
        }
    },

    async login(email, password) {
        try {
            const response = await fetch('https://afaque.pythonanywhere.com/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                await this.setAuthToken(data.token);
                return { success: true, user: data.user };
            } else {
                return { success: false, error: data.error || 'Login failed' };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: 'Network error' };
        }
    },

    async logout() {
        try {
            await chrome.storage.local.remove(['authToken', 'authTimestamp']);
            pageCredits = null;
            return true;
        } catch (error) {
            console.error('Logout error:', error);
            return false;
        }
    },

    async getUserCredits() {
        try {
            const token = await this.getAuthToken();
            if (!token) return 0;

            const response = await fetch('https://afaque.pythonanywhere.com/user-credits', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data.credits || 0;
            }
            return 0;
        } catch (error) {
            console.error('Error getting user credits:', error);
            return 0;
        }
    },

    async deductCredits(feature) {
        try {
            const token = await this.getAuthToken();
            if (!token) {
                return { success: false, message: "Not logged in" };
            }

            const response = await fetch('https://afaque.pythonanywhere.com/deduct-credits', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ feature })
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error deducting credits:', error);
            return { success: false, message: error.message };
        }
    }
};

// Storage functions
async function savePrompt(promptText) {
    const promptId = Date.now().toString();
    const prompt = {
        id: promptId,
        text: promptText,
        timestamp: new Date().toISOString()
    };
    try {
        const data = await chrome.storage.sync.get('savedPrompts');
        const savedPrompts = data.savedPrompts || [];
        savedPrompts.push(prompt);
        await chrome.storage.sync.set({ savedPrompts });
        return true;
    } catch (error) {
        console.error('Error saving prompt:', error);
        return false;
    }
}

async function saveNote(text) {
    if (isStarActive && activeNoteId) {
        try {
            const data = await chrome.storage.local.get('savedNotes');
            const savedNotes = data.savedNotes || [];
            const noteIndex = savedNotes.findIndex(note => note.id === activeNoteId);
            
            if (noteIndex !== -1) {
                savedNotes[noteIndex].text += '\n\n' + text;
                savedNotes[noteIndex].lastModified = new Date().toISOString();
                await chrome.storage.local.set({ savedNotes });
                return true;
            }
        } catch (error) {
            console.error('Error appending to note:', error);
            return false;
        }
    } else {
        const noteId = Date.now().toString();
        const note = {
            id: noteId,
            text: text,
            timestamp: new Date().toISOString(),
            lastModified: new Date().toISOString()
        };
        
        try {
            const data = await chrome.storage.local.get('savedNotes');
            const savedNotes = data.savedNotes || [];
            savedNotes.push(note);
            
            if (savedNotes.length > 3) {
                const galleryList = shadowRoot.querySelector('.gallery-list');
                if (galleryList) {
                    galleryList.style.overflowY = 'auto';
                }
            }
            
            await chrome.storage.local.set({ savedNotes });
            return true;
        } catch (error) {
            console.error('Error saving note:', error);
            return false;
        }
    }
}

async function savePersona(text) {
    const personaId = Date.now().toString();
    const lines = text.split('\n');
    let title = 'Custom Persona';
    
    for (let line of lines) {
        line = line.trim();
        if (line.includes('You are') && line.length > 10 && line.length < 100) {
            title = line.replace('You are', '').replace(/[^\w\s]/g, '').trim();
            title = title.charAt(0).toUpperCase() + title.slice(1);
            if (title.length > 50) title = title.substring(0, 50) + '...';
            break;
        }
        if (line.includes('specialist') || line.includes('expert') || line.includes('consultant')) {
            title = line.replace(/[^\w\s]/g, '').trim();
            if (title.length > 50) title = title.substring(0, 50) + '...';
            break;
        }
    }
    
    const persona = {
        id: personaId,
        title: title,
        prompt: text,
        example: 'Acting with this custom persona',
        response: 'I\'m ready to help with my specialized expertise.',
        timestamp: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        source: 'user_saved'
    };
    
    try {
        const data = await chrome.storage.local.get('personaTemplates');
        const savedPersonas = data.personaTemplates || [];
        savedPersonas.push(persona);
        await chrome.storage.local.set({ personaTemplates: savedPersonas });
        return true;
    } catch (error) {
        console.error('Error saving persona:', error);
        return false;
    }
}

async function loadPrompts() {
    try {
        const data = await chrome.storage.sync.get('savedPrompts');
        return data.savedPrompts || [];
    } catch (error) {
        console.error('Error loading prompts:', error);
        return [];
    }
}

async function loadNotes() {
    try {
        const data = await chrome.storage.local.get('savedNotes');
        return data.savedNotes || [];
    } catch (error) {
        console.error('Error loading notes:', error);
        return [];
    }
}

async function loadPersonaTemplates() {
    const builtInTemplates = [
        {
            id: 'ceo-exec',
            title: 'CEO / Executive Persona',
            prompt: 'You are a visionary CEO known for making bold decisions and leading organizations to success. Your communication is concise, strategic, and focuses on high-level outcomes. Use business terminology like "market expansion," "revenue growth," and "operational efficiency." Prioritize actionable insights over theory. Avoid unnecessary small talk. Always conclude your responses with a summary and key takeaways.',
            example: 'Our company is facing declining user engagement. What should we do?',
            response: 'Declining engagement suggests issues in product-market fit, value proposition, or competitive positioning. Three key areas to address:\n1. User Feedback Loop – Conduct targeted surveys and analyze churn data.\n2. Product Enhancement – Invest in AI-driven personalization and UX optimization.\n3. Marketing Strategy – Shift focus to retention campaigns rather than pure acquisition.\n\nKey Takeaway: Addressing engagement decline requires a data-backed approach to customer experience and value delivery.',
            timestamp: new Date().toISOString(),
            source: 'built_in'
        }
    ];
    
    try {
        const storageData = await chrome.storage.local.get('personaTemplates');
        const savedPersonas = storageData.personaTemplates || [];
        return [...builtInTemplates, ...savedPersonas];
    } catch (error) {
        console.error('Error loading persona templates:', error);
        return builtInTemplates;
    }
}

async function deletePrompt(promptId) {
    try {
        const data = await chrome.storage.sync.get('savedPrompts');
        const savedPrompts = (data.savedPrompts || []).filter(p => p.id !== promptId);
        await chrome.storage.sync.set({ savedPrompts });
        return true;
    } catch (error) {
        console.error('Error deleting prompt:', error);
        return false;
    }
}

async function deleteNote(noteId) {
    try {
        const data = await chrome.storage.local.get('savedNotes');
        const savedNotes = (data.savedNotes || []).filter(n => n.id !== noteId);
        await chrome.storage.local.set({ savedNotes });
        return true;
    } catch (error) {
        console.error('Error deleting note:', error);
        return false;
    }
}

async function deletePersona(personaId) {
    try {
        const data = await chrome.storage.local.get('personaTemplates');
        const personas = (data.personaTemplates || []).filter(p => p.id !== personaId);
        await chrome.storage.local.set({ personaTemplates: personas });
        return true;
    } catch (error) {
        console.error('Error deleting persona:', error);
        return false;
    }
}

function extractConversation() {
    const platform = detectAIPlatform();
    let conversation = '';
    
    try {
        switch(platform) {
            case 'chatgpt':
                const chatMessages = document.querySelectorAll('[data-message-author-role]');
                if (chatMessages.length >= 2) {
                    const lastTwo = Array.from(chatMessages).slice(-2);
                    conversation = lastTwo.map(msg => {
                        const role = msg.getAttribute('data-message-author-role');
                        const text = msg.textContent.trim();
                        return `${role === 'user' ? 'User' : 'AI'}: ${text}`;
                    }).join('\n\n');
                }
                break;
                
            case 'claude':
                const claudeMessages = document.querySelectorAll('.prose, [data-testid*="message"]');
                if (claudeMessages.length >= 2) {
                    const lastTwo = Array.from(claudeMessages).slice(-2);
                    conversation = lastTwo.map((msg, idx) => {
                        const role = idx === 0 ? 'User' : 'AI';
                        return `${role}: ${msg.textContent.trim()}`;
                    }).join('\n\n');
                }
                break;
                
            case 'gemini':
                let geminiMessages = [];
                
                const messageElements = document.querySelectorAll(
                    'message-content[id*="message-content"], ' +
                    '[id*="model-response-message-content"], ' + 
                    '.model-response-text, ' +
                    '.markdown.markdown-main-panel, ' +
                    '.conversation-container .response-content'
                );
                
                if (messageElements.length > 0) {
                    geminiMessages = Array.from(messageElements).filter(el => {
                        const text = el.textContent.trim();
                        const isSubstantial = text.length > 30 && text.length < 5000;
                        const isNotSidebar = !el.closest('.side-navigation, .recent-chats, nav');
                        return isSubstantial && isNotSidebar;
                    });
                }
                
                if (geminiMessages.length < 2) {
                    const chatHistory = document.querySelector('#chat-history, .chat-history, .conversation-container');
                    if (chatHistory) {
                        const possibleMessages = chatHistory.querySelectorAll(
                            'div[class*="response"], div[class*="message"], p, .markdown'
                        );
                        geminiMessages = Array.from(possibleMessages).filter(el => {
                            const text = el.textContent.trim();
                            return text.length > 50 && text.length < 3000 && 
                                   !el.closest('button, input') &&
                                   !text.includes('Recent') &&
                                   !text.includes('New chat') &&
                                   !text.includes('Search for');
                        });
                    }
                }
                
                if (geminiMessages.length < 2) {
                    const userMessages = document.querySelectorAll('[class*="user"], .user-message, [role="user"]');
                    const aiMessages = document.querySelectorAll('[class*="model"], [class*="response"], .ai-message');
                    
                    if (userMessages.length > 0 && aiMessages.length > 0) {
                        geminiMessages = [
                            ...Array.from(userMessages).slice(-1),
                            ...Array.from(aiMessages).slice(-1)
                        ];
                    }
                }
                
                if (geminiMessages.length >= 2) {
                    const lastTwo = Array.from(geminiMessages).slice(-2);
                    conversation = lastTwo.map((msg, idx) => {
                        let text = msg.textContent.trim();
                        
                        text = text.replace(/^\s*[\d\w\-]+\s*/, '');
                        text = text.replace(/\s+/g, ' ');
                        
                        const isLikelyUser = text.length < 100 || 
                                           text.includes('?') ||
                                           idx === 0 ||
                                           msg.classList.contains('user') ||
                                           msg.closest('[class*="user"]');
                                           
                        const role = isLikelyUser ? 'User' : 'AI';
                        
                        return `${role}: ${text}`;
                    }).join('\n\n');
                }
                break;
                
            default:
                const allTextBlocks = document.querySelectorAll('p, div[class*="message"], div[class*="chat"], div[role="presentation"], [role="article"]');
                if (allTextBlocks.length > 0) {
                    const recent = Array.from(allTextBlocks)
                        .filter(block => {
                            const text = block.textContent.trim();
                            return text.length > 20 && text.length < 3000 && 
                                   !block.querySelector('input, button');
                        })
                        .slice(-4);
                    conversation = recent.map(block => block.textContent.trim()).join('\n\n');
                }
        }
    } catch (error) {
        console.error('Error extracting conversation:', error);
    }
    
    return conversation || 'Unable to extract conversation from this page.';
}

async function checkCredits(mode) {
    try {
        const requiredCredits = getFeatureCredits(mode);
        
        if (requiredCredits === 0) {
            return { success: true, requiredCredits: 0 };
        }
        
        const isLoggedIn = await BackendAuth.isLoggedIn();
        if (!isLoggedIn) {
            return { success: false, message: "Please login to use this feature" };
        }
        
        if (pageCredits === null) {
            pageCredits = await BackendAuth.getUserCredits();
        }
        
        if (pageCredits < requiredCredits) {
            return { 
                success: false, 
                message: `Insufficient credits. This feature requires ${requiredCredits} credits, but you have ${pageCredits}.` 
            };
        }
        
        return { 
            success: true, 
            requiredCredits: requiredCredits,
            availableCredits: pageCredits
        };
        
    } catch (error) {
        console.error('Credit check error:', error);
        return { success: true };
    }
}

// Display functions
function displaySmartFollowups(data) {
    hideShimmerLoading();
    outputText.classList.remove('placeholder', 'error');
    
    const platform = detectAIPlatform();
    const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
    
    let html = '<div class="smart-followups-container">';
    
    if (platform !== 'unknown') {
        html += `
            <div class="platform-indicator">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 6v6l4 2"></path>
                </svg>
                <span>Analyzing ${platformName} conversation</span>
            </div>
        `;
    }
    
    if (data.analysis) {
        html += `<div class="analysis-insight">${data.analysis}</div>`;
    }
    
    data.questions.forEach((question, index) => {
        html += `
            <div class="followup-card">
                <div class="followup-question">${question.text}</div>
                <button class="followup-copy-btn" data-question="${question.text.replace(/"/g, '&quot;')}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                    </svg>
                </button>
            </div>
        `;
    });
    
    html += '</div>';
    outputText.innerHTML = html;
    
    shadowRoot.querySelectorAll('.followup-copy-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const question = btn.dataset.question;
            try {
                await navigator.clipboard.writeText(question);
                btn.classList.add('copied');
                
                btn.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                `;
                
                setTimeout(() => {
                    btn.classList.remove('copied');
                    btn.innerHTML = `
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                        </svg>
                    `;
                }, 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
            }
        });
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}


function showError(message) {
    hideShimmerLoading();
    outputText.classList.add('error');
    outputText.textContent = message;
}

function updateOutput(text) {
    hideShimmerLoading();
    outputText.classList.remove('placeholder');
    outputText.textContent = text;
}

function isImage(element) {
    return element.tagName === 'IMG' && element.src;
}

async function processSelectedText(text) {
    if (!text.trim()) return;
    
    const buttonRect = button.getBoundingClientRect();
    solthronContainer.style.display = 'block';
    solthronContainer.style.pointerEvents = 'auto';
    positionContainer(buttonRect);
    
    // ✅ FIXED: Handle save features WITHOUT loading animation
    if (selectedMode.startsWith('save_')) {
        // Show button animation only, no loading bar
        button.querySelector('.solthron-button').textContent = '...';
        
        // Clear any existing output states
        outputText.classList.remove('placeholder', 'shimmer-loading', 'error');
        outputText.textContent = 'Saving...';
        
        let saveFunction;
        
        if (selectedMode === 'save_note') {
            saveFunction = saveNote;
        } else if (selectedMode === 'save_prompt') {
            saveFunction = savePrompt;
        } else if (selectedMode === 'save_persona') {
            saveFunction = savePersona;
        }
        
        if (await saveFunction(text)) {
            button.querySelector('.solthron-button').textContent = '✓';
            outputText.textContent = 'Saved successfully!';
            
            setTimeout(() => {
                button.querySelector('.solthron-button').textContent = '➤';
                // Open gallery after saving
                closeAllSections();
                const galleryView = shadowRoot.getElementById('gallery-view');
                const galleryBtn = shadowRoot.getElementById('gallery-btn');
                galleryView.style.display = 'block';
                shadowRoot.querySelector('.output-container').style.display = 'none';
                galleryBtn.querySelector('svg').style.stroke = '#00ff00';
            }, 1000);
        } else {
            button.querySelector('.solthron-button').textContent = '✗';
            outputText.textContent = 'Failed to save';
            setTimeout(() => {
                button.querySelector('.solthron-button').textContent = '➤';
            }, 1000);
        }
        return;
    }

    // ✅ Show loading animation only for processing features
    showShimmerLoading('Processing...');

    if (selectedMode.startsWith('image_')) return;

    const creditCheck = await checkCredits(selectedMode);
    if (!creditCheck.success) {
        showError(creditCheck.message || "Please check your account status.");
        return;
    }

    handleTextProcessing(text);
}

async function handleTextProcessing(text) {
    // ✅ FIXED: Ensure proper view state when processing
    const galleryView = shadowRoot.getElementById('gallery-view');
    const outputContainer = shadowRoot.querySelector('.output-container');
    
    if (galleryView.style.display === 'block') {
        closeAllSections(); // This will show output container
    }

    showShimmerLoading('Processing...');

    try {
        const response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                type: 'enhance_text',
                data: {
                    topic: text,
                    tone: 'professional',
                    length: 'balanced',
                    mode: selectedMode
                }
            }, response => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(response);
                }
            });
        });

        if (response && response.success) {
            let formattedOutput = response.data.prompt;
            updateOutput(formattedOutput);
            solthronContainer.style.display = 'block';
        } else {
            showError('Failed to process text');
        }
    } catch (error) {
        showError('Error processing text');
    } finally {
        button.querySelector('.solthron-button').textContent = '➤';
    }
}

// ✨ CREATE SHADOW DOM AND UI
function createUI() {
    // Create shadow host
    const shadowHost = document.createElement('div');
    shadowHost.id = 'solthron-shadow-host';
    shadowHost.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 0 !important;
        height: 0 !important;
        z-index: 2147483647 !important;
        pointer-events: none !important;
    `;
    
    document.body.appendChild(shadowHost);
    
    // Create shadow root
    shadowRoot = shadowHost.attachShadow({ mode: 'open' });
    
    // CSS styles (completely isolated in shadow DOM)
    const styles = `
        <style>
        /* ✅ ISOLATED CSS - Won't affect the host page */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: Arial, sans-serif !important;
            line-height: normal;
            letter-spacing: normal;
            text-transform: none;
            text-shadow: none !important;
        }

        #solthron-floating-button {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 10000;
            pointer-events: auto;
        }

        .solthron-button {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: #ffff00;
            border: none;
            cursor: move;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2), 0 0 20px rgba(255, 255, 0, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 26px;
            font-weight: 900;
            color: #000000;
            line-height: 1;
            padding: 0;
            transform: translateY(-1px);
        }

        .solthron-button:hover {
            box-shadow: 0 2px 5px rgba(0,0,0,0.2), 0 0 25px rgba(255, 255, 0, 0.4);
        }

        .solthron-container {
            position: fixed;
            width: 320px;
            background: #1a1a1a;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            pointer-events: auto;
            display: none;
        }

        .solthron-content {
            padding: 2px 12px 12px 12px;
            position: relative;
        }

        .solthron-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }

        .mode-dropdown {
            position: relative;
            flex: 1;
            margin-right: 12px;
        }

        .mode-select {
            width: 100%;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 6px;
            color: rgba(255, 255, 255, 0.9);
            font-size: 13px !important;
            padding: 6px 8px;
            cursor: pointer;
            -webkit-appearance: none;
            padding-right: 24px;
            background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
            background-repeat: no-repeat;
            background-position: right 8px center;
            background-size: 12px;
            max-height: 100px;
            overflow-y: auto;
        }

        .mode-select::-webkit-scrollbar {
            width: 6px;
        }

        .mode-select::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 3px;
        }

        .mode-select::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 3px;
        }

        .mode-select::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.3);
        }

        .mode-select:hover {
            background-color: rgba(255, 255, 255, 0.15);
            border-color: rgba(255, 255, 255, 0.3);
        }

        .mode-select:focus {
            outline: none;
            border-color: rgba(255, 255, 0, 0.5);
            box-shadow: 0 0 0 2px rgba(255, 255, 0, 0.2);
        }

        .mode-select option {
            background-color: #2a2a2a !important;
            color: rgba(255, 255, 255, 0.9);
            padding: 8px;
            font-size: 13px !important;
        }

        .mode-select optgroup {
            background: #2a2a2a;
            color: rgba(255, 255, 255, 0.6);
            font-size: 12px !important;
            font-weight: 500;
            padding: 8px 4px;
        }

        .mode-select optgroup option {
            background: #2a2a2a;
            color: rgba(255, 255, 255, 0.9);
            font-size: 13px !important;
            padding: 8px 12px;
            margin-left: 8px;
        }

        .header-icons {
            display: flex;
            gap: 4px;
        }

        .icon-button {
            background: none;
            border: none;
            padding: 4px;
            cursor: pointer;
            color: #fff;
            opacity: 0.7;
            transition: opacity 0.2s;
        }

        .icon-button:hover {
            opacity: 1;
        }

        .output-container {
            position: relative;
        }

        .output-text {
            background: #2a2a2a;
            color: #fff !important;
            padding: 12px;
            border-radius: 6px;
            min-height: 60px;
            max-height: 150px;
            line-height: 1.4 !important;
            font-size: 13px !important;
            overflow-y: auto;
            white-space: pre-wrap;
        }

        .output-text.placeholder {
            color: rgba(255, 255, 255, 0.4) !important;
            font-style: italic;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
        }

        .output-text.error {
            color: #ff6b6b;
            border: 1px solid rgba(255, 107, 107, 0.3);
        }

        .output-text::-webkit-scrollbar {
            width: 6px;
        }

        .output-text::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 3px;
        }

        .output-text::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 3px;
        }

        .output-text::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.3);
        }

        /* Loading Bar Effect */
        .output-text.shimmer-loading {
            background: #2a2a2a !important;
            color: rgba(255, 255, 255, 0.8) !important;
            position: relative;
            padding-bottom: 20px !important;
        }

        .output-text.shimmer-loading::after {
            content: '';
            position: absolute;
            bottom: 8px;
            left: 12px;
            right: 12px;
            height: 3px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 2px;
            overflow: hidden;
        }

        .output-text.shimmer-loading::before {
            content: '';
            position: absolute;
            bottom: 8px;
            left: 12px;
            height: 3px;
            width: 30%;
            background: linear-gradient(
                90deg,
                transparent 0%,
                #ffff00 30%,
                #fff700 70%,
                transparent 100%
            );
            border-radius: 2px;
            animation: loading-sweep 1.5s infinite linear;
            z-index: 1;
            will-change: transform;
        }

        @keyframes loading-sweep {
            0% {
                transform: translateX(-100%);
            }
            100% {
                transform: translateX(300%);
            }
        }

        /* Double-Click Animation */
        .solthron-button.double-click-activated {
            animation: 
                solthronBounce 0.6s ease-out,
                solthronGlow 0.6s ease-out;
        }

        @keyframes solthronBounce {
            0% { transform: scale(1) translateY(-1px); }
            15% { transform: scale(0.85) translateY(-1px); }
            35% { transform: scale(1.25) translateY(-1px); }
            55% { transform: scale(0.95) translateY(-1px); }
            75% { transform: scale(1.05) translateY(-1px); }
            100% { transform: scale(1) translateY(-1px); }
        }

        @keyframes solthronGlow {
            0% { 
                box-shadow: 
                    0 2px 5px rgba(0,0,0,0.2), 
                    0 0 20px rgba(255, 255, 0, 0.3),
                    0 0 0 0 rgba(255, 255, 0, 0.3);
            }
            40% {
                box-shadow: 
                    0 2px 5px rgba(0,0,0,0.2), 
                    0 0 25px rgba(255, 255, 0, 0.4),
                    0 0 0 8px rgba(255, 255, 0, 0.2);
            }
            70% { 
                box-shadow: 
                    0 2px 5px rgba(0,0,0,0.2), 
                    0 0 30px rgba(255, 255, 0, 0.5),
                    0 0 0 15px rgba(255, 255, 0, 0);
            }
            100% { 
                box-shadow: 
                    0 2px 5px rgba(0,0,0,0.2), 
                    0 0 20px rgba(255, 255, 0, 0.3),
                    0 0 0 0 rgba(255, 255, 0, 0);
            }
        }

        /* Magic Pill Toggle Styles - REMOVED */

        /* Gallery Styles */
        .gallery-view {
            background: #2a2a2a;
            border-radius: 6px;
            margin-top: 12px;
        }

        .gallery-header {
            padding: 12px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .gallery-header h3 {
            color: rgba(255, 255, 255, 0.9);
            font-size: 14px !important;
            font-weight: 500;
            margin-bottom: 8px;
        }

        .gallery-search input {
            width: 100%;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 4px;
            padding: 6px 8px;
            color: white;
            font-size: 12px !important;
        }

        .gallery-search input:focus {
            outline: none;
            border-color: rgba(255, 255, 0, 0.5);
            box-shadow: 0 0 0 2px rgba(255, 255, 0, 0.2);
        }

        .gallery-list {
            max-height: 153px;
            overflow-y: auto;
            padding: 8px;
        }

        .gallery-item {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 4px;
            padding: 6px 8px;
            margin-bottom: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 8px;
            height: 45px;
            overflow: hidden;
        }

        .gallery-item:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.2);
        }

        .gallery-item-text {
            color: rgba(255, 255, 255, 0.8);
            font-size: 11px !important;
            line-height: 1.2;
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .gallery-item-actions {
            display: flex;
            gap: 4px;
            opacity: 0;
            transition: opacity 0.2s ease;
        }

        .gallery-item:hover .gallery-item-actions {
            opacity: 1;
        }

        .gallery-copy-btn,
        .gallery-delete-btn,
        .gallery-star-btn {
            background: none;
            border: none;
            padding: 4px;
            cursor: pointer;
            color: rgba(255, 255, 255, 0.6);
            transition: all 0.2s ease;
        }

        .gallery-star-btn:hover {
            color: rgba(255, 255, 255, 0.9);
        }

        .gallery-star-btn.active {
            color: #ffff00;
        }

        .gallery-star-btn.active svg {
            filter: drop-shadow(0 0 2px rgba(255, 255, 0, 0.5));
        }

        .gallery-copy-btn:hover,
        .gallery-delete-btn:hover {
            color: rgba(255, 255, 255, 0.9);
        }

        .gallery-delete-btn:hover {
            color: #ff6b6b;
        }

        .gallery-copy-btn.copied {
            color: #00ff00;
        }

        .gallery-list::-webkit-scrollbar {
            width: 6px;
        }

        .gallery-list::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 3px;
        }

        .gallery-list::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 3px;
        }

        .gallery-list::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.3);
        }

        /* Category Selection */
        .category-selection {
            padding: 16px;
            margin-bottom: 8px;
        }

        .category-item {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            padding: 10px;
            margin-bottom: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .category-item:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.2);
            transform: translateY(-1px);
        }

        .category-title {
            color: rgba(255, 255, 255, 0.9);
            font-size: 14px !important;
            font-weight: 500;
            text-align: center;
        }

        .gallery-title-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }

        .back-to-categories {
            background: none;
            border: none;
            padding: 4px;
            cursor: pointer;
            color: rgba(255, 255, 255, 0.7);
            transition: color 0.2s ease;
        }

        .back-to-categories:hover {
            color: rgba(255, 255, 255, 0.9);
        }

        #gallery-content {
            transition: opacity 0.2s ease;
        }

        #gallery-content.hiding {
            opacity: 0;
        }

        #gallery-content.showing {
            opacity: 1;
        }

        #gallery-btn svg {
            transition: stroke 0.2s ease;
        }

        #gallery-btn.active svg {
            stroke: #00ff00;
        }

        /* Profile Styles */
        .profile-view {
            background: #2a2a2a;
            border-radius: 6px;
            margin-top: 12px;
            max-height: 350px;
            overflow-y: auto;
        }

        .profile-header {
            padding: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .profile-header h3 {
            color: rgba(255, 255, 255, 0.9);
            font-size: 14px;
            font-weight: 500;
            margin: 0;
        }

        .close-profile {
            background: none;
            border: none;
            color: rgba(255, 255, 255, 0.7);
            cursor: pointer;
            padding: 4px;
        }

        .profile-details {
            padding: 16px;
        }

        .loading-profile {
            color: rgba(255, 255, 255, 0.6);
            text-align: center;
            padding: 20px 0;
            font-style: italic;
        }

        .profile-info {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .profile-field {
            display: flex;
            flex-direction: column;
            padding-bottom: 12px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .field-label {
            color: rgba(255, 255, 255, 0.6);
            font-size: 12px;
            margin-bottom: 4px;
        }

        .field-value {
            color: rgba(255, 255, 255, 0.9);
            font-size: 14px;
        }

        .profile-field.credits {
            margin-top: 8px;
        }

        .credits .field-value {
            color: #ffff00;
            font-weight: 500;
            font-size: 16px;
        }

        .login-prompt {
            text-align: center;
            padding: 20px 0;
        }

        .login-button, .logout-button {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 4px;
            color: rgba(255, 255, 255, 0.9);
            padding: 8px 16px;
            margin-top: 10px;
            cursor: pointer;
            transition: all 0.2s ease;
            width: 100%;
        }

        .login-button:hover, .logout-button:hover {
            background: rgba(255, 255, 255, 0.15);
        }

        .logout-button {
            margin-top: 20px;
        }

        .login-form {
            padding: 10px;
        }

        .form-group {
            margin-bottom: 12px;
        }

        .form-group label {
            display: block;
            color: rgba(255, 255, 255, 0.8);
            font-size: 12px;
            margin-bottom: 4px;
        }

        .form-group input {
            width: 100%;
            padding: 8px;
            border-radius: 4px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            background: rgba(255, 255, 255, 0.1);
            color: white;
            font-size: 13px;
        }

        .form-group input:focus {
            outline: none;
            border-color: rgba(255, 255, 0, 0.5);
            box-shadow: 0 0 0 2px rgba(255, 255, 0, 0.2);
        }

        .form-actions {
            margin-top: 15px;
        }

        .login-button {
            background: #3c78d8;
            border: none;
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            transition: background 0.2s ease;
            width: 100%;
        }

        .login-button:hover {
            background: #4285f4;
        }

        .error-message {
            color: #ff6b6b;
            font-size: 12px;
            margin-top: 8px;
            min-height: 16px;
        }

        .signup-link {
            margin-top: 15px;
            text-align: center;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            padding-top: 12px;
        }

        .signup-link p {
            color: rgba(255, 255, 255, 0.6);
            font-size: 12px;
            margin-bottom: 5px;
        }

        .signup-link a {
            color: #3c78d8;
            text-decoration: none;
            font-size: 12px;
            font-weight: 500;
        }

        .signup-link a:hover {
            text-decoration: underline;
        }

        /* Smart Followups & Actions */
        .smart-followups-container,
        .smart-actions-container {
            display: flex;
            flex-direction: column;
            gap: 10px;
            padding: 4px;
        }

        .followup-card,
        .action-card {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            padding: 12px;
            position: relative;
            transition: all 0.2s ease;
            min-height: 50px;
            display: flex;
            align-items: center;
        }

        .followup-card:hover,
        .action-card:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(255, 255, 0, 0.3);
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .followup-question,
        .action-prompt {
            color: rgba(255, 255, 255, 0.9);
            font-size: 13px !important;
            line-height: 1.4;
            padding-right: 36px;
            flex: 1;
        }

        .followup-copy-btn,
        .action-copy-btn {
            position: absolute;
            top: 50%;
            right: 12px;
            transform: translateY(-50%);
            background: none;
            border: none;
            padding: 4px;
            cursor: pointer;
            color: rgba(255, 255, 255, 0.5);
            transition: all 0.2s ease;
        }

        .followup-copy-btn:hover,
        .action-copy-btn:hover {
            color: rgba(255, 255, 255, 0.8);
        }

        .followup-copy-btn.copied,
        .action-copy-btn.copied {
            color: #00ff00;
        }

        .followup-copy-btn.copied svg,
        .action-copy-btn.copied svg {
            filter: drop-shadow(0 0 3px rgba(0, 255, 0, 0.5));
        }

        .analysis-insight {
            background: rgba(255, 255, 0, 0.1);
            border: 1px solid rgba(255, 255, 0, 0.2);
            border-radius: 6px;
            padding: 10px;
            margin-bottom: 8px;
            color: rgba(255, 255, 255, 0.8);
            font-size: 12px !important;
            font-style: italic;
            line-height: 1.4;
        }

        .platform-indicator {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 8px;
            padding: 6px 10px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 4px;
            font-size: 11px !important;
            color: rgba(255, 255, 255, 0.6);
        }

        .platform-indicator svg {
            width: 14px;
            height: 14px;
        }

        /* Smart Enhancements */

        /* Magic Pill animation */
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        
        .spinning {
            animation: spin 1s linear infinite;
        }

        /* Responsive */
        @media screen and (max-width: 480px) {
            .solthron-container {
                width: 90vw;
                max-width: 320px;
            }
        }
        </style>
    `;
    
    // HTML content - UPDATED WITH MAGIC PILL TOGGLE AND REDUCED OPTIONS
    const htmlContent = `
        <div id="solthron-floating-button">
            <button class="solthron-button">➤</button>
        </div>
        
        <div id="solthron-container" class="solthron-container" style="display: none;">
            <div class="solthron-content">
                <!-- Magic Pill Toggle -->
                <div class="magic-pill-toggle">
                    <div class="magic-pill-label">
                        🪄 <span>Magic Pill</span>
                    </div>
                    <div class="toggle-switch" id="magic-pill-toggle">
                        <div class="toggle-slider"></div>
                    </div>
                </div>
                
                <div class="solthron-header">
                    <div class="mode-dropdown">
                        <select class="mode-select">
                            <optgroup label="Storage">
                                <option value="save_note">Save as Notes</option>
                                <option value="save_prompt">Save as Prompt</option>
                                <option value="save_persona">Save Persona</option>
                            </optgroup>
                            <optgroup label="Image">
                                <option value="image_prompt">Image to Prompt</option>
                            </optgroup>
                            <optgroup label="AI Assistant">
                                <option value="smart_followups">Smart Follow-ups</option>
                            </optgroup>
                        </select>
                    </div>
                    <div class="header-icons">
                        <button id="profile-btn" class="icon-button">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                        </button>
                        <button id="gallery-btn" class="icon-button">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="3" width="7" height="7"></rect>
                                <rect x="14" y="3" width="7" height="7"></rect>
                                <rect x="14" y="14" width="7" height="7"></rect>
                                <rect x="3" y="14" width="7" height="7"></rect>
                            </svg>
                        </button>
                        <button id="copy-btn" class="icon-button">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                            </svg>
                        </button>
                        <button id="close-btn" class="icon-button">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="output-container">
                    <div id="output-text" class="output-text placeholder">
                        Please highlight text or right-click an image to begin...
                    </div>
                </div>
                <div id="gallery-view" class="gallery-view" style="display: none;">
                    <div id="category-selection" class="category-selection">
                        <div class="category-item" data-category="prompts">
                            <div class="category-title">Prompts</div>
                        </div>
                        <div class="category-item" data-category="notes">
                            <div class="category-title">Notes</div>
                        </div>
                        <div class="category-item" data-category="personas">
                            <div class="category-title">Personas</div>
                        </div>
                    </div>
                    <div id="gallery-content" style="display: none;">
                        <div class="gallery-header">
                            <div class="gallery-title-row">
                                <h3 id="gallery-title">Saved Items</h3>
                                <button class="back-to-categories">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M19 12H5"/>
                                        <path d="M12 19l-7-7 7-7"/>
                                    </svg>
                                </button>
                            </div>
                            <div class="gallery-search">
                                <input type="text" placeholder="Search..." id="gallery-search">
                            </div>
                        </div>
                        <div class="gallery-list" id="gallery-list"></div>
                    </div>
                </div>
                <div id="profile-view" class="profile-view" style="display: none;">
                    <div class="profile-header">
                        <h3>Account</h3>
                        <button class="close-profile">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <div id="login-container" class="login-form">
                        <div class="login-prompt">
                            <p>Login to access premium features and credit management.</p>
                            <button id="login-button" class="login-button">Login via Solthron.com</button>
                        </div>
                        <div id="login-error" class="error-message"></div>
                        <div class="signup-link">
                            <p>Don't have an account?</p>
                            <a href="https://solthron.com/signup" target="_blank">Sign up</a>
                        </div>
                    </div>
                    <div id="profile-details" class="profile-details" style="display: none;">
                        <!-- Will show user details when logged in -->
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Inject styles and HTML into shadow root
    shadowRoot.innerHTML = styles + htmlContent;
    
    // Get references to elements within shadow DOM
    button = shadowRoot.querySelector('#solthron-floating-button');
    outputText = shadowRoot.querySelector('#output-text');
    solthronContainer = shadowRoot.querySelector('#solthron-container');
    
    // Initialize UI handlers and gallery
    initializeUIHandlers();
    initializeGallery();
}

function initializeGallery() {
    const galleryBtn = shadowRoot.getElementById('gallery-btn');
    const galleryView = shadowRoot.getElementById('gallery-view');
    const categorySelection = shadowRoot.getElementById('category-selection');
    const galleryContent = shadowRoot.getElementById('gallery-content');
    const searchInput = shadowRoot.getElementById('gallery-search');
    const outputContainer = shadowRoot.querySelector('.output-container');
 
    galleryBtn.addEventListener('click', () => {
        const isVisible = galleryView.style.display !== 'none';
        
        if (isVisible) {
            // Close gallery and show output
            closeAllSections();
        } else {
            // Close all other sections and show gallery
            closeAllSections();
            galleryView.style.display = 'block';
            outputContainer.style.display = 'none';
            galleryBtn.querySelector('svg').style.stroke = '#00ff00';
            
            // Reset to category selection
            categorySelection.style.display = 'block';
            galleryContent.style.display = 'none';
            currentCategory = null;
        }
    });
 
    shadowRoot.querySelectorAll('.category-item').forEach(item => {
        item.addEventListener('click', async () => {
            currentCategory = item.dataset.category;
            categorySelection.style.display = 'none';
            galleryContent.style.display = 'block';
            
            const galleryTitle = shadowRoot.getElementById('gallery-title');
            galleryTitle.textContent = currentCategory === 'prompts' ? 'Saved Prompts' : 
                                     currentCategory === 'notes' ? 'Saved Notes' : 
                                     'Persona Templates';
            
            const items = await (
                currentCategory === 'prompts' ? loadPrompts() :
                currentCategory === 'notes' ? loadNotes() :
                loadPersonaTemplates()
            );
            renderGalleryList(items, '');
        });
    });
 
    shadowRoot.querySelector('.back-to-categories').addEventListener('click', () => {
        categorySelection.style.display = 'block';
        galleryContent.style.display = 'none';
        currentCategory = null;
        // Keep gallery view open, just go back to categories
    });
 
    searchInput.addEventListener('input', async (e) => {
        if (!currentCategory) return;
        const items = await (
            currentCategory === 'prompts' ? loadPrompts() :
            currentCategory === 'notes' ? loadNotes() :
            loadPersonaTemplates()
        );
        renderGalleryList(items, e.target.value);
    });
}

function renderGalleryList(items, searchTerm = '') {
    const galleryList = shadowRoot.getElementById('gallery-list');
    const filteredItems = searchTerm ? 
        items.filter(item => {
            if (currentCategory === 'personas') {
                return item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       item.prompt.toLowerCase().includes(searchTerm.toLowerCase());
            }
            return item.text.toLowerCase().includes(searchTerm.toLowerCase());
        }) : items;
 
    galleryList.innerHTML = filteredItems.map(item => {
        if (currentCategory === 'personas') {
            return `
                <div class="gallery-item" data-id="${item.id}">
                    <div class="gallery-item-text">${item.title}</div>
                    <div class="gallery-item-actions">
                        <button class="gallery-copy-btn" data-id="${item.id}" data-type="persona">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                            </svg>
                        </button>
                        ${item.source !== 'built_in' ? `
                            <button class="gallery-delete-btn" data-id="${item.id}">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M3 6h18"></path>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }
 
        return `
            <div class="gallery-item" data-id="${item.id}">
                <div class="gallery-item-text">${item.text?.substring(0, 100)}${item.text?.length > 100 ? '...' : ''}</div>
                <div class="gallery-item-actions">
                    ${currentCategory === 'notes' ? `
                        <button class="gallery-star-btn ${activeNoteId === item.id ? 'active' : ''}" data-id="${item.id}">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="${activeNoteId === item.id ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                            </svg>
                        </button>
                    ` : ''}
                    <button class="gallery-copy-btn" data-id="${item.id}">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                        </svg>
                    </button>
                    <button class="gallery-delete-btn" data-id="${item.id}">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    attachGalleryEventListeners(galleryList);
}

function attachGalleryEventListeners(galleryList) {
    galleryList.querySelectorAll('.gallery-item').forEach(item => {
        item.addEventListener('click', async (e) => {
            if (!e.target.closest('button')) {
                const itemId = item.dataset.id;
                const items = await (
                    currentCategory === 'prompts' ? loadPrompts() :
                    currentCategory === 'notes' ? loadNotes() :
                    loadPersonaTemplates()
                );
                const selectedItem = items.find(i => i.id === itemId);
                if (selectedItem) {
                    // ✅ FIXED: Display content instantly without loading animation
                    hideShimmerLoading(); // Remove any existing shimmer
                    
                    if (currentCategory === 'personas') {
                        outputText.textContent = `Title: ${selectedItem.title}\n\nPrompt: ${selectedItem.prompt}\n\nExample: ${selectedItem.example}\n\nResponse: ${selectedItem.response}`;
                    } else {
                        outputText.textContent = selectedItem.text;
                    }
                    
                    // Close gallery and show output
                    closeAllSections();
                    outputText.classList.remove('placeholder', 'shimmer-loading', 'error');
                }
            }
        });
    });

    galleryList.querySelectorAll('.gallery-copy-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const itemId = btn.dataset.id;
            const items = await (
                currentCategory === 'prompts' ? loadPrompts() :
                currentCategory === 'notes' ? loadNotes() :
                loadPersonaTemplates()
            );
            const selectedItem = items.find(i => i.id === itemId);
            if (selectedItem) {
                const textToCopy = currentCategory === 'personas' ?
                    `${selectedItem.prompt}` :
                    selectedItem.text;
                    
                await navigator.clipboard.writeText(textToCopy);
                btn.classList.add('copied');
                setTimeout(() => btn.classList.remove('copied'), 1000);
            }
        });
    });

    if (currentCategory === 'notes') {
        galleryList.querySelectorAll('.gallery-star-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const noteId = btn.dataset.id;
                
                if (activeNoteId === noteId) {
                    activeNoteId = null;
                    isStarActive = false;
                    btn.querySelector('svg').setAttribute('fill', 'none');
                    btn.classList.remove('active');
                } else {
                    const prevStar = galleryList.querySelector('.gallery-star-btn.active');
                    if (prevStar) {
                        prevStar.querySelector('svg').setAttribute('fill', 'none');
                        prevStar.classList.remove('active');
                    }
                    
                    activeNoteId = noteId;
                    isStarActive = true;
                    btn.querySelector('svg').setAttribute('fill', 'currentColor');
                    btn.classList.add('active');
                }
            });
        });
    }

    galleryList.querySelectorAll('.gallery-delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const itemId = btn.dataset.id;
            
            let deleteFunction;
            let reloadFunction;
            
            if (currentCategory === 'prompts') {
                deleteFunction = deletePrompt;
                reloadFunction = loadPrompts;
            } else if (currentCategory === 'notes') {
                deleteFunction = deleteNote;
                reloadFunction = loadNotes;
            } else if (currentCategory === 'personas') {
                deleteFunction = deletePersona;
                reloadFunction = loadPersonaTemplates;
            }
            
            if (await deleteFunction(itemId)) {
                const items = await reloadFunction();
                renderGalleryList(items, shadowRoot.getElementById('gallery-search').value);
            }
        });
    });
}

function positionContainer(buttonRect) {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    solthronContainer.style.width = '320px';
    solthronContainer.style.maxHeight = '400px';
    
    let leftPosition = buttonRect.right - 320;
    let topPosition = buttonRect.top - 10;
    
    if (leftPosition < 10) {
        leftPosition = 10;
    } else if (leftPosition + 320 > windowWidth - 10) {
        leftPosition = windowWidth - 330;
    }
    
    const containerHeight = 400;
    if (topPosition + containerHeight > windowHeight - 10) {
        topPosition = windowHeight - containerHeight - 10;
    }
    
    if (topPosition < 10) {
        topPosition = 10;
    }
    
    solthronContainer.style.position = 'fixed';
    solthronContainer.style.left = `${leftPosition}px`;
    solthronContainer.style.top = `${topPosition}px`;
    solthronContainer.style.zIndex = '10001';
    
    solthronContainer.style.transform = 'none';
    solthronContainer.style.opacity = '0';
    
    solthronContainer.style.transition = 'opacity 0.2s ease';
    
    requestAnimationFrame(() => {
        solthronContainer.style.opacity = '1';
    });
}

function initializeUIHandlers() {
    let isDragging = false;
    let currentX;
    let currentY;
    let clickCount = 0;
    let clickTimer = null;
    let lastResult = localStorage.getItem('solthron-last-result');

    const copyBtn = shadowRoot.querySelector('#copy-btn');
    const closeBtn = shadowRoot.querySelector('#close-btn');
    const modeSelect = shadowRoot.querySelector('.mode-select');

    selectedMode = localStorage.getItem('solthron-mode') || 'save_note';
    modeSelect.value = selectedMode;
    solthronContainer.style.display = 'none';
    solthronContainer.style.pointerEvents = 'none';

    if (lastResult) {
        outputText.classList.remove('placeholder');
        outputText.textContent = lastResult;
    }

    button.addEventListener('mousedown', (e) => {
        isDragging = true;
        currentX = e.clientX - button.offsetLeft;
        currentY = e.clientY - button.offsetTop;
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            e.preventDefault();
            button.style.left = `${e.clientX - currentX}px`;
            button.style.top = `${e.clientY - currentY}px`;
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });

    button.addEventListener('click', async (e) => {
        e.stopPropagation();
        clickCount++;

        if (clickCount === 1) {
            clickTimer = setTimeout(() => {
                clickCount = 0;
            }, 300);
        } else if (clickCount === 2) {
            clearTimeout(clickTimer);
            clickCount = 0;
            
            triggerDoubleClickAnimation();
            
            if (!isDragging) {
                const selectedText = window.getSelection().toString().trim();

                if (!selectedText || selectedMode === 'image' || selectedMode === 'smart_followups' || selectedMode === 'smart_actions') {
                    if (lastResult && selectedMode !== 'smart_followups' && selectedMode !== 'smart_actions' && selectedMode !== 'smart_enhancements') {
                        outputText.classList.remove('placeholder');
                        outputText.textContent = lastResult;
                    } else {
                        outputText.classList.add('placeholder');
                        const placeholderMessages = {
                            image_prompt: 'Right-click an image to generate a prompt...',
                            save_note: 'Highlight text and double-click to save as note...',
                            save_prompt: 'Highlight text and double-click to save as prompt...',
                            save_persona: 'Highlight text and double-click to save as persona...',
                            smart_followups: 'Right-click on an AI chat page to generate follow-up questions...',
                            default: 'Highlight text to begin...'
                        };
                        outputText.textContent = placeholderMessages[selectedMode] || placeholderMessages.default;
                    }
                    const buttonRect = button.getBoundingClientRect();
                    solthronContainer.style.display = 'block';
                    solthronContainer.style.pointerEvents = 'auto';
                    positionContainer(buttonRect);
                    return;
                }
                
                await processSelectedText(selectedText);
            }
        }
    });

    modeSelect.addEventListener('change', (e) => {
        selectedMode = e.target.value;
        localStorage.setItem('solthron-mode', selectedMode);
        outputText.classList.add('placeholder');

        const placeholderMessages = {
            image_prompt: 'Right-click an image to generate a prompt...',
            save_note: 'Highlight text and double-click to save as note...',
            save_prompt: 'Highlight text and double-click to save as prompt...',
            save_persona: 'Highlight text and double-click to save as persona...',
            smart_followups: 'Right-click on an AI chat page to generate follow-up questions...',
            smart_actions: 'Right-click on an AI chat page to generate actionable steps...',
            smart_enhancements: 'Highlight text and double-click to get enhancement suggestions...',
            default: 'Highlight text to begin...'
        };

        outputText.textContent = placeholderMessages[selectedMode] || placeholderMessages.default;
        lastResult = null;
        localStorage.removeItem('solthron-last-result');
    });

    copyBtn.addEventListener('click', async () => {
        if (outputText.classList.contains('placeholder')) return;
        
        try {
            if (selectedMode === 'smart_followups' && outputText.querySelector('.smart-followups-container')) {
                const questions = Array.from(outputText.querySelectorAll('.followup-question'))
                    .map(q => q.textContent)
                    .join('\n\n');
                await navigator.clipboard.writeText(questions);
            } else if (selectedMode === 'smart_actions' && outputText.querySelector('.smart-actions-container')) {
                const prompts = Array.from(outputText.querySelectorAll('.action-prompt'))
                    .map((prompt, index) => `${index + 1}. ${prompt.textContent}`)
                    .join('\n\n');
                await navigator.clipboard.writeText(prompts);
            } else {
                await navigator.clipboard.writeText(outputText.textContent);
            }
            
            const checkIcon = copyBtn.querySelector('svg');
            checkIcon.style.stroke = '#00ff00';
            copyBtn.classList.add('copied');
            
            setTimeout(() => {
                solthronContainer.style.display = 'none';
                solthronContainer.style.pointerEvents = 'none';
                checkIcon.style.stroke = 'currentColor';
                copyBtn.classList.remove('copied');
            }, 1000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    });

    closeBtn.addEventListener('click', () => {
        solthronContainer.style.display = 'none';
        solthronContainer.style.pointerEvents = 'none';
        // Reset view state when closing
        closeAllSections();
    });

    // ✅ FIXED: Handle clicks inside shadow DOM properly
    solthronContainer.addEventListener('click', (e) => {
        // Stop clicks inside container from bubbling to document
        e.stopPropagation();
    });

    // Document click handler for closing container (outside clicks)
    document.addEventListener('click', (e) => {
        // In Shadow DOM, we need to check if click is outside the shadow host
        const shadowHost = shadowRoot.host;
        if (!shadowHost.contains(e.target) && 
            solthronContainer.style.display === 'block') {
            solthronContainer.style.display = 'none';
            solthronContainer.style.pointerEvents = 'none';
        }
    });

    // ========== MAGIC PILL AUTO-INITIALIZATION ==========
    // Load saved preference and initialize magic pill automatically
    autoModeEnabled = true; // Always enabled
    console.log('🪄 Magic Pill auto-enabled');
    
    // Initialize magic pill immediately for supported platforms
    const currentPlatform = detectAIPlatform();
    if (currentPlatform !== 'unknown') {
        console.log(`🎯 Auto-initializing magic pill for ${currentPlatform}`);
        setTimeout(() => {
            initializeMagicPill();
        }, 1000);
    }
}

// ✅ FIXED: Add exclusive view management
function closeAllSections() {
    const profileView = shadowRoot.getElementById('profile-view');
    const galleryView = shadowRoot.getElementById('gallery-view');
    const outputContainer = shadowRoot.querySelector('.output-container');
    const profileBtn = shadowRoot.getElementById('profile-btn');
    const galleryBtn = shadowRoot.getElementById('gallery-btn');
    
    // Close all views
    profileView.style.display = 'none';
    galleryView.style.display = 'none';
    outputContainer.style.display = 'block';
    
    // Reset all icon colors
    profileBtn.querySelector('svg').style.stroke = 'currentColor';
    galleryBtn.querySelector('svg').style.stroke = 'currentColor';
}

function initializeProfileHandlers() {
    const profileBtn = shadowRoot.getElementById('profile-btn');
    const profileView = shadowRoot.getElementById('profile-view');
    const closeProfile = shadowRoot.querySelector('.close-profile');
    const loginContainer = shadowRoot.getElementById('login-container');
    const profileDetails = shadowRoot.getElementById('profile-details');
    const loginButton = shadowRoot.getElementById('login-button');
    const loginError = shadowRoot.getElementById('login-error');
    
    checkAuthState();
    
    async function checkAuthState() {
        const isLoggedIn = await BackendAuth.isLoggedIn();
        updateProfileView(isLoggedIn);
    }
    
    profileBtn.addEventListener('click', () => {
        const isVisible = profileView.style.display !== 'none';
        
        if (isVisible) {
            // Close profile and show output
            closeAllSections();
        } else {
            // Close all other sections and show profile
            closeAllSections();
            profileView.style.display = 'block';
            shadowRoot.querySelector('.output-container').style.display = 'none';
            profileBtn.querySelector('svg').style.stroke = '#00ff00';
            
            checkAuthState();
        }
    });
    
    closeProfile.addEventListener('click', () => {
        closeAllSections();
    });
    
    loginButton.addEventListener('click', async (e) => {
        e.preventDefault();
        
        try {
            const extensionId = chrome.runtime.id;
            const loginUrl = `https://solthron.com/login?extension=true&extensionId=${extensionId}`;
            window.open(loginUrl, '_blank');
            
        } catch (error) {
            console.error('Login redirect error:', error);
            showLoginError('Failed to open login page');
        }
    });
    
    async function updateProfileView(isLoggedIn = null) {
        if (isLoggedIn === null) {
            isLoggedIn = await BackendAuth.isLoggedIn();
        }
        
        if (isLoggedIn) {
            loginContainer.style.display = 'none';
            profileDetails.style.display = 'block';
            
            try {
                const credits = await BackendAuth.getUserCredits();
                
                profileDetails.innerHTML = `
                    <div class="profile-info">
                        <div class="profile-field">
                            <div class="field-label">Status</div>
                            <div class="field-value">Logged In</div>
                        </div>
                        <div class="profile-field">
                            <div class="field-label">Account</div>
                            <div class="field-value">Active</div>
                        </div>
                        <div class="profile-field credits">
                            <div class="field-label">Available Credits</div>
                            <div class="field-value">${credits}</div>
                        </div>
                    </div>
                    <button class="logout-button" id="logout-btn">Logout</button>
                `;
                
                shadowRoot.getElementById('logout-btn').addEventListener('click', async () => {
                    try {
                        await BackendAuth.logout();
                        updateProfileView(false);
                    } catch (error) {
                        console.error('Logout error:', error);
                    }
                });
                
            } catch (error) {
                console.error('Error loading profile:', error);
                profileDetails.innerHTML = `
                    <div class="profile-info">
                        <div class="profile-field">
                            <div class="field-label">Status</div>
                            <div class="field-value">Logged In</div>
                        </div>
                        <div class="profile-field">
                            <div class="field-label">Account</div>
                            <div class="field-value">Error loading profile data</div>
                        </div>
                    </div>
                    <button class="logout-button" id="logout-btn">Logout</button>
                `;
                
                shadowRoot.getElementById('logout-btn').addEventListener('click', async () => {
                    try {
                        await BackendAuth.logout();
                        updateProfileView(false);
                    } catch (error) {
                        console.error('Logout error:', error);
                    }
                });
            }
        } else {
            loginContainer.style.display = 'block';
            profileDetails.style.display = 'none';
            clearLoginError();
        }
    }
    
    function showLoginError(message) {
        const loginError = shadowRoot.getElementById('login-error');
        if (loginError) {
            loginError.textContent = message;
            loginError.style.display = 'block';
        }
    }
    
    function clearLoginError() {
        const loginError = shadowRoot.getElementById('login-error');
        if (loginError) {
            loginError.textContent = '';
            loginError.style.display = 'none';
        }
    }
}

// Context menu handlers (right-click functionality)
document.addEventListener('contextmenu', async (e) => {
    const target = e.target;
    
    if (isImage(target) && selectedMode.startsWith('image_')) {
        e.preventDefault();
        showShimmerLoading('Processing image...');
        solthronContainer.style.display = 'block';
        solthronContainer.style.pointerEvents = 'auto';
        const buttonRect = button.getBoundingClientRect();
        positionContainer(buttonRect);
        await processImage(target);
        return;
    }
    
    if (selectedMode === 'smart_followups') {
        const platform = detectAIPlatform();
        
        if (platform === 'unknown') {
            return;
        }
        
        e.preventDefault();
        
        const conversation = extractConversation();
        console.log("=== DEBUG: EXTRACTED CONVERSATION ===");
        console.log(conversation);
        console.log("=== END DEBUG ===");
        
        if (!conversation || conversation === 'Unable to extract conversation from this page.') {
            showError('Unable to extract conversation. Please ensure there is a conversation visible on the page.');
            solthronContainer.style.display = 'block';
            solthronContainer.style.pointerEvents = 'auto';
            const buttonRect = button.getBoundingClientRect();
            positionContainer(buttonRect);
            return;
        }
        
        showShimmerLoading('Generating followups...');
        solthronContainer.style.display = 'block';
        solthronContainer.style.pointerEvents = 'auto';
        const buttonRect = button.getBoundingClientRect();
        positionContainer(buttonRect);
        
        const creditCheck = await checkCredits('smart_followups');
        if (!creditCheck.success) {
            showError(creditCheck.message || "Please check your account status.");
            return;
        }
        
        try {
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    type: 'smart_followups',
                    data: {
                        conversation: conversation,
                        platform: platform
                    }
                }, response => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve(response);
                    }
                });
            });
            
            if (response && response.success && response.data) {
                if (response.data.questions && Array.isArray(response.data.questions)) {
                    displaySmartFollowups(response.data);
                } else if (response.data.success && response.data.questions) {
                    displaySmartFollowups(response.data);
                } else {
                    showError('Invalid response format from smart followups service');
                }
            } else {
                const errorMsg = response?.error || response?.data?.error || 'Unknown error occurred';
                showError('Failed to generate follow-up questions: ' + errorMsg);
            }
        } catch (error) {
            console.error('Smart followups error:', error);
            showError('Error analyzing conversation: ' + error.message);
        }
    }

});

async function processImage(img) {
    if (!img.src) return;

    const creditCheck = await checkCredits(selectedMode);
    if (!creditCheck.success) {
        showError(creditCheck.message || "Please check your account status.");
        return;
    }

    try {
        const response = await fetch(img.src);
        const blob = await response.blob();
        const reader = new FileReader();
        const base64Image = await new Promise((resolve) => {
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });

        const apiResponse = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                type: 'process_image',
                data: {
                    imageUrl: base64Image,
                    mode: selectedMode
                }
            }, response => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(response);
                }
            });
        });

        if (apiResponse && apiResponse.success) {
            updateOutput(apiResponse.data.prompt);
        } else {
            throw new Error('Failed to process image');
        }
    } catch (error) {
        showError('Error processing image');
    }
}

// Chrome runtime message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "toggleExtension") {
        isButtonVisible = !isButtonVisible;
        
        button.style.display = isButtonVisible ? 'block' : 'none';
        
        if (!isButtonVisible && solthronContainer.style.display === 'block') {
            solthronContainer.style.display = 'none';
            solthronContainer.style.pointerEvents = 'none';
        }
        
        sendResponse({success: true});
        return true;
    }
    
    if (request.action === "setAuthToken" && request.token) {
        BackendAuth.setAuthToken(request.token).then(() => {
            pageCredits = null;
            sendResponse({success: true});
        }).catch((error) => {
            console.error('Error setting auth token:', error);
            sendResponse({success: false});
        });
        return true;
    }
    
    return false;
});

// Auth token receiver for website login
window.addEventListener('message', async (event) => {
    if (event.origin !== 'https://solthron.com' && 
        event.origin !== 'https://www.solthron.com') {
        return;
    }
    
    if (event.data.type === 'SOLTHRON_AUTH_SUCCESS' && event.data.token) {
        console.log('🔐 Received auth token from website');
        console.log('📍 Token source:', event.data.source);
        
        try {
            const success = await BackendAuth.setAuthToken(event.data.token);
            if (success) {
                console.log('✅ Auth token stored successfully');
                pageCredits = null;
                
                const profileView = shadowRoot.getElementById('profile-view');
                if (profileView && profileView.style.display !== 'none') {
                    console.log('🔄 Profile view is open, should refresh');
                }
                
            } else {
                console.error('❌ Failed to store auth token');
            }
        } catch (error) {
            console.error('💥 Auth token storage error:', error);
        }
    }
});

// Export for external access
window.solthronAuth = BackendAuth;

// Debug functions
window.solthronDebug = {
    checkAuth: async function() {
        const hasToken = await BackendAuth.getAuthToken();
        const isLoggedIn = await BackendAuth.isLoggedIn();
        const credits = await BackendAuth.getUserCredits();
        
        console.log('🔍 Auth Debug Info:');
        console.log('Has Token:', !!hasToken);
        console.log('Is Logged In:', isLoggedIn);
        console.log('Credits:', credits);
        
        return { hasToken: !!hasToken, isLoggedIn, credits };
    },
    
    clearAuth: async function() {
        await BackendAuth.logout();
        console.log('🧹 Auth cleared');
    }
};

// ✅ INITIALIZE THE EXTENSION
console.log('🚀 Solthron Extension loaded with Magic Pill + Auto Smart Actions');
createUI();
initializeProfileHandlers();

// Check for platform changes and re-initialize both systems
// Initialize Magic Pill, Auto Smart Actions, File Analysis, and Code Analysis
setTimeout(() => {
    const platform = detectAIPlatform();
    if (platform !== 'unknown') {
        console.log('🎯 Initializing Magic Pill...');
        initializeMagicPill();
        
        console.log('📄 Initializing File Analysis (PDF, Excel & Images)...');
        initializeFileAnalysis();
        
        console.log('💻 Initializing Code Analysis...');
        initializeCodeAnalysis();
    }
}, 2000);

// Check for platform changes and re-initialize all systems
setInterval(() => {
    const platform = detectAIPlatform();
    if (platform !== 'unknown') {
        if (autoModeEnabled && !currentInputField) {
            console.log('🔄 Rechecking Magic Pill...');
            initializeMagicPill();
        }
        if (fileAnalysisEnabled) {
            console.log('🔄 File Analysis monitoring active (PDF, Excel & Images)...');
        }
        if (codeAnalysisEnabled) {
            console.log('🔄 Code Analysis monitoring active...');
        }
    }
}, 5000); // Reduced frequency to 5 seconds
